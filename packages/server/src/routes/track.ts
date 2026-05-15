/**
 * Track API Routes
 * Wallet tracking, watchlist, and smart money endpoints
 */

import { Router } from 'express';
import { getFirestore, admin } from '../firebase.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { GeckoTerminalService } from '../services/GeckoTerminalService.js';
import { cache } from '../utils/cache.js';
import { getSybilAlchemyKeys } from '../utils/alchemyKeys.js';

const router = Router();
const getDb = () => getFirestore();
const geckoTerminal = new GeckoTerminalService();

// Supported chains for smart money discovery
const SUPPORTED_CHAINS = ['ethereum', 'linea', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc'];

// Chain mapping to GeckoTerminal format
const CHAIN_TO_GECKO: Record<string, string> = {
    'ethereum': 'eth',
    'linea': 'linea',
    'polygon': 'polygon_pos',
    'arbitrum': 'arbitrum',
    'optimism': 'optimism',
    'base': 'base',
    'bsc': 'bsc'
};

interface TrackedWallet {
    address: string;
    addedAt: number;
    addedBy?: string;
    lastActivity?: number;
    totalTxs?: number;
}

interface ActivityItem {
    hash: string;
    from: string;
    to: string;
    value: number;
    token: string;
    chain: string;
    type: 'buy' | 'sell' | 'transfer' | 'bridge';
    timestamp: number;
    status: 'success' | 'failed';
}

// GET /api/track - Get all tracked wallets (global watchlist)
router.get('/', async (req, res) => {
    try {
        const watchlistRef = getDb().collection('watchlist');
        const snapshot = await watchlistRef.orderBy('addedAt', 'desc').limit(500).get();
        
        const wallets: TrackedWallet[] = snapshot.docs.map(doc => ({
            address: doc.id,
            ...doc.data()
        } as TrackedWallet));
        
        res.json({ success: true, wallets });
    } catch (error: any) {
        console.error('[Track API] Error fetching watchlist:', error);
        res.status(500).json({ error: 'An internal error occurred' });
    }
});

// POST /api/track - Add wallet to global watchlist
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { address, chain = 'ethereum' } = req.body;
        
        if (!address || !address.startsWith('0x')) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }

        const walletAddress = address.toLowerCase();
        const userId = (req as any).user?.uid || (req as any).user?.id;
        
        // Check if already exists
        const existingDoc = await getDb().collection('watchlist').doc(walletAddress).get();
        if (existingDoc.exists) {
            const existingData = existingDoc.data();
            const watchers = existingData?.watchers || [];
            if (userId && !watchers.includes(userId)) {
                await getDb().collection('watchlist').doc(walletAddress).update({
                    watchers: admin.firestore.FieldValue.arrayUnion(userId),
                    watchCount: admin.firestore.FieldValue.increment(1)
                });
            }
            return res.json({ success: true, message: 'Wallet already tracked', address: walletAddress });
        }

        await getDb().collection('watchlist').doc(walletAddress).set({
            address: walletAddress,
            addedAt: Date.now(),
            addedBy: userId || 'unknown',
            watchCount: 1,
            watchers: userId ? [userId] : [],
            chains: [chain],
            lastActivity: null,
            totalTxs: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, address: walletAddress });
    } catch (error: any) {
        console.error('[Track API] Error adding wallet:', error);
        res.status(500).json({ error: 'An internal error occurred' });
    }
});

// DELETE /api/track/:address - Remove wallet from watchlist
router.delete('/:address', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { address } = req.params;
        const userId = (req as any).user?.uid || (req as any).user?.id;
        const walletAddress = address.toLowerCase();
        
        const doc = await getDb().collection('watchlist').doc(walletAddress).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Wallet not found in watchlist' });
        }

        const data = doc.data();
        const watchers = data?.watchers || [];
        
        if (userId && watchers.includes(userId)) {
            const newWatchers = watchers.filter((w: string) => w !== userId);
            if (newWatchers.length === 0) {
                await getDb().collection('watchlist').doc(walletAddress).delete();
            } else {
                await getDb().collection('watchlist').doc(walletAddress).update({
                    watchers: newWatchers,
                    watchCount: admin.firestore.FieldValue.increment(-1)
                });
            }
        }

        res.json({ success: true, message: 'Wallet removed from watchlist' });
    } catch (error: any) {
        console.error('[Track API] Error removing wallet:', error);
        res.status(500).json({ error: 'An internal error occurred' });
    }
});

