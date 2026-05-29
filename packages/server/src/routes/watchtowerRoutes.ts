import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getSybilAlchemyKeys } from '../utils/alchemyKeys.js';
import { getWatchtowerMonitor } from '../services/WatchtowerMonitor.js';

const router = Router();

// GET /api/watchtower/keys — returns Alchemy pool keys for desktop WebSocket use
router.get('/keys', authMiddleware, async (_req, res) => {
  try {
    const config = getSybilAlchemyKeys();

    const allKeys = [config.defaultKey, ...config.contractKeys, ...config.walletKeys]
      .filter(Boolean)
      .filter((k, i, arr) => arr.indexOf(k) === i);

    if (allKeys.length === 0) {
      return res.status(500).json({ error: 'No Alchemy keys configured' });
    }

    const CHAIN_WS_HOST: Record<string, string> = {
      ethereum: 'eth-mainnet',
      linea: 'linea-mainnet',
      arbitrum: 'arb-mainnet',
      base: 'base-mainnet',
      optimism: 'opt-mainnet',
      polygon: 'polygon-mainnet',
    };

    const wsEndpoints: Record<string, string> = {};
    const chainList = Object.keys(CHAIN_WS_HOST);
    for (const chain of chainList) {
      const host = CHAIN_WS_HOST[chain];
      const key = allKeys[chainList.indexOf(chain) % allKeys.length];
      wsEndpoints[chain] = `wss://${host}.g.alchemy.com/v2/${key}`;
    }

    res.json({ success: true, endpoints: wsEndpoints, keyCount: allKeys.length });
  } catch (error: any) {
    console.error('[Watchtower Keys] Error:', error);
    res.status(500).json({ error: 'Failed to get keys' });
  }
});

// GET /api/watchtower/activity — recent watchtower events for this user
router.get('/activity', authMiddleware, async (req: any, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const events = await getWatchtowerMonitor().getActivity(uid, limit);
    res.json({ success: true, events });
  } catch (error: any) {
    console.error('[Watchtower Activity] Error:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

// POST /api/watchtower/add — register a wallet to monitor
router.post('/add', authMiddleware, async (req: any, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { address, chain } = req.body;
    if (!address || !chain) {
      return res.status(400).json({ error: 'address and chain are required' });
    }

    await getWatchtowerMonitor().addWallet(uid, address, chain);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Watchtower Add] Error:', error);
    res.status(500).json({ error: 'Failed to add wallet' });
  }
});

// POST /api/watchtower/remove — unregister a wallet from monitoring
router.post('/remove', authMiddleware, async (req: any, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { address, chain } = req.body;
    if (!address || !chain) {
      return res.status(400).json({ error: 'address and chain are required' });
    }

    await getWatchtowerMonitor().removeWallet(uid, address, chain);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Watchtower Remove] Error:', error);
    res.status(500).json({ error: 'Failed to remove wallet' });
  }
});

export { router as watchtowerRoutes };
