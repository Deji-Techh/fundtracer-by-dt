// ============================================================
// Analyze Routes - Wallet & Contract Analysis Endpoints
// All requests use server-side API keys (never exposed to client)
// ============================================================

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getFirestore } from '../firebase.js';
import {
    WalletAnalyzer,
    SybilAnalyzer,
    ChainId,
    FilterOptions
} from '@fundtracer/core';
import { DuneService } from '../services/DuneService.js';
import contractService from '../services/ContractService.js';
import { trackAnalysis } from '../utils/analytics.js';

// Constants for validation - defined once at module level for performance
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const ALLOWED_CHAINS = ['ethereum', 'linea', 'arbitrum', 'base', 'optimism', 'polygon', 'bsc'];

// Helper to parse API errors into user-friendly messages
function getUserFriendlyError(error: any): { status: number; error: string; message: string; hint?: string } {
    const msg = error.message || '';

    // Timeout errors
    if (msg.includes('timed out')) {
        return {
            status: 504,
            error: 'Analysis timed out',
            message: 'The analysis took too long to complete.',
            hint: 'Try again or reduce the scope (fewer interactors, simpler wallet).'
        };
    }

    // Etherscan NOTOK / API errors
    if (msg.includes('API Error') || msg.includes('NOTOK')) {
        // Extract chain name if present (format: [ChainName] API Error ...)
        const chainMatch = msg.match(/\[(\w+)\]/);
        const chainName = chainMatch ? chainMatch[1] : 'this chain';

        if (msg.includes('No records found') || msg.includes('No transactions found')) {
            return {
                status: 404,
                error: 'No data found',
                message: `No transaction data found for this address on ${chainName}.`,
                hint: 'Verify the address is correct and has activity on the selected chain.'
            };
        }

        if (msg.includes('Invalid API Key') || msg.includes('Invalid API key')) {
            return {
                status: 503,
                error: 'API configuration error',
                message: `The block explorer API key for ${chainName} is invalid or missing.`,
                hint: 'Please contact support or try a different chain.'
            };
        }

        return {
            status: 502,
            error: 'Block explorer error',
            message: `The block explorer API returned an error for ${chainName}. This chain may have limited API support.`,
            hint: 'Try Linea or Ethereum which have the best API coverage.'
        };
    }

    // Rate limit
    if (msg.includes('Max calls per sec') || msg.includes('rate limit')) {
        return {
            status: 429,
            error: 'Rate limited',
            message: 'Too many requests. Please wait a moment and try again.',
            hint: 'The API rate limit was exceeded. Wait 10-30 seconds before retrying.'
        };
    }

    // Network errors
    if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('Network Error')) {
        return {
            status: 503,
            error: 'Service unavailable',
            message: 'Could not connect to the blockchain data provider.',
            hint: 'Check your internet connection or try again in a few moments.'
        };
    }

    // Default
    return {
        status: 500,
        error: 'Analysis failed',
        message: msg || 'An unexpected error occurred during analysis.',
    };
}

const router = Router();