// GET /api/track/:address/activity - Get activity for tracked wallet
router.get('/track/:address/activity', async (req, res) => {
    try {
        const { address } = req.params;
        const { chain = 'ethereum', limit = '50' } = req.query;
        const walletAddress = address.toLowerCase();
        
        const { WalletAnalyzer } = await import('@fundtracer/core');
        const sybilConfig = getSybilAlchemyKeys();
        const analyzer = new WalletAnalyzer({
            alchemy: process.env.DEFAULT_ALCHEMY_API_KEY,
            sybilConfig: sybilConfig,
        });
        
        const result = await analyzer.analyze(
            walletAddress,
            chain as any,
            { transactionLimit: parseInt(limit as string) || 50 }
        );

        const transactions = result.transactions || [];
        
        const activities: ActivityItem[] = transactions.map((tx: any) => ({
            hash: tx.hash || tx.tx_hash || '',
            from: (tx.from || tx.from_address || '').toLowerCase(),
            to: (tx.to || tx.to_address || '').toLowerCase(),
            value: parseFloat(tx.value || tx.valueInEth || '0'),
            token: tx.token || 'ETH',
            chain: chain as string,
            type: walletAddress === (tx.from || tx.from_address || '').toLowerCase() ? 'sell' : 'buy',
            timestamp: tx.timestamp ? new Date(tx.timestamp).getTime() : Date.now(),
            status: tx.error || tx.failed ? 'failed' : 'success'
        }));

        if (activities.length > 0) {
            await getDb().collection('watchlist').doc(walletAddress).update({
                lastActivity: activities[0].timestamp,
                totalTxs: admin.firestore.FieldValue.increment(activities.length)
            });
        }

        res.json({ success: true, activities });
    } catch (error: any) {
        console.error('[Track API] Error fetching activity:', error);
        res.status(500).json({ error: 'An internal error occurred' });
    }
});

// GET /api/track/:address/cluster - Get cluster/related wallets
router.get('/track/:address/cluster', async (req, res) => {
    try {
        const { address } = req.params;
        const walletAddress = address.toLowerCase();
        
        const { WalletAnalyzer } = await import('@fundtracer/core');
        const sybilConfig = getSybilAlchemyKeys();
        const analyzer = new WalletAnalyzer({
            alchemy: process.env.DEFAULT_ALCHEMY_API_KEY,
            sybilConfig: sybilConfig,
        });
        
        const fundingTree = await analyzer.getFundingTree(walletAddress, 2);
        
        res.json({ success: true, cluster: fundingTree });
    } catch (error: any) {
        console.error('[Track API] Error fetching cluster:', error);
        res.status(500).json({ error: 'An internal error occurred' });
    }
});

// GET /api/smart-money/top-traders - Get top performing wallets
router.get('/smart-money/top-traders', async (req, res) => {
    try {
        const { limit = '20' } = req.query;
        
        const snapshot = await getDb().collection('watchlist')
            .where('totalTxs', '>=', 10)
            .orderBy('totalTxs', 'desc')
            .limit(parseInt(limit as string) || 20)
            .get();
        
        const traders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                address: doc.id,
                totalTxs: data.totalTxs || 0,
                watchCount: data.watchCount || 0,
                lastActivity: data.lastActivity,
                addedAt: data.addedAt
            };
        });

        res.json({ success: true, traders });
    } catch (error: any) {
        console.error('[Track API] Error fetching top traders:', error);
        res.status(500).json({ error: 'An internal error occurred' });
    }
});

// GET /api/smart-money/compare - Compare wallet to smart money patterns
router.get('/smart-money/compare', async (req, res) => {
    try {
        const { address } = req.query;
        
        if (!address) {
            return res.status(400).json({ error: 'Address required' });
        }

        const walletAddress = (address as string).toLowerCase();
        
        const { WalletAnalyzer } = await import('@fundtracer/core');
        const sybilConfig = getSybilAlchemyKeys();
        const analyzer = new WalletAnalyzer({
            alchemy: process.env.DEFAULT_ALCHEMY_API_KEY,
            sybilConfig: sybilConfig,
        });
        
        const result = await analyzer.analyze(walletAddress, 'ethereum', { transactionLimit: 100 });
        
        const transactions = result.transactions || [];
        const buyTxs = transactions.filter((tx: any) => 
            tx.to?.toLowerCase() === walletAddress
        ).length;
        const sellTxs = transactions.filter((tx: any) => 
            tx.from?.toLowerCase() === walletAddress
        ).length;
        const total = buyTxs + sellTxs;
        
        const winRate = total > 0 ? Math.round((buyTxs / total) * 100) : 0;
        
        const fundingTree = await analyzer.getFundingTree(walletAddress, 1);
        
        res.json({
            success: true,
            analysis: {
                address: walletAddress,
                totalTransactions: total,
                buyTransactions: buyTxs,
                sellTransactions: sellTxs,
                winRate,
                connectedWallets: (fundingTree.sources?.length || 0) + (fundingTree.destinations?.length || 0)
            }
        });
    } catch (error: any) {
        console.error('[Track API] Error comparing wallet:', error);
        res.status(500).json({ error: 'An internal error occurred' });
    }
});

