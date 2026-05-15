// ============================================================
// Analyze Routes - Wallet & Contract Analysis Endpoints
// All requests use server-side API keys (never exposed to client)
// ============================================================

import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { getFirestore } from '../firebase.js';
import {
    WalletAnalyzer,
    SybilAnalyzer,
    AlchemyProvider,
    ChainId,
    FilterOptions
} from '@fundtracer/core';
import { DuneService } from '../services/DuneService.js';
import contractService from '../services/ContractService.js';
import { trackAnalysis } from '../utils/analytics.js';
import { validateAddressInput, sanitizeString, validateArrayLength, SOLANA_ADDRESS_REGEX } from '../utils/validation.js';
import { getAlchemyKeyPool } from '../utils/quicknode.js';
import { cacheGet, cacheSet } from '../utils/redis.js';
import { torqueServiceV2 } from '../services/TorqueServiceV2.js';
import { BridgeDetector } from '../services/BridgeDetector.js';
import { RedisBlockTsCache } from '../services/BlockTsCache.js';

// Singleton block timestamp cache — no TTL, permanent
const blockTsCache = new RedisBlockTsCache();

// In-memory task store for SSE timestamp streaming
const timestampTasks = new Map<string, { address: string; chain: string; userId: string }>();

// Deep sanitize function to prevent React Error #130 (objects not valid as React child)
function sanitizeForFrontend(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeForFrontend);
    if (obj instanceof Error) return { message: obj.message, name: obj.name };
    if (obj instanceof Map) return Object.fromEntries(obj);
    if (obj instanceof Set) return Array.from(obj);
    if (typeof obj === 'object') {
        const clean: any = {};
        for (const [key, value] of Object.entries(obj)) {
            clean[key] = sanitizeForFrontend(value);
        }
        return clean;
    }
    return String(obj);
}

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

    // SOLANA WALLET ANALYZE - Full analysis using SolanaAdapter
    if (isSolana) {
        try {
            const { SolanaAdapter } = await import('@fundtracer/core');
            const solanaAdapter = new SolanaAdapter();

            // Run all adapter methods in parallel — utilises 3 Helius keys
            const [walletInfo, transactions, riskScore, fundingTree] = await Promise.all([
                solanaAdapter.getWalletInfo(address),
                solanaAdapter.getTransactions(address, { limit: 100 }),
                solanaAdapter.getRiskScore(address),
                solanaAdapter.getFundingSources(address, 3).catch(() => null),
            ]);

            // ---- Compute interactors and totals from transactions ----
            const interactors = new Map<string, { count: number; sent: number; received: number }>();
            let totalValueSent = 0;
            let totalValueReceived = 0;

            for (const tx of transactions) {
                const val = parseFloat(tx.value || '0');
                if (tx.from === address) totalValueSent += val;
                if (tx.to === address) totalValueReceived += val;

                if (tx.from && tx.from !== address) {
                    const e = interactors.get(tx.from) || { count: 0, sent: 0, received: 0 };
                    e.count++; e.received += val;
                    interactors.set(tx.from, e);
                }
                if (tx.to && tx.to !== address) {
                    const e = interactors.get(tx.to) || { count: 0, sent: 0, received: 0 };
                    e.count++; e.sent += val;
                    interactors.set(tx.to, e);
                }
            }

            // ---- Activity period ----
            const sorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
            const firstTs = sorted[0]?.timestamp;
            const lastTs = sorted[sorted.length - 1]?.timestamp;
            const activityDays = firstTs && lastTs
                ? Math.round((lastTs - firstTs) / 86400000)
                : 0;

            // ---- Map risk signals to SuspiciousIndicator ----
            const suspiciousIndicators = (riskScore.signals || [])
                .filter(s => s.detected)
                .map(s => ({
                    type: s.id as any,
                    severity: s.severity,
                    description: s.details,
                    evidence: [s.details],
                    score: s.weight,
                }));

            const riskLevel = riskScore.score > 70 ? 'high' as const
                : riskScore.score > 30 ? 'medium' as const
                : riskScore.score > 0 ? 'low' as const
                : 'low' as const;

            // ---- Build funding sources from adapter tree ----
            const ftree = fundingTree;
            const fundingSources = {
                nodes: (ftree?.nodes || []).slice(0, 20).map(n => ({
                    address: n.address,
                    depth: n.depth,
                    direction: 'source' as const,
                    totalValue: (n.amount || 0).toString(),
                    totalValueInEth: n.amount || 0,
                    txCount: 1,
                    labels: n.label ? [n.label] : [],
                })),
                edges: ftree?.edges || [],
            };

            // Destinations built from outgoing tx data (adapter is source-only)
            const destMap = new Map<string, { total: number; count: number }>();
            for (const tx of transactions) {
                if (tx.from === address && tx.to && tx.to !== address) {
                    const e = destMap.get(tx.to) || { total: 0, count: 0 };
                    e.total += parseFloat(tx.value || '0');
                    e.count++;
                    destMap.set(tx.to, e);
                }
            }
            const fundingDestinations = {
                nodes: Array.from(destMap.entries()).slice(0, 20).map(([addr, data]) => ({
                    address: addr,
                    depth: 1,
                    direction: 'destination' as const,
                    totalValue: data.total.toString(),
                    totalValueInEth: data.total,
                    txCount: data.count,
                    labels: [],
                })),
                edges: [],
            };

            // ---- Aggregate program interactions into projects ----
            const projectMap = new Map<string, { count: number; first: number; last: number }>();
            for (const tx of transactions) {
                for (const programId of tx.programInteractions || []) {
                    const e = projectMap.get(programId) || { count: 0, first: Infinity, last: 0 };
                    e.count++;
                    e.first = Math.min(e.first, tx.timestamp);
                    e.last = Math.max(e.last, tx.timestamp);
                    projectMap.set(programId, e);
                }
            }

            // Known Solana programs for readable names
            const SOLANA_PROGRAM_NAMES: Record<string, string> = {
                'JUPyiwrYJFskUPiHa7hkeR8VUtAeJQpzG8NYK4QJbKdA': 'Jupiter DEX',
                '675kPX9MHTjS2zt1ASj6D5UQJLwL5NXG8W6Jm8J6BGQ': 'Raydium AMM',
                'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYNLxGkNqfN5f': 'Orca DEX',
                'worm2ZoG2kUd4vFXhvjh93UUH596ayR3Q3M1m7ss9Th': 'Wormhole Bridge',
                'Stake11111111111111111111111111111111111111': 'Solana Staking',
                'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELgVq7Wp8bH': 'Serum DEX',
                'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Z4QNUiRn': 'Magic Eden',
                'MEisE1Hzehtx1Q63Yohk3EkP2HtcNqGj1mCJkoJ3VgJ': 'Marginfi Lending',
                'KaminoAcMb899Ls9Gxgmnx5HmRYKkPSJLwMN2PHPTf7': 'Kamino Lending',
                'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH': 'Drift Perps',
            };

            const projectsInteracted = Array.from(projectMap.entries()).map(([program, data]) => ({
                contractAddress: program,
                projectName: SOLANA_PROGRAM_NAMES[program] || undefined,
                category: 'defi' as const,
                interactionCount: data.count,
                totalValueInEth: 0,
                firstInteraction: data.first,
                lastInteraction: data.last,
            }));

            // ---- Same-block transaction groups ----
            const blockGroups = new Map<number, typeof transactions>();
            for (const tx of transactions) {
                const key = tx.timestamp;
                const group = blockGroups.get(key) || [];
                group.push(tx);
                blockGroups.set(key, group);
            }
            const sameBlockTransactions = Array.from(blockGroups.entries())
                .filter(([_, txs]) => txs.length > 1)
                .map(([block, txs]) => ({
                    blockNumber: block,
                    timestamp: txs[0].timestamp,
                    transactions: txs.map(tx => ({
                        hash: tx.hash,
                        from: tx.from,
                        to: tx.to,
                        value: tx.value,
                        timestamp: tx.timestamp,
                        status: tx.status,
                        blockNumber: block,
                        valueInEth: parseFloat(tx.value || '0') || 0,
                        gasUsed: '0',
                        gasPrice: '0',
                        gasCostInEth: 0,
                        category: 'unknown' as const,
                        isIncoming: tx.to === address,
                        tokenTransfers: tx.tokenTransfers || [],
                    })),
                    isSuspicious: txs.length > 3,
                    reason: txs.length > 3 ? `High number of transactions (${txs.length}) in same block` : undefined,
                }));

            // ---- Top funders / destinations ----
            const topFundingSources = Array.from(interactors.entries())
                .sort((a, b) => b[1].received - a[1].received)
                .slice(0, 10)
                .map(([addr, data]) => ({ address: addr, valueEth: data.received }));

            const topFundingDestinations = Array.from(interactors.entries())
                .sort((a, b) => b[1].sent - a[1].sent)
                .slice(0, 10)
                .map(([addr, data]) => ({ address: addr, valueEth: data.sent }));

            // ---- Assemble result ----
            const result = {
                wallet: {
                    address: walletInfo.address,
                    chain: 'solana' as any,
                    balance: walletInfo.balance || '0',
                    balanceInEth: parseFloat(walletInfo.balance || '0') || 0,
                    txCount: transactions.length,
                    firstTxTimestamp: firstTs || undefined,
                    lastTxTimestamp: lastTs || undefined,
                    isContract: false,
                },
                transactions: transactions.map(tx => ({
                    hash: tx.hash,
                    blockNumber: 0,
                    timestamp: tx.timestamp,
                    from: tx.from,
                    to: tx.to || null,
                    value: tx.value || '0',
                    valueInEth: parseFloat(tx.value || '0') || 0,
                    gasUsed: '0',
                    gasPrice: '0',
                    gasCostInEth: 0,
                    status: tx.status,
                    category: 'unknown' as const,
                    isIncoming: tx.to === address,
                    tokenTransfers: tx.tokenTransfers || [],
                })),
                fundingSources: fundingSources as any,
                fundingDestinations: fundingDestinations as any,
                suspiciousIndicators,
                overallRiskScore: riskScore.score,
                riskLevel,
                projectsInteracted,
                sameBlockTransactions,
                summary: {
                    totalTransactions: transactions.length,
                    successfulTxs: transactions.filter(t => t.status === 'success').length,
                    failedTxs: transactions.filter(t => t.status === 'failed').length,
                    totalValueSentEth: totalValueSent,
                    totalValueReceivedEth: totalValueReceived,
                    uniqueInteractedAddresses: interactors.size,
                    topFundingSources,
                    topFundingDestinations,
                    activityPeriodDays: activityDays,
                    averageTxPerDay: activityDays > 0
                        ? Math.round(transactions.length / activityDays)
                        : transactions.length,
                },
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
            blockTimestampCache: blockTsCache,
        });

        // Generate taskId for progressive timestamp streaming
        const taskId = crypto.randomUUID();
        timestampTasks.set(taskId, { address: address.toLowerCase(), chain: normalizedChain, userId: req.user.uid });

        // Pagination params
        const limit = Math.min(options?.limit || 10000, 10000); // Max 10000 per request
        const offset = options?.offset || 0;

        console.log(`[DEBUG] Starting wallet analysis with 20-key pool (${alchemyKeyPool.length} keys) for ${address}...`);
        const result = await withTimeout(
            analyzer.analyze(address, normalizedChain as ChainId, { ...options, transactionLimit: 10000, skipFundingTree: true, skipTimestamps: true }),
            120000, // Increased to 120s to handle large tx lists
            'Wallet analysis'
        );

        // Paginate transactions - return up to 10000
        const totalTransactions = result.transactions.length;
        const paginatedTransactions = result.transactions.slice(offset, offset + limit);
        const hasMore = offset + limit < totalTransactions;

        res.json({
            success: true,
            result: sanitizeForFrontend({
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
                taskId,
            }),
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

        // Record to Torque - award points and log activity
        const userName = req.user?.name || req.user?.email || 'User';
        await torqueServiceV2.incrementScan(req.user.uid, userName).catch(err => console.error('[TorqueV2] Scan increment failed:', err));
        await torqueServiceV2.addActivity(req.user.uid, userName, address, chain).catch(err => console.error('[TorqueV2] Activity failed:', err));
    } catch (error: any) {
        console.error('Wallet analysis error:', error.message);
        const errInfo = getUserFriendlyError(error);
        res.status(errInfo.status).json(errInfo);
    }
});