// In-memory TTL cache for Alchemy API keys (avoids hitting Firestore on every request)
const alchemyKeyCache = new Map<string, { key: string; expiresAt: number }>();
const ALCHEMY_KEY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Helper to enrich analysis results: label contracts + rebuild projectsInteracted in a single pass
function enrichAnalysisResult(result: any): any {
    if (!result) return result;

    if (result.transactions) {
        const projectMap = new Map<string, any>();

        // Single pass: label each transaction AND collect project interaction data
        result.transactions = result.transactions.map((tx: any) => {
            const toInfo = tx.to ? contractService.getContract(tx.to) : null;
            const fromInfo = tx.from ? contractService.getContract(tx.from) : null;

            // Queue lookup if unknown and appears to be a contract interaction
            if (tx.to && !toInfo && ETH_ADDRESS_REGEX.test(tx.to)) {
                const isContractInteraction = [
                    'contract_call', 'token_transfer', 'dex_swap',
                    'bridge', 'lending', 'staking', 'nft_transfer'
                ].includes(tx.category);
                if (isContractInteraction) {
                    contractService.queueLookup(tx.to);
                }
            }

            // Build projectsInteracted data in the same loop
            if (tx.to) {
                const addr = tx.to.toLowerCase();
                const contractInfo = toInfo || contractService.getContract(addr);

                if (contractInfo || tx.category === 'contract_call' || tx.category === 'token_transfer' || tx.category === 'dex_swap') {
                    if (!projectMap.has(addr)) {
                        projectMap.set(addr, {
                            contractAddress: addr,
                            projectName: contractInfo?.name || null,
                            category: contractInfo?.type === 'token' ? 'token' : (contractInfo ? 'defi' : 'unknown'),
                            interactionCount: 0,
                            totalValueInEth: 0,
                            firstInteraction: tx.timestamp,
                            lastInteraction: tx.timestamp
                        });
                    }

                    const p = projectMap.get(addr);
                    p.interactionCount++;
                    p.totalValueInEth += parseFloat(tx.valueInEth || 0);
                    p.lastInteraction = Math.max(p.lastInteraction, tx.timestamp);
                    p.firstInteraction = Math.min(p.firstInteraction, tx.timestamp);
                }
            }

            return {
                ...tx,
                toLabel: toInfo ? (toInfo.symbol ? `${toInfo.name} (${toInfo.symbol})` : toInfo.name) : null,
                fromLabel: fromInfo ? (fromInfo.symbol ? `${fromInfo.name} (${fromInfo.symbol})` : fromInfo.name) : null,
                toType: toInfo?.type || null,
                fromType: fromInfo?.type || null,
            };
        });

        result.projectsInteracted = Array.from(projectMap.values())
            .sort((a: any, b: any) => b.interactionCount - a.interactionCount);
    }

    // Label funding sources
    if (result.fundingSources?.firstFunder) {
        const funderInfo = contractService.getContract(result.fundingSources.firstFunder);
        result.fundingSources.firstFunderLabel = funderInfo?.name || null;
    }

    return result;
}

// Get Alchemy API key for a user (cached with 5-minute TTL)
async function getAlchemyKeyForUser(userId: string): Promise<string> {
    // Check cache first
    const cached = alchemyKeyCache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.key;
    }

    try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        // Use user's custom Alchemy key or fallback to default
        const key = userData?.alchemyApiKey || process.env.DEFAULT_ALCHEMY_API_KEY || '';

        // Store in cache
        alchemyKeyCache.set(userId, {
            key,
            expiresAt: Date.now() + ALCHEMY_KEY_CACHE_TTL_MS,
        });

        return key;
    } catch (error) {
        console.error('Error fetching Alchemy API key:', error);
    }

    // Fall back to default key
    return process.env.DEFAULT_ALCHEMY_API_KEY || '';
}

// Timeout helper - wrap async operations with a timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs / 1000}s`)), timeoutMs)
        )
    ]);
}

// Helper to validate Free Tier transaction
import { JsonRpcProvider } from 'ethers';

const TARGET_WALLET = '0x4436977aCe641EdfE5A83b0d974Bd48443a448fd';
// Use Linea RPC for validation if the payment is on Linea. 
// However, the prompt says "send gas", normally implies the chain they are analyzing?
// Actually, "Free Tier users must transact... to a target wallet". Usually this means on the chain they are using, OR a specific payment chain. 
// Given "Linea Exponent", let's assume Linea Mainnet for payments/gas.
// But `checkFreeTierTx` in App.tsx uses `window.ethereum` which might be on ANY chain.
// To keep it simple, we verify on LINEA. Frontend should ensure network is Linea.
const LINEA_RPC = 'https://rpc.linea.build';

async function validateFreeTierTx(txHash: string, userAddress: string): Promise<boolean> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const provider = new JsonRpcProvider(LINEA_RPC);
            const tx = await provider.getTransaction(txHash);

            if (!tx) {
                console.log(`[Validation] Tx ${txHash} not found (attempt ${attempt + 1}/${maxRetries})`);
                attempt++;
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            if (tx.from.toLowerCase() !== userAddress.toLowerCase()) {
                console.warn(`[Validation] Mismatch Sender: ${tx.from} !== ${userAddress}`);
                return false;
            }
            if (tx.to?.toLowerCase() !== TARGET_WALLET.toLowerCase()) {
                console.warn(`[Validation] Mismatch Target: ${tx.to} !== ${TARGET_WALLET}`);
                return false;
            }

            return true;
        } catch (e) {
            console.error('Tx Validation Error:', e);
            attempt++;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return false;
}

