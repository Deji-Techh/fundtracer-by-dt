/**
 * Track API Routes
 * Wallet tracking, watchlist, and smart money endpoints
 */

import { Router } from 'express';
import { getFirestore, admin } from '../firebase.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const firestore = getFirestore();

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
        const watchlistRef = firestore.collection('watchlist');
        const snapshot = await watchlistRef.orderBy('addedAt', 'desc').limit(500).get();
        
        const wallets: TrackedWallet[] = snapshot.docs.map(doc => ({
            address: doc.id,
            ...doc.data()
        } as TrackedWallet));
        
        res.json({ success: true, wallets });
    } catch (error: any) {
        console.error('[Track API] Error fetching watchlist:', error);
        res.status(500).json({ error: error.message });
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
        const existingDoc = await firestore.collection('watchlist').doc(walletAddress).get();
        if (existingDoc.exists) {
            const existingData = existingDoc.data();
            const watchers = existingData?.watchers || [];
            if (userId && !watchers.includes(userId)) {
                await firestore.collection('watchlist').doc(walletAddress).update({
                    watchers: admin.firestore.FieldValue.arrayUnion(userId),
                    watchCount: admin.firestore.FieldValue.increment(1)
                });
            }
            return res.json({ success: true, message: 'Wallet already tracked', address: walletAddress });
        }

        await firestore.collection('watchlist').doc(walletAddress).set({
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
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/track/:address - Remove wallet from watchlist
router.delete('/:address', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { address } = req.params;
        const userId = (req as any).user?.uid || (req as any).user?.id;
        const walletAddress = address.toLowerCase();
        
        const doc = await firestore.collection('watchlist').doc(walletAddress).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Wallet not found in watchlist' });
        }

        const data = doc.data();
        const watchers = data?.watchers || [];
        
        if (userId && watchers.includes(userId)) {
            const newWatchers = watchers.filter((w: string) => w !== userId);
            if (newWatchers.length === 0) {
                await firestore.collection('watchlist').doc(walletAddress).delete();
            } else {
                await firestore.collection('watchlist').doc(walletAddress).update({
                    watchers: newWatchers,
                    watchCount: admin.firestore.FieldValue.increment(-1)
                });
            }
        }

        res.json({ success: true, message: 'Wallet removed from watchlist' });
    } catch (error: any) {
        console.error('[Track API] Error removing wallet:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/track/:address/activity - Get activity for tracked wallet
router.get('/track/:address/activity', async (req, res) => {
    try {
        const { address } = req.params;
        const { chain = 'ethereum', limit = '50' } = req.query;
        const walletAddress = address.toLowerCase();
        
        const { WalletAnalyzer } = await import('@fundtracer/core');
        const analyzer = new WalletAnalyzer();
        
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
            await firestore.collection('watchlist').doc(walletAddress).update({
                lastActivity: activities[0].timestamp,
                totalTxs: admin.firestore.FieldValue.increment(activities.length)
            });
        }

        res.json({ success: true, activities });
    } catch (error: any) {
        console.error('[Track API] Error fetching activity:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/track/:address/cluster - Get cluster/related wallets
router.get('/track/:address/cluster', async (req, res) => {
    try {
        const { address } = req.params;
        const walletAddress = address.toLowerCase();
        
        const { WalletAnalyzer } = await import('@fundtracer/core');
        const analyzer = new WalletAnalyzer();
        
        const fundingTree = await analyzer.getFundingTree(walletAddress, 2);
        
        res.json({ success: true, cluster: fundingTree });
    } catch (error: any) {
        console.error('[Track API] Error fetching cluster:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/smart-money/top-traders - Get top performing wallets
router.get('/smart-money/top-traders', async (req, res) => {
    try {
        const { limit = '20' } = req.query;
        
        const snapshot = await firestore.collection('watchlist')
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
        res.status(500).json({ error: error.message });
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
        const analyzer = new WalletAnalyzer();
        
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
        res.status(500).json({ error: error.message });
    }
});

export default router;
