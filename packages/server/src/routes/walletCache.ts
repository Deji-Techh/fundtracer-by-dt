import { Router, Request, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { getFirestore } from '../firebase.js';
import { getRedis } from '../utils/redis.js';

const router = Router();

const COLLECTION = 'walletCache';

interface WalletCacheData {
  address: string;
  chain: string;
  balance?: string;
  txCount?: number;
  riskScore?: number;
  tags?: string[];
  fundingSources?: string[];
  recentActivity?: string;
  lastUpdated: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/wallet-cache/:chain/:address
 * Fetch cached wallet data from Redis
 */
router.get('/:chain/:address', async (req: Request, res: Response) => {
  try {
    const { chain, address } = req.params;
    const redis = getRedis();
    
    if (!redis) {
      return res.status(503).json({ 
        success: false, 
        error: 'Cache service unavailable' 
      });
    }

    const cacheKey = `wallet:${chain}:${address.toLowerCase()}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached) as WalletCacheData;
      
      if (Date.now() - data.lastUpdated < CACHE_TTL) {
        return res.json({
          success: true,
          wallet: data,
          cached: true,
        });
      }
    }

    // Cache miss or expired - will need to fetch from live data
    // For now, return null so frontend can trigger live fetch
    return res.json({
      success: true,
      wallet: null,
      cached: false,
    });
  } catch (error: any) {
    console.error('[WalletCache] Fetch error:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch wallet cache' 
    });
  }
});

/**
 * POST /api/wallet-cache/:chain/:address
 * Save wallet data to cache
 */
router.post('/:chain/:address', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chain, address } = req.params;
    const { balance, txCount, riskScore, tags, fundingSources, recentActivity } = req.body;
    
    const redis = getRedis();
    
    if (!redis) {
      return res.status(503).json({ 
        success: false, 
        error: 'Cache service unavailable' 
      });
    }

    const cacheKey = `wallet:${chain}:${address.toLowerCase()}`;
    const cacheData: WalletCacheData = {
      address: address.toLowerCase(),
      chain,
      balance,
      txCount,
      riskScore,
      tags,
      fundingSources,
      recentActivity,
      lastUpdated: Date.now(),
    };

    // Cache for 5 minutes
    await redis.setex(cacheKey, CACHE_TTL / 1000, JSON.stringify(cacheData));

    return res.json({
      success: true,
      wallet: cacheData,
    });
  } catch (error: any) {
    console.error('[WalletCache] Save error:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to save wallet cache' 
    });
  }
});

/**
 * DELETE /api/wallet-cache/:chain/:address
 * Clear cached wallet data
 */
router.delete('/:chain/:address', async (req: Request, res: Response) => {
  try {
    const { chain, address } = req.params;
    const redis = getRedis();
    
    if (!redis) {
      return res.status(503).json({ 
        success: false, 
        error: 'Cache service unavailable' 
      });
    }

    const cacheKey = `wallet:${chain}:${address.toLowerCase()}`;
    await redis.del(cacheKey);

    return res.json({
      success: true,
    });
  } catch (error: any) {
    console.error('[WalletCache] Delete error:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to clear wallet cache' 
    });
  }
});

export { router as walletCacheRoutes };