// Analyze a single wallet
router.post('/wallet', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Free Tier Enforcement - Gas payment temporarily disabled
    // const tier = res.locals.tier || 'free'; // Passed from authMiddleware
    // if (tier === 'free') {
    //     const txHash = req.body.txHash || req.body.options?.txHash;
    //     if (!txHash) {
    //         return res.status(402).json({ error: 'Free Tier requires a gas payment transaction hash.' });
    //     }
    //
    //     const isValid = await validateFreeTierTx(txHash, req.user.uid);
    //     if (!isValid) {
    //         return res.status(402).json({ error: 'Invalid payment transaction. Must be on Linea Mainnet sent to target wallet.' });
    //     }
    // }

    const { address, chain, options } = req.body;

    if (!address || !chain) {
        return res.status(400).json({ error: 'Address and chain are required' });
    }

    // Validate chain parameter
    const ALLOWED_CHAINS = ['ethereum', 'linea', 'arbitrum', 'base', 'optimism', 'polygon', 'bsc'];
    if (!ALLOWED_CHAINS.includes(chain)) {
        return res.status(400).json({ error: 'Invalid chain parameter' });
    }

    // ... existing logic
    if (!ETH_ADDRESS_REGEX.test(address)) {
        return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Validate chain parameter
    if (!ALLOWED_CHAINS.includes(chain)) {
        return res.status(400).json({ error: 'Invalid chain parameter' });
    }

    try {
        const alchemyKey = await getAlchemyKeyForUser(req.user.uid);

        const analyzer = new WalletAnalyzer({
            alchemy: alchemyKey,
            moralis: process.env.MORALIS_API_KEY,
            etherscan: process.env.ETHERSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            lineascan: process.env.LINEASCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            arbiscan: process.env.ARBISCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            basescan: process.env.BASESCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            optimism: process.env.OPTIMISM_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            polygonscan: process.env.POLYGONSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        });

        // Pagination params
        const limit = Math.min(options?.limit || 100, 500); // Max 500 per request
        const offset = options?.offset || 0;

        console.log(`[DEBUG] Starting wallet analysis (limit=${limit}, offset=${offset}) with 90s timeout...`);
        const result = await withTimeout(
            analyzer.analyze(address, chain as ChainId, { ...options, transactionLimit: 100, skipFundingTree: true }),
            90000, // Increased to 90s, fetch limited to 100 txs initially
            'Wallet analysis'
        );

        // Paginate transactions
        const totalTransactions = result.transactions.length;
        const paginatedTransactions = result.transactions.slice(offset, offset + limit);
        const hasMore = offset + limit < totalTransactions;

        res.json({
            success: true,
            result: {
                ...enrichAnalysisResult({
                    ...result,
                    transactions: paginatedTransactions,
                }),
                pagination: {
                    offset,
                    limit,
                    total: totalTransactions,
                    hasMore,
                    returned: paginatedTransactions.length,
                },
            },
            usageRemaining: res.locals.usageRemaining,
        });

        // Track analytics (async, don't await to avoid slowing response)
        trackAnalysis({
            userId: req.user?.uid,
            userEmail: req.user?.email,
            chain,
            feature: 'wallet',
            timestamp: Date.now(),
        }).catch(err => console.error('Failed to track analytics:', err));
    } catch (error: any) {
        console.error('Wallet analysis error:', error.message);
        const errInfo = getUserFriendlyError(error);
        res.status(errInfo.status).json(errInfo);
    }
});

