import { Router, Request, Response } from 'express';
import { moralisService } from '../services/MoralisService.js';
import { coinGeckoService } from '../services/CoinGeckoService.js';
import { quickNodeService } from '../services/QuickNodeService.js';

const router = Router();

// GET /api/tokens/search?q=query
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // Search via CoinGecko
    const searchResults = await coinGeckoService.searchTokens(q);
    
    res.json({
      query: q,
      results: searchResults.coins?.map((coin: any) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        thumb: coin.thumb,
        large: coin.large,
      })) || [],
    });
  } catch (error: any) {
    console.error('[Tokens Route] Search Error:', error);
    res.status(500).json({ 
      error: 'Failed to search tokens',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// GET /api/tokens/:address
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const chain = (req.query.chain as string) || 'linea';

    if (!address || !address.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid token address' });
    }

    // Get token metadata from Moralis
    const metadata = await moralisService.getTokenMetadata(address, chain);
    
    // Get safety check from QuickNode
    const safety = await quickNodeService.checkTokenSafety(address);

    res.json({
      address,
      chain,
      metadata,
      safety,
    });
  } catch (error: any) {
    console.error('[Tokens Route] Token Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch token data',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// GET /api/tokens/:address/chart
router.get('/:address/chart', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const days = parseInt(req.query.days as string) || 7;
    const coinId = req.query.coinId as string;

    if (!coinId) {
      return res.status(400).json({ error: 'coinId query parameter is required' });
    }

    // Get chart data from CoinGecko
    const chartData = await coinGeckoService.getMarketChart(coinId, days);

    res.json({
      address,
      coinId,
      days,
      prices: chartData.prices,
      marketCaps: chartData.market_caps,
      totalVolumes: chartData.total_volumes,
      attribution: coinGeckoService.getAttribution(),
    });
  } catch (error: any) {
    console.error('[Tokens Route] Chart Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chart data',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export { router as tokenRoutes };