// ============================================================
// SSE Timestamp Streaming — progressive backfill for high-TX wallets
// ============================================================
router.get('/timestamps/:taskId', async (req: AuthenticatedRequest, res: Response) => {
    const { taskId } = req.params;
    const task = timestampTasks.get(taskId);

    if (!task) {
        return res.status(404).json({ error: 'Timestamp task not found or expired' });
    }

    // Fallback auth: accept token from query param (EventSource can't set headers)
    if (!req.user && req.query.token) {
        try {
            const decoded = jwt.verify(req.query.token as string, process.env.JWT_SECRET!) as any;
            if (decoded.uid) {
                req.user = { uid: decoded.uid, email: decoded.email, name: decoded.name, type: 'user' };
            }
        } catch {
            return res.status(401).json({ error: 'Invalid token' });
        }
    }

    if (!req.user || req.user.uid !== task.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { address, chain } = task;
    if (chain === 'solana') {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
    }

    // Read cached transactions from wallet analysis
    const cacheKey = `analyze:tx:${address}:${chain}`;
    const cached = await cacheGet<{ transactions: any[]; timestamp: number }>(cacheKey);
    if (!cached?.transactions?.length) {
        return res.status(404).json({ error: 'No cached transactions found. Run wallet analysis first.' });
    }

    // Collect unique block numbers where timestamp is 0 (not yet backfilled)
    const txMap = new Map<string, number>();
    for (const tx of cached.transactions) {
        if (tx.timestamp === 0 && tx.blockNumber > 0) {
            txMap.set(tx.hash, tx.blockNumber);
        }
    }
    if (txMap.size === 0) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
    }

    const txHashes: { hash: string; blockNumber: number }[] = Array.from(txMap.entries()).map(([hash, blockNumber]) => ({ hash, blockNumber }));
    const blockNumbers = [...new Set(txHashes.map(t => t.blockNumber))];

    // Get Alchemy keys
    const alchemyKeyPool = getAlchemyKeyPool();
    const defaultKey = await getAlchemyKeyForUser(task.userId);
    const allKeys = alchemyKeyPool.length > 0 ? alchemyKeyPool : (defaultKey ? [defaultKey] : []);
    if (allKeys.length === 0) {
        return res.status(503).json({ error: 'No Alchemy API keys available' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const ALCHEMY_URLS: Record<string, string> = {
        ethereum: 'https://eth-mainnet.g.alchemy.com/v2/',
        linea: 'https://linea-mainnet.g.alchemy.com/v2/',
        arbitrum: 'https://arb-mainnet.g.alchemy.com/v2/',
        base: 'https://base-mainnet.g.alchemy.com/v2/',
        optimism: 'https://opt-mainnet.g.alchemy.com/v2/',
        polygon: 'https://polygon-mainnet.g.alchemy.com/v2/',
    };
    const baseUrl = ALCHEMY_URLS[chain];
    if (!baseUrl) {
        res.write(`data: ${JSON.stringify({ error: `Unsupported chain: ${chain}` })}\n\n`);
        res.end();
        return;
    }

    const BATCH_SIZE = 20;
    let totalFetched = 0;
    let closed = false;

    const close = () => {
        if (closed) return;
        closed = true;
        res.end();
    };

    req.on('close', close);

    try {
        for (let i = 0; i < blockNumbers.length; i += BATCH_SIZE) {
            if (closed) break;

            const batch = blockNumbers.slice(i, i + BATCH_SIZE);
            const batchTimestamps: { blockNum: number; ts: number }[] = [];

            const promises = batch.map(async (blockNum, idx) => {
                try {
                    const cachedTs = await blockTsCache.get(chain, blockNum);
                    if (cachedTs !== null) {
                        batchTimestamps.push({ blockNum, ts: cachedTs });
                        return;
                    }

                    const key = allKeys[idx % allKeys.length];
                    const response = await fetch(`${baseUrl}${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            id: 1,
                            method: 'eth_getBlockByNumber',
                            params: [`0x${blockNum.toString(16)}`, false],
                        }),
                    });

                    if (!response.ok) return;
                    const data = await response.json();
                    if (data?.result?.timestamp) {
                        const ts = parseInt(data.result.timestamp, 16);
                        batchTimestamps.push({ blockNum, ts });
                    }
                } catch {
                    // Skip failed blocks
                }
            });

            await Promise.all(promises);

            // Store fetched timestamps in permanent cache
            if (batchTimestamps.length > 0) {
                await Promise.all(batchTimestamps.map(b => blockTsCache.set(chain, b.blockNum, b.ts)));
            }

            // Map block numbers back to tx hashes and emit
            const tsByBlock = new Map(batchTimestamps.map(b => [b.blockNum, b.ts]));
            const batchHashes: string[] = [];
            const batchTsList: number[] = [];

            for (const entry of txHashes) {
                if (tsByBlock.has(entry.blockNumber)) {
                    batchHashes.push(entry.hash);
                    batchTsList.push(tsByBlock.get(entry.blockNumber)!);
                }
            }

            if (batchHashes.length > 0) {
                totalFetched += batchHashes.length;
                res.write(`data: ${JSON.stringify({ hashes: batchHashes, timestamps: batchTsList })}\n\n`);
            }

            await new Promise(resolve => setTimeout(resolve, 10));
        }

        if (!closed) {
            res.write(`data: ${JSON.stringify({ done: true, totalFetched })}\n\n`);
            res.end();
        }
    } catch (error: any) {
        console.error('[SSE Timestamps] Error:', error.message);
        if (!closed) {
            res.write(`data: ${JSON.stringify({ error: 'An internal error occurred' })}\n\n`);
            res.end();
        }
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

            // Use SolanaAdapter's getFundingSources for proper BFS tree
            const [fundingTree, transactions] = await Promise.all([
                solanaAdapter.getFundingSources(address, 3).catch(() => null),
                solanaAdapter.getTransactions(address, { limit: 200 }),
            ]);

            // Build source nodes from tree
            const sourceNodes = (fundingTree?.nodes || []).slice(0, 30).map(n => ({
                address: n.address,
                depth: n.depth,
                direction: 'source' as const,
                totalValue: (n.amount || 0).toString(),
                totalValueInEth: n.amount || 0,
                txCount: 1,
                labels: n.label ? [n.label] : [],
            }));

            // Build destination nodes from transactions (outgoing)
            const destMap = new Map<string, { total: number; count: number }>();
            for (const tx of transactions) {
                if (tx.from === address && tx.to && tx.to !== address) {
                    const e = destMap.get(tx.to) || { total: 0, count: 0 };
                    e.total += parseFloat(tx.value || '0');
                    e.count++;
                    destMap.set(tx.to, e);
                }
            }
            const destNodes = Array.from(destMap.entries())
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 30)
                .map(([addr, data]) => ({
                    address: addr,
                    depth: 1,
                    direction: 'destination' as const,
                    totalValue: data.total.toString(),
                    totalValueInEth: data.total,
                    txCount: data.count,
                    labels: [],
                }));

            return res.json({
                success: true,
                result: {
                    fundingSources: { nodes: sourceNodes, edges: fundingTree?.edges || [] },
                    fundingDestinations: { nodes: destNodes, edges: [] },
                },
                usageRemaining: res.locals.usageRemaining,
            });
        } catch (error: any) {
            console.error('[Solana Funding Tree] Error:', error);
            return res.status(500).json({ error: 'Solana funding tree failed' });
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

            });
        }
    }

    try {
        // Load Alchemy keys
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

        console.log(`[Compare] Comparing ${addresses.length} wallets with ${alchemyKeyPool.length} keys...`);

        const rawResult = await analyzer.compareWallets(addresses, chain as ChainId, options);

        // Sanitize result to remove any non-serializable objects (prevents React Error #130)
        const result = sanitizeForFrontend(rawResult);

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

        // Record to Torque - award points for compare
        const userName = req.user?.name || req.user?.email || 'User';
        await torqueServiceV2.incrementScan(req.user.uid, userName).catch(err => console.error('[TorqueV2] Compare scan increment failed:', err));
        await torqueServiceV2.addActivity(req.user.uid, userName, `${addresses.length} wallets compared`, chain).catch(err => console.error('[TorqueV2] Activity failed:', err));
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
        let externalInteractorData: Array<{
            address: string;
            firstInteraction: number;
            lastInteraction: number;
            interactionCount: number;
            totalValueIn: number;
            totalValueOut: number;
        }> = [];

        const duneKey = process.env.DUNE_API_KEY;

        if (duneKey) {
            try {
                console.log('[DEBUG] Attempting to fetch interactors from Dune...');
                const duneService = new DuneService(duneKey);
                
                // Use the richer method that includes timestamps and values
                externalInteractorData = await duneService.getContractInteractorsWithData(
                    chain as string,
                    contractAddress
                );
                
                if (externalInteractorData.length > 0) {
                    console.log(`[DEBUG] Dune returned ${externalInteractorData.length} interactors with data`);
                    externalInteractors = externalInteractorData.map(d => d.address);
                } else {
                    console.log('[DEBUG] Dune returned empty, falling back to RPC');
                }
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
                externalInteractors: externalInteractors.length > 0 ? externalInteractors : undefined,
                externalInteractorData: externalInteractorData.length > 0 ? externalInteractorData : undefined
            }),
            180000, // 180 second timeout for complete contract analysis
            'Contract analysis'
        );

        console.log('[DEBUG] Contract analysis complete, sending response');
        res.json({
            success: true,
            result: sanitizeForFrontend(enrichAnalysisResult(result)),
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

        // Record to Torque - award points for contract analysis
        const userName = req.user?.name || req.user?.email || 'User';
        await torqueServiceV2.incrementScan(req.user.uid, userName).catch(err => console.error('[TorqueV2] Contract scan increment failed:', err));
        await torqueServiceV2.addActivity(req.user.uid, userName, contractAddress, chain).catch(err => console.error('[TorqueV2] Activity failed:', err));
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

        // Build SybilAlchemyConfig for parallel key usage - use ALL keys
        const sybilConfig = {
            defaultKey: defaultKey || alchemyKeyPool[0],
            contractKeys: alchemyKeyPool, // Use ALL keys for contract lookups
            walletKeys: alchemyKeyPool,   // Use ALL keys for wallet lookups (parallel)
            moralisKey: moralisKey,
            covalentKey: covalentKey,
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
            result: sanitizeForFrontend(result),
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

        // Record to Torque - award points for sybil detection
        const userName = req.user?.name || req.user?.email || 'User';
        await torqueServiceV2.incrementScan(req.user.uid, userName).catch(err => console.error('[TorqueV2] Sybil scan increment failed:', err));
        await torqueServiceV2.addActivity(req.user.uid, userName, `Sybil: ${contractAddress}`, chain).catch(err => console.error('[TorqueV2] Activity failed:', err));
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
            result: sanitizeForFrontend(batchResults),
            meta: {
                total: validAddresses.length,
                analyzed,
                failed: validAddresses.length - analyzed,
            },
            usageRemaining: res.locals.usageRemaining,
        });

        // Record to Torque - award points for batch analysis
        const userName = req.user?.name || req.user?.email || 'User';
        await torqueServiceV2.incrementScan(req.user.uid, userName).catch(err => console.error('[TorqueV2] Batch scan increment failed:', err));
        await torqueServiceV2.addActivity(req.user.uid, userName, `${analyzed} wallets batch analyzed`, chain).catch(err => console.error('[TorqueV2] Activity failed:', err));
    } catch (error: any) {
        console.error('[Batch] Error:', error.message);
        res.status(500).json({ error: 'Batch analysis failed' });
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

        // Build SybilAlchemyConfig for parallel key usage - use ALL keys
        const sybilConfig = {
            defaultKey: defaultKey || alchemyKeyPool[0],
            contractKeys: alchemyKeyPool, // Use ALL keys for contract lookups
            walletKeys: alchemyKeyPool,   // Use ALL keys for wallet lookups (parallel)
            moralisKey: moralisKey,
            covalentKey: process.env.COVALENT_API_KEY || '',
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
            result: sanitizeForFrontend(result),
            meta: {
                duration: `${duration}s`,
                walletsAnalyzed: validAddresses.length,
            },
            usageRemaining: res.locals.usageRemaining,
        });

        // Record to Torque - award points for sybil address analysis
        const userName = req.user?.name || req.user?.email || 'User';
        await torqueServiceV2.incrementScan(req.user.uid, userName).catch(err => console.error('[TorqueV2] Sybil address scan increment failed:', err));
        await torqueServiceV2.addActivity(req.user.uid, userName, `${validAddresses.length} addresses analyzed`, chain).catch(err => console.error('[TorqueV2] Activity failed:', err));
    } catch (error: any) {
        console.error('Sybil address analysis error:', error.message);
        res.status(500).json({
            error: 'Sybil analysis failed',
        });
    }
});

// ============================================================
// AI Investigation Report
// ============================================================
router.post('/report', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { address, chain } = req.body;

  if (!address || !chain) {
    return res.status(400).json({ error: 'Address and chain are required' });
  }

  const normalizedChain = normalizeChainId(chain);

  if (!ALLOWED_CHAINS.includes(normalizedChain)) {
    return res.status(400).json({ error: `Invalid chain: ${chain}` });
  }

  const isSolana = normalizedChain === 'solana';
  if (isSolana ? !SOL_ADDR_REGEX.test(address) : !ETH_ADDRESS_REGEX.test(address)) {
    return res.status(400).json({ error: `Invalid ${isSolana ? 'Solana' : 'EVM'} address format` });
  }

  try {
    const { EntityService } = await import('../services/EntityService.js');
    const { callGeminiStream, selectModel } = await import('../lib/gemini-client.js');

    // Fetch wallet analysis first (reuse existing analysis logic)
    const alchemyKeyPool = getAlchemyKeyPool();
    const userKey = await getAlchemyKeyForUser(req.user.uid);

    const sybilConfig = alchemyKeyPool.length > 0 ? {
      defaultKey: userKey || alchemyKeyPool[0],
      contractKeys: alchemyKeyPool.slice(0, Math.min(10, alchemyKeyPool.length)),
      walletKeys: alchemyKeyPool.slice(Math.min(10, alchemyKeyPool.length), Math.min(20, alchemyKeyPool.length)),
      moralisKey: process.env.MORALIS_API_KEY,
    } : undefined;

    const analyzer = new WalletAnalyzer({
      alchemy: userKey || alchemyKeyPool[0] || '',
      sybilConfig,
      moralis: process.env.MORALIS_API_KEY,
      etherscan: process.env.ETHERSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
      lineascan: process.env.LINEASCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
      arbiscan: process.env.ARBISCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
      basescan: process.env.BASESCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
      optimism: process.env.OPTIMISM_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
      polygonscan: process.env.POLYGONSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
    });

    console.log(`[Report] Using 20-key pool (${alchemyKeyPool.length} keys) for ${address}...`);
    const analysis = await withTimeout(
      analyzer.analyze(address, normalizedChain as ChainId, { skipFundingTree: true }),
      120000,
      'Wallet report analysis'
    ) as any;

    // Look up entity for this address
    const entity = EntityService.lookupEntity(normalizedChain, address);

    // Build entity map for counterparty labeling
    const counterpartyAddresses = new Set<string>();
    if (analysis.summary?.topFundingSources) {
      for (const s of analysis.summary.topFundingSources) counterpartyAddresses.add(s.address);
    }
    if (analysis.summary?.topFundingDestinations) {
      for (const d of analysis.summary.topFundingDestinations) counterpartyAddresses.add(d.address);
    }
    if (analysis.projectsInteracted) {
      for (const p of analysis.projectsInteracted) counterpartyAddresses.add(p.contractAddress);
    }
    const entityMap: Record<string, any> = {};
    for (const addr of counterpartyAddresses) {
      const ent = EntityService.lookupEntity(normalizedChain, addr);
      if (ent) {
        entityMap[addr.toLowerCase()] = {
          name: ent.name,
          category: ent.category,
          confidence: ent.confidence,
          verified: ent.verified,
        };
      }
    }

    // Build rich report context using the new context builder
    const { buildReportContext } = await import('../lib/context-builder.js');
    const reportPrompt = buildReportContext({
      address: analysis?.wallet?.address || address,
      chain: chain,
      balanceInEth: analysis.wallet?.balanceInEth,
      isContract: analysis.wallet?.isContract,
      riskScore: analysis.overallRiskScore || analysis.riskScore,
      riskLevel: analysis.riskLevel,
      summary: analysis.summary ? {
        totalTransactions: analysis.summary.totalTransactions,
        successfulTxs: analysis.summary.successfulTxs,
        failedTxs: analysis.summary.failedTxs,
        totalValueSentEth: analysis.summary.totalValueSentEth,
        totalValueReceivedEth: analysis.summary.totalValueReceivedEth,
        uniqueInteractedAddresses: analysis.summary.uniqueAddresses || analysis.summary.uniqueInteractedAddresses,
        activityPeriodDays: analysis.summary.activityPeriodDays,
        averageTxPerDay: analysis.summary.averageTxPerDay,
        topFundingSources: analysis.summary.topFundingSources?.map((s: any) => ({ address: s.address, valueEth: s.valueEth })),
        topFundingDestinations: analysis.summary.topFundingDestinations?.map((d: any) => ({ address: d.address, valueEth: d.valueEth })),
      } : undefined,
      transactions: analysis.transactions?.slice(-50).map((t: any) => ({
        hash: t.hash,
        timestamp: t.timestamp,
        from: t.from,
        to: t.to,
        valueInEth: t.valueInEth || 0,
        status: t.status,
        method: t.method,
      })),
      suspiciousIndicators: analysis.suspiciousIndicators?.map((ind: any) => ({
        type: ind.type,
        severity: ind.severity,
        score: ind.score,
        description: ind.description,
        evidence: ind.evidence,
      })),
      projectsInteracted: analysis.projectsInteracted?.map((p: any) => ({
        contractAddress: p.contractAddress,
        projectName: p.projectName,
        category: p.category,
        interactionCount: p.interactionCount,
        totalValueInEth: p.totalValueInEth,
      })),
      sameBlockTransactions: analysis.sameBlockTransactions?.map((g: any) => ({
        blockNumber: g.blockNumber,
        isSuspicious: g.isSuspicious,
        reason: g.reason,
      })),
      entity: entity ? {
        name: entity.name,
        category: entity.category,
        confidence: entity.confidence,
        verified: entity.verified,
        tags: entity.tags,
      } : undefined,
      entityMap: Object.keys(entityMap).length > 0 ? entityMap : undefined,
    });

    // Determine model based on wallet complexity
    const modelType = (analysis.summary?.totalTransactions || 0) > 500 ? 'pro' : 'flash';

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const reportInstruction = `Generate the investigation report based on the wallet analysis data above. Structure it with:

## Executive Summary
## Entity Profile
## Fund Flow Analysis
## Risk Assessment
## Transaction Patterns
## Suspicious Activity Indicators
## Conclusion & Recommendations

Be specific, cite exact values.`;

    const stream = callGeminiStream(reportPrompt, reportInstruction, [], modelType);

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();

    // Record to Torque
    const userName = req.user?.name || req.user?.email || 'User';
    await torqueServiceV2.incrementScan(req.user.uid, userName).catch(() => {});
  } catch (error: any) {
    console.error('[Report] Generation error:', error.message);
    // If headers already sent, try to end stream with error
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: 'An internal error occurred' })}\n\n`);
      res.end();
      return;
    }
    res.status(500).json({ error: 'Report generation failed' });
  }
});

// ============================================================
// Expand Graph Node
// ============================================================
router.post('/expand-node', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { address, chain, direction = 'both', depth = 2 } = req.body;

  if (!address || !chain) {
    return res.status(400).json({ error: 'Address and chain are required' });
  }

  const normalizedChain = normalizeChainId(chain);

  if (!ALLOWED_CHAINS.includes(normalizedChain)) {
    return res.status(400).json({ error: `Invalid chain: ${chain}` });
  }

  const isSolana = normalizedChain === 'solana';
  if (isSolana ? !SOL_ADDR_REGEX.test(address) : !ETH_ADDRESS_REGEX.test(address)) {
    return res.status(400).json({ error: `Invalid ${isSolana ? 'Solana' : 'EVM'} address format` });
  }

  try {
    let nodes: any[] = [];
    let edges: any[] = [];

    if (isSolana) {
      const { SolanaAdapter } = await import('@fundtracer/core');
      const solanaAdapter = new SolanaAdapter();
      const [fundingTree, transactions] = await Promise.all([
        solanaAdapter.getFundingSources(address, Math.min(depth, 3)).catch(() => null),
        solanaAdapter.getTransactions(address, { limit: 200 }),
      ]);

      // Source nodes
      for (const n of (fundingTree?.nodes || []).slice(0, 30)) {
        nodes.push({
          id: n.address,
          address: n.address,
          depth: n.depth,
          direction: 'source',
          totalValue: (n.amount || 0).toString(),
          totalValueInEth: n.amount || 0,
          txCount: 1,
        });
        if (n.parentAddress) {
          edges.push({
            source: n.parentAddress,
            target: n.address,
            value: n.amount || 0,
          });
        }
      }

      // Destination nodes from outgoing txs
      const destMap = new Map<string, { total: number; count: number }>();
      for (const tx of transactions) {
        if (tx.from === address && tx.to && tx.to !== address) {
          const d = destMap.get(tx.to) || { total: 0, count: 0 };
          d.total += parseFloat(tx.value || '0');
          d.count++;
          destMap.set(tx.to, d);
        }
      }
      for (const [addr, data] of Array.from(destMap.entries()).sort((a, b) => b[1].total - a[1].total).slice(0, 30)) {
        nodes.push({
          id: addr,
          address: addr,
          depth: 1,
          direction: 'destination',
          totalValue: data.total.toString(),
          totalValueInEth: data.total,
          txCount: data.count,
        });
        edges.push({ source: address, target: addr, value: data.total });
      }
    } else {
      const alchemyKeyPool = getAlchemyKeyPool();
      const userKey = await getAlchemyKeyForUser(req.user.uid);

      const sybilConfig = alchemyKeyPool.length > 0 ? {
        defaultKey: userKey || alchemyKeyPool[0],
        contractKeys: alchemyKeyPool.slice(0, Math.min(10, alchemyKeyPool.length)),
        walletKeys: alchemyKeyPool.slice(Math.min(10, alchemyKeyPool.length), Math.min(20, alchemyKeyPool.length)),
        moralisKey: process.env.MORALIS_API_KEY,
      } : undefined;

      const analyzer = new WalletAnalyzer({
        alchemy: userKey || alchemyKeyPool[0] || '',
        sybilConfig,
        moralis: process.env.MORALIS_API_KEY,
        etherscan: process.env.ETHERSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        lineascan: process.env.LINEASCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        arbiscan: process.env.ARBISCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        basescan: process.env.BASESCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        optimism: process.env.OPTIMISM_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        polygonscan: process.env.POLYGONSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
      });

      console.log(`[Expand-Node] Using 20-key pool (${alchemyKeyPool.length} keys) for ${address}...`);
      const treeResult = await withTimeout(
        analyzer.buildFundingTree(address, chain as ChainId, {}),
        120000,
        'Expand node'
      );

      // Flatten tree into nodes/edges
      // buildFundingTree returns { fundingSources: FundingNode, fundingDestinations: FundingNode }
      const nodeMap = new Map<string, any>();
      const edgeList: any[] = [];

      const flattenTree = (node: any, parentAddr?: string) => {
        if (!node || !node.address) return;
        if (!nodeMap.has(node.address)) {
          nodeMap.set(node.address, {
            id: node.address,
            address: node.address,
            depth: node.depth || 0,
            direction: node.direction || 'both',
            totalValue: node.totalValue || '0',
            totalValueInEth: node.totalValueInEth || 0,
            txCount: node.txCount || 0,
          });
        }
        if (parentAddr && parentAddr !== node.address) {
          edgeList.push({ source: parentAddr, target: node.address, value: node.totalValueInEth || 0 });
        }
        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            flattenTree(child, node.address);
          }
        }
      };

      if (treeResult?.fundingSources) flattenTree(treeResult.fundingSources);
      if (treeResult?.fundingDestinations) flattenTree(treeResult.fundingDestinations);

      // Mark the root wallet node separately (depth 0 from source tree)
      if (treeResult?.fundingSources?.address) {
        if (!nodeMap.has(treeResult.fundingSources.address)) {
          nodeMap.set(treeResult.fundingSources.address, {
            id: treeResult.fundingSources.address,
            address: treeResult.fundingSources.address,
            depth: 0,
            direction: 'both',
            totalValue: treeResult.fundingSources.totalValue || '0',
            totalValueInEth: treeResult.fundingSources.totalValueInEth || 0,
            txCount: treeResult.fundingSources.txCount || 0,
          });
        }
      }

      nodes = Array.from(nodeMap.values());
      edges = edgeList;
    }

    // Enhance nodes with entity labels
    try {
      const { EntityService } = await import('../services/EntityService.js');
      for (const node of nodes) {
        const entity = EntityService.lookupEntity(normalizedChain, node.address);
        if (entity) {
          node.name = entity.name;
          node.category = entity.category;
          node.verified = entity.verified;
          node.confidence = entity.confidence;
        }
      }
    } catch {}

    res.json({ success: true, result: { nodes, edges } });
  } catch (error: any) {
    console.error('[Expand Node] Error:', error.message);
    res.status(500).json({ error: 'Failed to expand node' });
  }
});

// ============================================================
// Cross-Chain Bridge Trace
// ============================================================
router.post('/bridge-trace', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { address, chain } = req.body;

  if (!address || !chain) {
    return res.status(400).json({ error: 'Address and chain are required' });
  }

  const normalizedChain = normalizeChainId(chain);

  if (!ALLOWED_CHAINS.includes(normalizedChain)) {
    return res.status(400).json({ error: `Invalid chain: ${chain}` });
  }

  const isSolana = normalizedChain === 'solana';
  if (isSolana ? !SOL_ADDR_REGEX.test(address) : !ETH_ADDRESS_REGEX.test(address)) {
    return res.status(400).json({ error: `Invalid ${isSolana ? 'Solana' : 'EVM'} address format` });
  }

  try {
    let transactions: any[] = [];

    if (isSolana) {
      const { SolanaAdapter } = await import('@fundtracer/core');
      const solanaAdapter = new SolanaAdapter();
      transactions = await solanaAdapter.getTransactions(address, { limit: 200 }).catch(() => []);
    } else {
      const alchemyKeyPool = getAlchemyKeyPool();
      const userKey = await getAlchemyKeyForUser(req.user.uid);

      const sybilConfig = alchemyKeyPool.length > 0 ? {
        defaultKey: userKey || alchemyKeyPool[0],
        contractKeys: alchemyKeyPool.slice(0, Math.min(10, alchemyKeyPool.length)),
        walletKeys: alchemyKeyPool.slice(Math.min(10, alchemyKeyPool.length), Math.min(20, alchemyKeyPool.length)),
        moralisKey: process.env.MORALIS_API_KEY,
      } : undefined;

      const analyzer = new WalletAnalyzer({
        alchemy: userKey || alchemyKeyPool[0] || '',
        sybilConfig,
        moralis: process.env.MORALIS_API_KEY,
        etherscan: process.env.ETHERSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        lineascan: process.env.LINEASCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        arbiscan: process.env.ARBISCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        basescan: process.env.BASESCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        optimism: process.env.OPTIMISM_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
        polygonscan: process.env.POLYGONSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
      });

      console.log(`[Bridge-Trace] Using 20-key pool (${alchemyKeyPool.length} keys) for ${address}...`);

      const analysis = await withTimeout(
        analyzer.analyze(address, normalizedChain as ChainId, { skipFundingTree: true }),
        120000,
        'Bridge trace analysis'
      ) as any;

      transactions = (analysis.transactions || []).slice(0, 200);
    }

    const bridgeEvents = BridgeDetector.detectBridgeTransactions(transactions, normalizedChain);

    res.json({
      sourceChain: normalizedChain,
      sourceAddress: address,
      bridgeEvents,
    });
  } catch (error: any) {
    console.error('[Bridge Trace] Error:', error.message);
    res.status(500).json({ error: 'Bridge trace failed' });
  }
});

export { router as analyzeRoutes };