// Build funding tree separately (on-demand, called when user clicks "Generate Funding Tree")
router.post('/funding-tree', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { address, chain, options } = req.body;

    if (!address || !chain) {
        return res.status(400).json({ error: 'Address and chain are required' });
    }

    if (!ETH_ADDRESS_REGEX.test(address)) {
        return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Validate chain parameter
    if (!ALLOWED_CHAINS.includes(chain)) {
        return res.status(400).json({ error: 'Invalid chain parameter' });
    }

    try {
        const alchemyKey = await getAlchemyKeyForUser(req.user.uid);

        const analyzer = new WalletAnalyzer({
            alchemy: alchemyKey,
            moralis: process.env.MORALIS_API_KEY,
            etherscan: process.env.ETHERSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            lineascan: process.env.LINEASCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            arbiscan: process.env.ARBISCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            basescan: process.env.BASESCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            optimism: process.env.OPTIMISM_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            polygonscan: process.env.POLYGONSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        });

        console.log(`[DEBUG] Building funding tree for ${address} on ${chain}...`);
        const result = await withTimeout(
            analyzer.buildFundingTree(address, chain as ChainId, {
                treeConfig: options?.treeConfig,
            }),
            30000, // 30s timeout for tree building alone
            'Funding tree'
        );

        res.json({
            success: true,
            result,
        });
    } catch (error: any) {
        console.error('Funding tree error:', error.message);
        const errInfo = getUserFriendlyError(error);
        res.status(errInfo.status).json({
            ...errInfo,
            hint: errInfo.hint || (error.message.includes('timed out')
                ? 'The wallet has too many transactions. The tree may take longer for active wallets.'
                : undefined)
        });
    }
});

// Compare multiple wallets
router.post('/compare', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Free Tier Enforcement - Gas payment temporarily disabled
    // const tier = res.locals.tier || 'free';
    // if (tier === 'free') {
    //     const txHash = req.body.txHash || req.body.options?.txHash;
    //     if (!txHash) {
    //         return res.status(402).json({ error: 'Free Tier requires a gas payment transaction hash.' });
    //     }
    //
    //     const isValid = await validateFreeTierTx(txHash, req.user.uid);
    //     if (!isValid) {
    //         return res.status(402).json({ error: 'Invalid payment transaction. Must be on Linea Mainnet sent to target wallet.' });
    //     }
    // }

    const { addresses, chain, options } = req.body;

    if (!addresses || !Array.isArray(addresses) || addresses.length < 2) {
        return res.status(400).json({ error: 'At least 2 addresses are required' });
    }

    // Validate all addresses
    for (const addr of addresses) {
        if (!ETH_ADDRESS_REGEX.test(addr)) {
            return res.status(400).json({ error: `Invalid address format: ${addr}` });
        }
    }

    // Validate chain parameter
    if (!ALLOWED_CHAINS.includes(chain)) {
        return res.status(400).json({ error: 'Invalid chain parameter' });
    }

    try {
        const alchemyKey = await getAlchemyKeyForUser(req.user.uid);

        const analyzer = new WalletAnalyzer({
            alchemy: alchemyKey,
            moralis: process.env.MORALIS_API_KEY,
            etherscan: process.env.ETHERSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            lineascan: process.env.LINEASCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            arbiscan: process.env.ARBISCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            basescan: process.env.BASESCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            optimism: process.env.OPTIMISM_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            polygonscan: process.env.POLYGONSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        });

        const result = await analyzer.compareWallets(addresses, chain as ChainId, options);

        res.json({
            success: true,
            result,
            usageRemaining: res.locals.usageRemaining,
        });

        // Track analytics
        trackAnalysis({
            userId: req.user?.uid,
            userEmail: req.user?.email,
            chain,
            feature: 'compare',
            timestamp: Date.now(),
        }).catch(err => console.error('Failed to track analytics:', err));
    } catch (error: any) {
        console.error('Comparison error:', error);
        const errInfo = getUserFriendlyError(error);
        res.status(errInfo.status).json(errInfo);
    }
});