// GET /api/track/smart-money/discover - Discover top performing wallets across chains
router.get('/smart-money/discover', async (req, res) => {
    try {
        const { 
            chain = 'all', 
            sortBy = 'pnl', 
            timeframe = '24h',
            limit = '20'
        } = req.query;

        const chains = chain === 'all' 
            ? SUPPORTED_CHAINS 
            : SUPPORTED_CHAINS.includes(chain as string) ? [chain as string] : SUPPORTED_CHAINS;

        const sortField = sortBy as string;
        const limitNum = Math.min(parseInt(limit as string) || 20, 50);
        const timeframeHours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
        const timeframeMs = timeframeHours * 60 * 60 * 1000;
        const cutoffTime = Date.now() - timeframeMs;

        const walletStats: Map<string, {
            address: string;
            chain: string;
            totalVolume: number;
            totalTrades: number;
            profitableTrades: number;
            totalPnL: number;
            lastActive: number;
        }> = new Map();

        for (const chainId of chains) {
            const geckoChain = CHAIN_TO_GECKO[chainId];
            if (!geckoChain) continue;

            try {
                const poolsData = await geckoTerminal.getTrendingPools(geckoChain, 20);
                const pools = poolsData?.data || [];
                
                for (const pool of pools) {
                    const poolAddress = pool.attributes?.pool_address || pool.attributes?.address;
                    if (!poolAddress) continue;

                    const poolAttributes = pool.attributes;
                    const currentPrice = parseFloat(poolAttributes?.base_token?.price_usd || poolAttributes?.quote_token?.price_usd || '0');
                    
                    try {
                        const tradesData = await geckoTerminal.getPoolTrades(geckoChain, poolAddress, 50);
                        const trades = tradesData?.data || [];

                        for (const trade of trades) {
                            const tradeAttributes = trade.attributes;
                            const trader = tradeAttributes?.maker_address || tradeAttributes?.from;
                            if (!trader || trader === '0x0000000000000000000000000000000000000000') continue;

                            const tradeTime = new Date(tradeAttributes?.trade_timestamp || tradeAttributes?.timestamp).getTime();
                            if (tradeTime < cutoffTime) continue;

                            const tradeType = tradeAttributes?.type; // 'buy' or 'sell'
                            const tradeVolumeUSD = parseFloat(tradeAttributes?.volume_in_usd || tradeAttributes?.trade_volume_usd || '0');
                            const tradePrice = parseFloat(tradeAttributes?.token_price_usd || currentPrice.toString());

                            let existing = walletStats.get(trader.toLowerCase());
                            if (!existing) {
                                existing = {
                                    address: trader.toLowerCase(),
                                    chain: chainId,
                                    totalVolume: 0,
                                    totalTrades: 0,
                                    profitableTrades: 0,
                                    totalPnL: 0,
                                    lastActive: 0
                                };
                                walletStats.set(trader.toLowerCase(), existing);
                            }

                            existing.totalVolume += tradeVolumeUSD;
                            existing.totalTrades += 1;
                            existing.lastActive = Math.max(existing.lastActive, tradeTime);

                            if (tradeType === 'sell' && tradePrice > 0 && currentPrice > 0) {
                                const pnl = (currentPrice - tradePrice) / tradePrice * tradeVolumeUSD;
                                existing.totalPnL += pnl;
                                if (pnl > 0) existing.profitableTrades += 1;
                            } else if (tradeType === 'buy') {
                                const pnl = (currentPrice - tradePrice) / tradePrice * tradeVolumeUSD;
                                existing.totalPnL += pnl;
                                if (pnl > 0) existing.profitableTrades += 1;
                            }
                        }
                    } catch (tradeErr) {
                        console.error(`[Track API] Error fetching trades for pool ${poolAddress}:`, tradeErr);
                    }
                }
            } catch (poolErr) {
                console.error(`[Track API] Error fetching pools for chain ${chainId}:`, poolErr);
            }
        }

        const wallets = Array.from(walletStats.values());

        const sortedWallets = wallets
            .filter(w => w.totalTrades >= 3)
            .map(w => ({
                address: w.address,
                chain: w.chain,
                totalTrades: w.totalTrades,
                totalVolume: Math.round(w.totalVolume * 100) / 100,
                pnl: Math.round(w.totalPnL * 100) / 100,
                winRate: w.totalTrades > 0 ? Math.round((w.profitableTrades / w.totalTrades) * 100) : 0,
                lastActive: w.lastActive
            }))
            .sort((a, b) => {
                if (sortField === 'volume') return b.totalVolume - a.totalVolume;
                if (sortField === 'winRate') return b.winRate - a.winRate;
                return b.pnl - a.pnl;
            })
            .slice(0, limitNum);

        res.json({ 
            success: true, 
            traders: sortedWallets,
            filters: {
                chain: chain,
                sortBy: sortField,
                timeframe: timeframe,
                count: sortedWallets.length
            }
        });
    } catch (error: any) {
        console.error('[Track API] Error discovering smart money:', error);
        res.status(500).json({ error: 'An internal error occurred' });
    }
});

export default router;
