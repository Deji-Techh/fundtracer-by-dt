import { Router, Request, Response } from 'express';
import { dexScreenerService } from '../services/DEXScreenerService.js';

const router = Router();

// GET /api/dexscreener/profiles/latest - Get latest token profiles for hero section
router.get('/profiles/latest', async (req: Request, res: Response) => {
  try {
    const profiles = await dexScreenerService.getLatestTokenProfiles();
    
    res.json({
      profiles: profiles || [],
      attribution: dexScreenerService.getAttribution(),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[DEXScreener Route] Profiles Error:', error);
    
    // Fallback to cached data
    const cachedKey = 'dexscreener:latest-profiles';
    const cached = dexScreenerService.getCachedData(cachedKey);
    
    if (cached) {
      res.json({
        profiles: cached,
        attribution: dexScreenerService.getAttribution(),
        lastUpdated: new Date().toISOString(),
        cached: true,
        warning: 'Showing cached data due to API error',
      });
    } else {
      res.status(500).json({
        error: 'Failed to fetch token profiles',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
});

// GET /api/dexscreener/boosts/top - Get top boosted tokens
router.get('/boosts/top', async (req: Request, res: Response) => {
  try {
    const boosts = await dexScreenerService.getTopBoostedTokens();
    
    res.json({
      boosts: boosts || [],
      attribution: dexScreenerService.getAttribution(),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[DEXScreener Route] Boosts Error:', error);
    
    const cachedKey = 'dexscreener:top-boosted';
    const cached = dexScreenerService.getCachedData(cachedKey);
    
    if (cached) {
      res.json({
        boosts: cached,
        attribution: dexScreenerService.getAttribution(),
        lastUpdated: new Date().toISOString(),
        cached: true,
        warning: 'Showing cached data due to API error',
      });
    } else {
      res.status(500).json({
        error: 'Failed to fetch boosted tokens',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
});

// GET /api/dexscreener/search?q=query - Search DEX pairs
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await dexScreenerService.searchPairs(q);
    
    res.json({
      query: q,
      pairs: results?.pairs || [],
      attribution: dexScreenerService.getAttribution(),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[DEXScreener Route] Search Error:', error);
    res.status(500).json({
      error: 'Failed to search pairs',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// GET /api/dexscreener/token/:chainId/:tokenAddress - Get token details
router.get('/token/:chainId/:tokenAddress', async (req: Request, res: Response) => {
  const { chainId, tokenAddress } = req.params;
  
  try {
    if (!chainId || !tokenAddress) {
      return res.status(400).json({ error: 'Chain ID and token address are required' });
    }

    const tokenData = await dexScreenerService.getTokenDetails(chainId, tokenAddress);
    
    res.json({
      chainId,
      tokenAddress,
      data: tokenData,
      attribution: dexScreenerService.getAttribution(),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[DEXScreener Route] Token Error:', error);
    
    // Try to get cached data
    const normalizedChain = chainId?.toLowerCase() || '';
    const cachedKey = `dexscreener:token:${normalizedChain}:${tokenAddress?.toLowerCase() || ''}`;
    const cached = dexScreenerService.getCachedData(cachedKey);
    
    if (cached) {
      res.json({
        chainId,
        tokenAddress,
        data: cached,
        attribution: dexScreenerService.getAttribution(),
        lastUpdated: new Date().toISOString(),
        cached: true,
        warning: 'Showing cached data due to API error',
      });
    } else {
      res.status(500).json({
        error: 'Failed to fetch token details',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
});

// GET /api/dexscreener/pairs/:chainId/:tokenAddress - Get token pairs
router.get('/pairs/:chainId/:tokenAddress', async (req: Request, res: Response) => {
  const { chainId, tokenAddress } = req.params;
  
  try {
    if (!chainId || !tokenAddress) {
      return res.status(400).json({ error: 'Chain ID and token address are required' });
    }

    const pairsData = await dexScreenerService.getTokenPairs(chainId, tokenAddress);
    
    res.json({
      chainId,
      tokenAddress,
      pairs: pairsData?.pairs || [],
      attribution: dexScreenerService.getAttribution(),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[DEXScreener Route] Pairs Error:', error);
    
    const normalizedChain = chainId?.toLowerCase() || '';
    const cachedKey = `dexscreener:pairs:${normalizedChain}:${tokenAddress?.toLowerCase() || ''}`;
    const cached = dexScreenerService.getCachedData(cachedKey);
    
    if (cached) {
      res.json({
        chainId,
        tokenAddress,
        pairs: cached?.pairs || [],
        attribution: dexScreenerService.getAttribution(),
        lastUpdated: new Date().toISOString(),
        cached: true,
        warning: 'Showing cached data due to API error',
      });
    } else {
      res.status(500).json({
        error: 'Failed to fetch token pairs',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
});

// GET /api/dexscreener/trending - Get trending tokens with price data
router.get('/trending', async (req: Request, res: Response) => {
  try {
    // Fetch top pairs (this includes price data!)
    const topPairs = await dexScreenerService.getTopPairs(100);
    
    // Transform pairs into token format
    const seenTokens = new Set();
    const tokens: any[] = [];

    if (Array.isArray(topPairs)) {
      topPairs.forEach((pair: any) => {
        // Use base token as the main token
        const baseToken = pair.baseToken;
        if (!baseToken) return;

        const key = `${pair.chainId}-${baseToken.address}`;
        if (!seenTokens.has(key)) {
          seenTokens.add(key);
          tokens.push({
            chainId: pair.chainId,
            tokenAddress: baseToken.address,
            name: baseToken.name,
            symbol: baseToken.symbol,
            icon: pair.info?.imageUrl || baseToken.icon,
            header: pair.info?.header,
            priceUsd: pair.priceUsd,
            priceChange: pair.priceChange,
            volume: pair.volume,
            marketCap: pair.marketCap,
            fdv: pair.fdv,
            liquidity: pair.liquidity,
            dexId: pair.dexId,
            pairAddress: pair.pairAddress,
            url: pair.url,
          });
        }
      });
    }

    res.json({
      tokens,
      total: tokens.length,
      attribution: dexScreenerService.getAttribution(),
      lastUpdated: new Date().toISOString(),
      cached: false,
    });
  } catch (error: any) {
    console.error('[DEXScreener Route] Trending Error:', error);
    
    // Try to return cached data
    const cachedKey = 'dexscreener:top-pairs:100';
    const cached = dexScreenerService.getCachedData(cachedKey);
    
    if (cached) {
      // Transform cached pairs
      const seenTokens = new Set();
      const tokens: any[] = [];
      
      cached.forEach((pair: any) => {
        const baseToken = pair.baseToken;
        if (!baseToken) return;
        
        const key = `${pair.chainId}-${baseToken.address}`;
        if (!seenTokens.has(key)) {
          seenTokens.add(key);
          tokens.push({
            chainId: pair.chainId,
            tokenAddress: baseToken.address,
            name: baseToken.name,
            symbol: baseToken.symbol,
            icon: pair.info?.imageUrl || baseToken.icon,
            priceUsd: pair.priceUsd,
            priceChange: pair.priceChange,
            volume: pair.volume,
            marketCap: pair.marketCap,
            fdv: pair.fdv,
            dexId: pair.dexId,
          });
        }
      });
      
      res.json({
        tokens,
        total: tokens.length,
        attribution: dexScreenerService.getAttribution(),
        lastUpdated: new Date().toISOString(),
        cached: true,
        warning: 'Showing cached data due to API error',
      });
    } else {
      res.status(500).json({
        error: 'Failed to fetch trending tokens',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
});

export { router as dexScreenerRoutes };