// Analyze contract interactors
router.post('/contract', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Free Tier Enforcement - Gas payment temporarily disabled
    // const tier = res.locals.tier || 'free';
    // if (tier === 'free') {
    //     const txHash = req.body.txHash || req.body.options?.txHash;
    //     if (!txHash) {
    //         return res.status(402).json({ error: 'Free Tier requires a gas payment transaction hash.' });
    //     }
    //
    //     const isValid = await validateFreeTierTx(txHash, req.user.uid);
    //     if (!isValid) {
    //         return res.status(402).json({ error: 'Invalid payment transaction. Must be on Linea Mainnet sent to target wallet.' });
    //     }
    // }

    const { contractAddress, chain, options } = req.body;

    if (!contractAddress || !chain) {
        return res.status(400).json({ error: 'Contract address and chain are required' });
    }

    if (!ETH_ADDRESS_REGEX.test(contractAddress)) {
        return res.status(400).json({ error: 'Invalid contract address format' });
    }

    // Validate chain parameter
    if (!ALLOWED_CHAINS.includes(chain)) {
        return res.status(400).json({ error: 'Invalid chain parameter' });
    }

    try {
        const alchemyKey = await getAlchemyKeyForUser(req.user.uid);

        const analyzer = new WalletAnalyzer({
            alchemy: alchemyKey,
            moralis: process.env.MORALIS_API_KEY,
            etherscan: process.env.ETHERSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            lineascan: process.env.LINEASCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            arbiscan: process.env.ARBISCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            basescan: process.env.BASESCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            optimism: process.env.OPTIMISM_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            polygonscan: process.env.POLYGONSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        });

        // Try to fetch interactors from Dune first if configured
        let externalInteractors: string[] = [];
        const duneKey = process.env.DUNE_API_KEY;

        if (duneKey) {
            try {
                console.log('[DEBUG] Attempting to fetch interactors from Dune...');
                const duneService = new DuneService(duneKey);
                externalInteractors = await duneService.getContractInteractors(
                    chain as string,
                    contractAddress
                );
                console.log(`[DEBUG] Dune returned ${externalInteractors.length} interactors`);
            } catch (duneError) {
                console.error('[DEBUG] Dune fetch failed, falling back to RPC:', duneError);
                // Fallback to empty array -> RPC
            }
        }

        console.log('[DEBUG] Starting contract analysis with 180s timeout...');
        const result = await withTimeout(
            analyzer.analyzeContract(contractAddress, chain as ChainId, {
                maxInteractors: options?.maxInteractors || 100,
                analyzeFunding: options?.analyzeFunding !== false,
                externalInteractors: externalInteractors.length > 0 ? externalInteractors : undefined
            }),
            180000, // 180 second timeout for complete contract analysis
            'Contract analysis'
        );

        console.log('[DEBUG] Contract analysis complete, sending response');
        res.json({
            success: true,
            result: enrichAnalysisResult(result),
            usageRemaining: res.locals.usageRemaining,
        });

        // Track analytics
        trackAnalysis({
            userId: req.user?.uid,
            userEmail: req.user?.email,
            chain,
            feature: 'contract',
            timestamp: Date.now(),
        }).catch(err => console.error('Failed to track analytics:', err));
    } catch (error: any) {
        console.error('Contract analysis error:', error.message);
        const errInfo = getUserFriendlyError(error);
        res.status(errInfo.status).json({
            ...errInfo,
            hint: errInfo.hint || (error.message.includes('timed out')
                ? 'The contract has too many interactions. Try limiting maxInteractors.'
                : undefined)
        });
    }
});

