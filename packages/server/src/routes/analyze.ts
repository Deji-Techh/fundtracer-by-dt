// ============================================================
// Analyze Routes - Wallet & Contract Analysis Endpoints
// All requests use server-side API keys (never exposed to client)
// ============================================================

import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
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
import { validateAddressInput, sanitizeString, validateArrayLength, SOLANA_ADDRESS_REGEX } from '../utils/validation.js';
import { getAlchemyKeyPool } from '../utils/quicknode.js';
import { cacheGet, cacheSet } from '../utils/redis.js';

// Constants for validation - defined once at module level for performance
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const SOL_ADDR_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Chain configuration - support both frontend IDs and canonical names
const ALLOWED_CHAINS = [
    'ethereum', 'eth',
    'linea',
    'arbitrum', 'arb',
    'base',
    'optimism', 'opt',
    'polygon', 'polygon_pos', 'matic',
    'bsc', 'binance',
    'solana', 'sol'
];

// Map frontend chain IDs to canonical names
const normalizeChainId = (chain: string): string => {
    const mapping: Record<string, string> = {
        'eth': 'ethereum',
        'arb': 'arbitrum',
        'opt': 'optimism',
        'polygon_pos': 'polygon',
        'matic': 'polygon',
        'binance': 'bsc',
        'sol': 'solana',
    };
    return mapping[chain.toLowerCase()] || chain.toLowerCase();
};

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

    // Use comprehensive validation
    const validation = validateAddressInput(address, chain);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
    }

    // Additional validation for options if provided
    if (options) {
        if (options.limit !== undefined) {
            const limit = Number(options.limit);
            if (isNaN(limit) || limit < 1 || limit > 1000) {
                return res.status(400).json({ error: 'Invalid limit parameter (1-1000)' });
            }
        }
        if (options.addresses && !validateArrayLength(options.addresses, 100)) {
            return res.status(400).json({ error: 'Too many addresses (max 100)' });
        }
    }

    // Normalize chain to lowercase for validation
    const normalizedChain = normalizeChainId(chain);

    // Validate chain parameter
    if (!ALLOWED_CHAINS.includes(normalizedChain)) {
        return res.status(400).json({ error: `Invalid chain: ${chain}. Allowed: ${ALLOWED_CHAINS.join(', ')}` });
    }

    // Validate address based on chain type
    const isSolana = normalizedChain === 'solana';
    if (isSolana ? !SOL_ADDR_REGEX.test(address) : !ETH_ADDRESS_REGEX.test(address)) {
        return res.status(400).json({ error: `Invalid ${isSolana ? 'Solana' : 'EVM'} address format` });
    }

    // SOLANA WALLET ANALYZE - Use SolanaAdapter directly
    if (isSolana) {
        try {
            const { SolanaAdapter } = await import('@fundtracer/core');
            const solanaAdapter = new SolanaAdapter();

            const [walletInfo, transactions] = await Promise.all([
                solanaAdapter.getWalletInfo(address),
                solanaAdapter.getTransactions(address, { limit: 100 })
            ]);

            // Build analysis result - match AnalysisResult interface exactly
            const uniqueContracts = new Set<string>();
            transactions.forEach(tx => {
                tx.programInteractions?.forEach(p => uniqueContracts.add(p));
            });
            const firstTx = transactions[transactions.length - 1];
            const lastTx = transactions[0];

            const result = {
                wallet: {
                    ...walletInfo,
                    chain: 'solana' as any,  // Add required chain property
                },
                transactions: transactions.map(tx => ({
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to || null,
                    value: tx.value,
                    timestamp: tx.timestamp,
                    fee: tx.fee,
                    status: tx.status,
                    blockNumber: null,
                    tokenTransfers: tx.tokenTransfers || [],
                    programInteractions: tx.programInteractions || [],
                })),
                fundingSources: { nodes: [], edges: [] } as any,
                fundingDestinations: { nodes: [], edges: [] } as any,
                suspiciousIndicators: [],
                overallRiskScore: 0,
                riskLevel: 'low' as const,
                projectsInteracted: [],
                sameBlockTransactions: [],
                summary: {
                    totalTransactions: transactions.length,
                    successfulTxs: transactions.filter(t => t.status === 'success').length,
                    failedTxs: transactions.filter(t => t.status === 'failed').length,
                    totalValueSentEth: 0,
                    totalValueReceivedEth: parseFloat(walletInfo.balance || '0') || 0,
                    uniqueInteractedAddresses: uniqueContracts.size,
                    topFundingSources: [],
                    topFundingDestinations: [],
                    activityPeriodDays: 0,
                    averageTxPerDay: 0,
                }
            };

            return res.json({
                success: true,
                result,
                usageRemaining: res.locals.usageRemaining,
            });
        } catch (error: any) {
            console.error('[Solana Analyze] Error:', error);
            return res.status(500).json({
                error: 'Solana analysis failed',
                message: error.message
            });
        }
    }

    try {
        // Load the full 20-key pool for parallel requests
        const alchemyKeyPool = getAlchemyKeyPool();
        const defaultKey = isSolana ? '' : await getAlchemyKeyForUser(req.user.uid);
        
        // Build SybilAlchemyConfig for parallel key usage
        const sybilConfig = !isSolana && alchemyKeyPool.length > 0 ? {
            defaultKey: defaultKey || alchemyKeyPool[0],
            contractKeys: alchemyKeyPool.slice(0, Math.min(10, alchemyKeyPool.length)),
            walletKeys: alchemyKeyPool.slice(Math.min(10, alchemyKeyPool.length), Math.min(20, alchemyKeyPool.length)),
            moralisKey: process.env.MORALIS_API_KEY,
        } : undefined;

        const analyzer = new WalletAnalyzer({
            alchemy: defaultKey || alchemyKeyPool[0] || '',
            sybilConfig: sybilConfig,
            moralis: process.env.MORALIS_API_KEY,
            etherscan: process.env.ETHERSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            lineascan: process.env.LINEASCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            arbiscan: process.env.ARBISCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            basescan: process.env.BASESCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            optimism: process.env.OPTIMISM_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            polygonscan: process.env.POLYGONSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        });

        // Pagination params
        const limit = Math.min(options?.limit || 10000, 10000); // Max 10000 per request
        const offset = options?.offset || 0;

        console.log(`[DEBUG] Starting wallet analysis with 20-key pool (${alchemyKeyPool.length} keys) for ${address}...`);
        const result = await withTimeout(
            analyzer.analyze(address, normalizedChain as ChainId, { ...options, transactionLimit: 10000, skipFundingTree: true }),
            120000, // Increased to 120s to handle large tx lists
            'Wallet analysis'
        );

        // Paginate transactions - return up to 10000
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

        // Cache transactions for funding tree reuse (5 min TTL)
        const cacheKey = `analyze:tx:${address.toLowerCase()}:${normalizedChain}`;
        await cacheSet(cacheKey, {
            transactions: result.transactions,
            timestamp: Date.now(),
        }, 300).catch(err => console.error('[Cache] Failed to cache transactions:', err));
        console.log(`[Cache] Cached ${result.transactions.length} transactions for funding tree`);

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

    // Normalize chain to lowercase
    const normalizedChain = normalizeChainId(chain);

    // Validate chain parameter
    if (!ALLOWED_CHAINS.includes(normalizedChain)) {
        return res.status(400).json({ error: `Invalid chain: ${chain}. Allowed: ${ALLOWED_CHAINS.join(', ')}` });
    }

    // Validate address based on chain type
    const isSolana = normalizedChain === 'solana';
    if (isSolana ? !SOL_ADDR_REGEX.test(address) : !ETH_ADDRESS_REGEX.test(address)) {
        return res.status(400).json({ error: `Invalid ${isSolana ? 'Solana' : 'EVM'} address format` });
    }

    // SOLANA FUNDING TREE
    if (isSolana) {
        try {
            const { SolanaAdapter } = await import('@fundtracer/core');
            const solanaAdapter = new SolanaAdapter();

            // Get transactions to find funders/destinations
            const transactions = await solanaAdapter.getTransactions(address, { limit: 100 });
            
            // Find unique source and destination addresses
            const sources = new Set<string>();
            const destinations = new Set<string>();
            transactions.forEach(tx => {
                if (tx.from && tx.from !== address) sources.add(tx.from);
                if (tx.to && tx.to !== address) destinations.add(tx.to);
            });

            // Build tree structure
            const fundingSources = {
                nodes: Array.from(sources).slice(0, 20).map((addr, i) => ({
                    address: addr,
                    depth: 1,
                    direction: 'source' as const,
                    totalValue: '0',
                    totalValueInEth: 0,
                    txCount: transactions.filter(t => t.from === addr).length,
                    labels: [],
                })),
                edges: []
            };
            const fundingDestinations = {
                nodes: Array.from(destinations).slice(0, 20).map((addr, i) => ({
                    address: addr,
                    depth: 1,
                    direction: 'destination' as const,
                    totalValue: '0',
                    totalValueInEth: 0,
                    txCount: transactions.filter(t => t.to === addr).length,
                    labels: [],
                })),
                edges: []
            };

            return res.json({
                success: true,
                result: { fundingSources, fundingDestinations },
                usageRemaining: res.locals.usageRemaining,
            });
        } catch (error: any) {
            console.error('[Solana Funding Tree] Error:', error);
            return res.status(500).json({ error: 'Solana funding tree failed', message: error.message });
        }
    }

    try {
        // Load the full 20-key pool for parallel requests
        const alchemyKeyPool = getAlchemyKeyPool();
        const defaultKey = isSolana ? '' : await getAlchemyKeyForUser(req.user.uid);
        
        // Build SybilAlchemyConfig for parallel key usage
        const sybilConfig = !isSolana && alchemyKeyPool.length > 0 ? {
            defaultKey: defaultKey || alchemyKeyPool[0],
            contractKeys: alchemyKeyPool.slice(0, Math.min(10, alchemyKeyPool.length)),
            walletKeys: alchemyKeyPool.slice(Math.min(10, alchemyKeyPool.length), Math.min(20, alchemyKeyPool.length)),
            moralisKey: process.env.MORALIS_API_KEY,
        } : undefined;

        const analyzer = new WalletAnalyzer({
            alchemy: defaultKey || alchemyKeyPool[0] || '',
            sybilConfig: sybilConfig,
            moralis: process.env.MORALIS_API_KEY,
            etherscan: process.env.ETHERSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            lineascan: process.env.LINEASCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            arbiscan: process.env.ARBISCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            basescan: process.env.BASESCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            optimism: process.env.OPTIMISM_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            polygonscan: process.env.POLYGONSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        });

        console.log(`[DEBUG] Building funding tree for ${address} on ${chain}...`);

        // Try to get cached transactions from recent wallet analysis
        const cacheKey = `analyze:tx:${address.toLowerCase()}:${normalizedChain}`;
        const cachedData = await cacheGet<{ transactions: any[]; timestamp: number }>(cacheKey);
        let cachedTxs = undefined;
        
        // Use cache if available and less than 5 minutes old
        if (cachedData && Date.now() - cachedData.timestamp < 300000) {
            console.log(`[FundingTree] Using cached transactions (${cachedData.transactions.length} txs)`);
            cachedTxs = cachedData.transactions;
        } else {
            console.log(`[FundingTree] No cache found, fetching fresh transactions...`);
        }

        const result = await withTimeout(
            analyzer.buildFundingTree(address, chain as ChainId, {
                treeConfig: options?.treeConfig,
                cachedTransactions: cachedTxs,
            }),
            120000, // Increased to 120s timeout - with key pool this should be fast
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

    // Validate array length
    if (!validateArrayLength(addresses, 20)) {
        return res.status(400).json({ error: 'Too many addresses (max 20)' });
    }

    // Normalize chain to lowercase
    const normalizedChain = chain?.toLowerCase();

    // Validate chain parameter FIRST (needed for address validation)
    if (!normalizedChain || !ALLOWED_CHAINS.includes(normalizedChain)) {
        return res.status(400).json({ error: `Invalid chain: ${chain}. Allowed: ${ALLOWED_CHAINS.join(', ')}` });
    }

    // Validate all addresses based on chain type
    const isSolana = normalizedChain === 'solana';
    for (const addr of addresses) {
        const valid = isSolana ? SOL_ADDR_REGEX.test(addr) : ETH_ADDRESS_REGEX.test(addr);
        if (!valid) {
            return res.status(400).json({ error: `Invalid ${isSolana ? 'Solana' : 'EVM'} address format` });
        }
    }

    // SOLANA COMPARE - Use SolanaAdapter directly
    if (isSolana) {
        try {
            const { SolanaAdapter } = await import('@fundtracer/core');
            const solanaAdapter = new SolanaAdapter();

            // Fetch wallet info and transactions for each address in parallel
            const walletData = await Promise.all(
                addresses.map(async (addr) => {
                    const [walletInfo, transactions] = await Promise.all([
                        solanaAdapter.getWalletInfo(addr),
                        solanaAdapter.getTransactions(addr, { limit: 100 })
                    ]);
                    return { address: addr, walletInfo, transactions };
                })
            );

            // Find common transactions
            const allTxHashes = walletData.map(w => new Set(w.transactions.map(t => t.hash)));
            const firstSet = Array.from(allTxHashes[0]);
            const commonTxHashes = firstSet.filter(hash => 
                allTxHashes.every(set => set.has(hash))
            );

            // Find common programs interacted with
            const allPrograms = walletData.map(w => {
                const programs = new Set<string>();
                w.transactions.forEach(tx => {
                    tx.programInteractions?.forEach(p => programs.add(p));
                });
                return programs;
            });
            const firstProgs = Array.from(allPrograms[0]);
            const commonPrograms = firstProgs.filter(prog => 
                allPrograms.every(set => set.has(prog))
            );

            // Calculate basic correlation (transaction overlap)
            const avgTxCount = walletData.reduce((sum, w) => sum + w.transactions.length, 0) / addresses.length;
            const correlationScore = commonTxHashes.length > 0 
                ? Math.round((commonTxHashes.length / avgTxCount) * 100) 
                : 0;

            // Check for direct transfers between wallets
            const addressSet = new Set(addresses);
            const directTransfers: any[] = [];
            walletData.forEach(w => {
                w.transactions.forEach(tx => {
                    if (tx.to && addressSet.has(tx.to)) {
                        directTransfers.push({
                            from: w.address,
                            to: tx.to,
                            hash: tx.hash,
                            amount: tx.value,
                            timestamp: tx.timestamp
                        });
                    }
                });
            });

            return res.json({
                success: true,
                result: {
                    wallets: walletData.map(w => {
                        const wtxs = w.transactions;
                        const uniqueContracts = new Set<string>();
                        wtxs.forEach(tx => tx.programInteractions?.forEach(p => uniqueContracts.add(p)));
                        const firstTx = wtxs[wtxs.length - 1];
                        const lastTx = wtxs[0];
                        return {
                            wallet: {
                                ...w.walletInfo,
                                chain: 'solana' as any,
                            },
                            transactions: wtxs.map(tx => ({
                                hash: tx.hash,
                                from: tx.from,
                                to: tx.to || null,
                                value: tx.value,
                                timestamp: tx.timestamp,
                                fee: tx.fee,
                                status: tx.status,
                                blockNumber: null,
                                tokenTransfers: tx.tokenTransfers || [],
                                programInteractions: tx.programInteractions || [],
                            })),
                            fundingSources: { nodes: [], edges: [] } as any,
                            fundingDestinations: { nodes: [], edges: [] } as any,
                            suspiciousIndicators: [],
                            overallRiskScore: 0,
                            riskLevel: 'low' as const,
                            projectsInteracted: [],
                            sameBlockTransactions: [],
                            summary: {
                                totalTransactions: wtxs.length,
                                successfulTxs: wtxs.filter(t => t.status === 'success').length,
                                failedTxs: wtxs.filter(t => t.status === 'failed').length,
                                totalValueSentEth: 0,
                                totalValueReceivedEth: parseFloat(w.walletInfo.balance || '0') || 0,
                                uniqueInteractedAddresses: uniqueContracts.size,
                                topFundingSources: [],
                                topFundingDestinations: [],
                                activityPeriodDays: 0,
                                averageTxPerDay: 0,
                            }
                        };
                    }),
                    commonFundingSources: [],
                    commonDestinations: [],
                    sharedProjects: commonPrograms.map(prog => ({
                        contractAddress: prog,
                        projectName: 'Solana Program',
                        category: 'unknown' as const,
                        interactionCount: 0,
                        totalValueInEth: 0,
                        firstInteraction: 0,
                        lastInteraction: 0,
                    })),
                    directTransfers: directTransfers.map(dt => ({
                        hash: dt.hash,
                        from: dt.from,
                        to: dt.to,
                        value: dt.amount,
                        timestamp: dt.timestamp,
                        fee: '',
                        status: 'success',
                        blockNumber: null,
                        chain: { type: 'solana', id: 'mainnet-beta' },
                        tokenTransfers: [],
                    })),
                    correlationScore,
                    isSybilLikely: correlationScore > 60,
                },
                usageRemaining: res.locals.usageRemaining,
            });
        } catch (error: any) {
            console.error('[Solana Compare] Error:', error);
            return res.status(500).json({
                error: 'Solana compare failed',
                message: error.message
            });
        }
    }

    try {
        // Load Alchemy keys
        const alchemyKeyPool = getAlchemyKeyPool();
        const defaultKey = isSolana ? '' : await getAlchemyKeyForUser(req.user.uid);

        // For compare, use simple single key (sybilConfig was causing React crash)
        const analyzer = new WalletAnalyzer({
            alchemy: defaultKey || alchemyKeyPool[0] || '',
            moralis: process.env.MORALIS_API_KEY,
            etherscan: process.env.ETHERSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            lineascan: process.env.LINEASCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            arbiscan: process.env.ARBISCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            basescan: process.env.BASESCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            optimism: process.env.OPTIMISM_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
            polygonscan: process.env.POLYGONSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        });

        console.log(`[Compare] Comparing ${addresses.length} wallets...`);

        const rawResult = await analyzer.compareWallets(addresses, chain as ChainId, options);

        // Sanitize result to remove any non-serializable objects
        const result = JSON.parse(JSON.stringify(rawResult));

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

    // Normalize chain to lowercase
    const normalizedChain = normalizeChainId(chain);

    // Validate chain parameter
    if (!ALLOWED_CHAINS.includes(normalizedChain)) {
        return res.status(400).json({ error: `Invalid chain: ${chain}. Allowed: ${ALLOWED_CHAINS.join(', ')}` });
    }

    // Validate address based on chain type
    const isSolana = normalizedChain === 'solana';
    if (isSolana ? !SOL_ADDR_REGEX.test(contractAddress) : !ETH_ADDRESS_REGEX.test(contractAddress)) {
        return res.status(400).json({ error: `Invalid ${isSolana ? 'Solana' : 'EVM'} contract address format` });
    }

    try {
        // Load the full 20-key pool for parallel requests
        const alchemyKeyPool = getAlchemyKeyPool();
        const defaultKey = isSolana ? '' : await getAlchemyKeyForUser(req.user.uid);
        
        // Build SybilAlchemyConfig for parallel key usage
        const sybilConfig = !isSolana && alchemyKeyPool.length > 0 ? {
            defaultKey: defaultKey || alchemyKeyPool[0],
            contractKeys: alchemyKeyPool.slice(0, Math.min(10, alchemyKeyPool.length)),
            walletKeys: alchemyKeyPool.slice(Math.min(10, alchemyKeyPool.length), Math.min(20, alchemyKeyPool.length)),
            moralisKey: process.env.MORALIS_API_KEY,
        } : undefined;

        const analyzer = new WalletAnalyzer({
            alchemy: defaultKey || alchemyKeyPool[0] || '',
            sybilConfig: sybilConfig,
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

    // Normalize chain to lowercase
    const normalizedChain = normalizeChainId(chain);

    // Validate chain parameter
    if (!ALLOWED_CHAINS.includes(normalizedChain)) {
        return res.status(400).json({ error: `Invalid chain: ${chain}. Allowed: ${ALLOWED_CHAINS.join(', ')}` });
    }

    // Validate address based on chain type
    const isSolana = normalizedChain === 'solana';
    if (isSolana ? !SOL_ADDR_REGEX.test(contractAddress) : !ETH_ADDRESS_REGEX.test(contractAddress)) {
        return res.status(400).json({ error: `Invalid ${isSolana ? 'Solana' : 'EVM'} contract address format` });
    }

    try {
        // Load the full 20-key pool for parallel sybil detection
        const alchemyKeyPool = getAlchemyKeyPool();
        const defaultKey = await getAlchemyKeyForUser(req.user.uid);
        const moralisKey = process.env.MORALIS_API_KEY || '';
        const covalentKey = process.env.COVALENT_API_KEY || '';

        // For Solana, sybil detection isn't supported via Alchemy - return empty result
        if (isSolana) {
            return res.json({ success: true, result: { clusters: [], message: 'Sybil detection not yet supported for Solana' } });
        }

        if (!defaultKey && alchemyKeyPool.length === 0) {
            return res.status(400).json({ error: 'Alchemy API key required for sybil detection' });
        }

        // Build SybilAlchemyConfig for parallel key usage
        const sybilConfig = {
            defaultKey: defaultKey || alchemyKeyPool[0],
            contractKeys: alchemyKeyPool.slice(0, Math.min(10, alchemyKeyPool.length)),
            walletKeys: alchemyKeyPool.slice(Math.min(10, alchemyKeyPool.length), Math.min(20, alchemyKeyPool.length)),
            moralisKey: moralisKey,
        };

        const analyzer = new SybilAnalyzer(chain as ChainId, sybilConfig);

        console.log(`[Sybil] Analyzing contract with ${alchemyKeyPool.length} keys...`);
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
 * POST /batch
 * Analyze multiple wallet addresses in batch
 * Returns summary info for each address
 */
router.post('/batch', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { addresses, chain, options } = req.body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
        return res.status(400).json({ error: 'Addresses array is required' });
    }

    if (addresses.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 addresses per batch' });
    }

    const normalizedChain = (chain as string)?.toLowerCase() || 'linea';
    if (!ALLOWED_CHAINS.includes(normalizedChain)) {
        return res.status(400).json({ error: `Invalid chain: ${chain}` });
    }

    // Validate addresses based on chain type
    const isSolana = normalizedChain === 'solana';
    const validAddresses = addresses.filter((addr: string) => 
        isSolana ? SOL_ADDR_REGEX.test(addr) : ETH_ADDRESS_REGEX.test(addr)
    );
    if (validAddresses.length === 0) {
        return res.status(400).json({ error: `No valid ${isSolana ? 'Solana' : 'EVM'} addresses provided` });
    }

    try {
        // Load the full 20-key pool for parallel requests
        const alchemyKeyPool = getAlchemyKeyPool();
        const defaultKey = isSolana ? '' : await getAlchemyKeyForUser(req.user.uid);
        
        // Build SybilAlchemyConfig for parallel key usage
        const sybilConfig = !isSolana && alchemyKeyPool.length > 0 ? {
            defaultKey: defaultKey || alchemyKeyPool[0],
            contractKeys: alchemyKeyPool.slice(0, Math.min(10, alchemyKeyPool.length)),
            walletKeys: alchemyKeyPool.slice(Math.min(10, alchemyKeyPool.length), Math.min(20, alchemyKeyPool.length)),
            moralisKey: process.env.MORALIS_API_KEY,
        } : undefined;

        const analyzer = new WalletAnalyzer({
            alchemy: defaultKey || alchemyKeyPool[0] || '',
            sybilConfig: sybilConfig,
        });

        console.log(`[Batch] Analyzing ${validAddresses.length} addresses with ${alchemyKeyPool.length} keys...`);

        const results = await Promise.allSettled(
            validAddresses.map(addr =>
                analyzer.analyze(addr, normalizedChain as ChainId, {
                    transactionLimit: 100,
                    skipFundingTree: true,
                })
            )
        );

        const batchResults = results.map((result, i) => {
            if (result.status === 'fulfilled') {
                const r = result.value as any;
                return {
                    address: validAddresses[i],
                    analyzed: true,
                    totalReceived: r.summary?.totalValueReceivedEth,
                    totalSent: r.summary?.totalValueSentEth,
                    transactionCount: r.summary?.totalTransactions,
                    uniqueAddresses: r.summary?.uniqueInteractedAddresses,
                    activityDays: r.summary?.activityPeriodDays,
                    riskScore: r.overallRiskScore,
                    riskLevel: r.riskLevel,
                };
            } else {
                return {
                    address: validAddresses[i],
                    analyzed: false,
                    error: result.reason?.message || 'Analysis failed',
                };
            }
        });

        const analyzed = batchResults.filter((r: any) => r.analyzed).length;

        res.json({
            success: true,
            result: batchResults,
            meta: {
                total: validAddresses.length,
                analyzed,
                failed: validAddresses.length - analyzed,
            },
            usageRemaining: res.locals.usageRemaining,
        });
    } catch (error: any) {
        console.error('[Batch] Error:', error.message);
        res.status(500).json({ error: 'Batch analysis failed', message: error.message });
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

    // Normalize chain to lowercase
    const normalizedChain = chain?.toLowerCase() || 'ethereum';

    // Validate chain parameter
    if (!ALLOWED_CHAINS.includes(normalizedChain)) {
        return res.status(400).json({ error: `Invalid chain: ${chain}. Allowed: ${ALLOWED_CHAINS.join(', ')}` });
    }

    // Validate addresses based on chain type
    const isSolana = normalizedChain === 'solana';
    const validAddresses = addresses.filter((addr: string) => 
        isSolana ? SOL_ADDR_REGEX.test(addr) : ETH_ADDRESS_REGEX.test(addr)
    );

    if (validAddresses.length === 0) {
        return res.status(400).json({ error: `No valid ${isSolana ? 'Solana' : 'EVM'} addresses provided` });
    }

    try {
        console.log('[DEBUG] Using original SybilAnalyzer for direct address analysis...');
        
        // Load the full 20-key pool for parallel sybil detection
        const alchemyKeyPool = getAlchemyKeyPool();
        const defaultKey = await getAlchemyKeyForUser(req.user.uid);
        const moralisKey = process.env.MORALIS_API_KEY || '';
        const covalentKey = process.env.COVALENT_API_KEY || '';

        if (!defaultKey && alchemyKeyPool.length === 0) {
            return res.status(400).json({ error: 'Alchemy API key required for sybil detection' });
        }

        // Build SybilAlchemyConfig for parallel key usage
        const sybilConfig = {
            defaultKey: defaultKey || alchemyKeyPool[0],
            contractKeys: alchemyKeyPool.slice(0, Math.min(10, alchemyKeyPool.length)),
            walletKeys: alchemyKeyPool.slice(Math.min(10, alchemyKeyPool.length), Math.min(20, alchemyKeyPool.length)),
            moralisKey: moralisKey,
        };

        // Use SybilAnalyzer with key pool for parallel analysis
        const analyzer = new SybilAnalyzer(chain as ChainId, sybilConfig);

        console.log(`[Sybil] Analyzing ${validAddresses.length} addresses with ${alchemyKeyPool.length} keys...`);
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