// Sybil Detection - Find wallets with common funding sources
router.post('/sybil', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const { contractAddress, chain = 'ethereum', options } = req.body;

    if (!contractAddress) {
        return res.status(400).json({ error: 'Contract address is required' });
    }

    if (!ETH_ADDRESS_REGEX.test(contractAddress)) {
        return res.status(400).json({ error: 'Invalid contract address format' });
    }

    // Validate chain parameter
    if (!ALLOWED_CHAINS.includes(chain)) {
        return res.status(400).json({ error: 'Invalid chain parameter' });
    }

    try {
        const alchemyKey = await getAlchemyKeyForUser(req.user.uid);
        const moralisKey = process.env.MORALIS_API_KEY || '';
        const covalentKey = process.env.COVALENT_API_KEY || '';

        if (!alchemyKey) {
            return res.status(400).json({ error: 'Alchemy API key required for sybil detection' });
        }

        const analyzer = new SybilAnalyzer(chain as ChainId, alchemyKey, moralisKey, covalentKey);

        console.log('[DEBUG] Starting sybil analysis with 300s timeout...');
        const result = await withTimeout(
            analyzer.analyzeContract(contractAddress, {
                maxInteractors: options?.maxInteractors || 500,
                minClusterSize: options?.minClusterSize || 3,
            }),
            600000, // 10 minute timeout for sybil analysis
            'Sybil analysis'
        );

        console.log('[DEBUG] Sybil analysis complete, sending response');
        res.json({
            success: true,
            result,
            usageRemaining: res.locals.usageRemaining,
        });

        // Track analytics
        trackAnalysis({
            userId: req.user?.uid,
            userEmail: req.user?.email,
            chain,
            feature: 'sybil',
            timestamp: Date.now(),
        }).catch(err => console.error('Failed to track analytics:', err));
    } catch (error: any) {
        console.error('Sybil analysis error:', error.message);
        const errInfo = getUserFriendlyError(error);
        res.status(errInfo.status).json({
            ...errInfo,
            hint: errInfo.hint || (error.message.includes('timed out')
                ? 'The contract has too many interactors. Try reducing maxInteractors.'
                : undefined)
        });
    }
});

/**
 * POST /sybil-addresses
 * Analyze a list of addresses directly (e.g., pasted from Dune)
 * Skips the slow "find interactors" step
 */
router.post('/sybil-addresses', async (req: AuthenticatedRequest, res: Response) => {
    console.log('[DEBUG] /sybil-addresses endpoint hit');

    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { addresses, chain, options } = req.body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
        return res.status(400).json({ error: 'Addresses array is required' });
    }

    if (addresses.length > 10000) {
        return res.status(400).json({ error: 'Maximum 10000 addresses allowed' });
    }

    // Validate addresses
    const validAddresses = addresses.filter((addr: string) => ETH_ADDRESS_REGEX.test(addr));

    if (validAddresses.length === 0) {
        return res.status(400).json({ error: 'No valid addresses provided' });
    }

    // Validate chain parameter
    if (!ALLOWED_CHAINS.includes(chain)) {
        return res.status(400).json({ error: 'Invalid chain parameter' });
    }

    try {
        console.log('[DEBUG] Using original SybilAnalyzer for direct address analysis...');
        
        // Get Alchemy key for user
        const alchemyKey = await getAlchemyKeyForUser(req.user.uid);
        const moralisKey = process.env.MORALIS_API_KEY || '';
        const covalentKey = process.env.COVALENT_API_KEY || '';

        if (!alchemyKey) {
            return res.status(400).json({ error: 'Alchemy API key required for sybil detection' });
        }

        // Use original SybilAnalyzer (proven to work)
        const analyzer = new SybilAnalyzer(chain as ChainId, alchemyKey, moralisKey, covalentKey);

        console.log(`[DEBUG] Starting sybil analysis on ${validAddresses.length} addresses...`);
        const startTime = Date.now();
        
        const result = await withTimeout(
            analyzer.analyzeAddresses(validAddresses, {
                minClusterSize: options?.minClusterSize || 3,
            }),
            600000, // 10 minute timeout
            'Sybil analysis'
        );
        
        const duration = (Date.now() - startTime) / 1000;
        console.log(`[DEBUG] Sybil analysis complete in ${duration}s`);
        console.log(`[DEBUG] Clusters found: ${result.clusters?.length || 0}`);
        console.log(`[DEBUG] Total interactors: ${result.totalInteractors}`);
        console.log(`[DEBUG] Flagged clusters: ${result.flaggedClusters?.length || 0}`);
        
        res.json({
            success: true,
            result,
            meta: {
                duration: `${duration}s`,
                walletsAnalyzed: validAddresses.length,
            },
            usageRemaining: res.locals.usageRemaining,
        });
    } catch (error: any) {
        console.error('Sybil address analysis error:', error.message);
        res.status(500).json({
            error: 'Sybil analysis failed',
            message: error.message,
        });
    }
});

export { router as analyzeRoutes };
