import { Router, Request, Response } from 'express';
import { duneService } from '../services/DuneService.js';
import { coinGeckoService } from '../services/CoinGeckoService.js';

const router = Router();

// GET /api/market/stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Get Linea ecosystem stats from Dune
    const stats = await duneService.getLineaStats();

    res.json({
      chain: 'linea',
      stats: stats.result?.rows || [],
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Market Route] Error:', error);
    // Return mock data on error
    res.json({
      chain: 'linea',
      stats: [
        { metric: 'TVL', value: 450000000, change_24h: 2.3, formatted: '$450.0M' },
        { metric: 'Volume 24h', value: 23500000, change_24h: -5.1, formatted: '$23.5M' },
        { metric: 'Transactions', value: 125400, change_24h: 12.0, formatted: '125.4K' },
        { metric: 'Active Users', value: 45200, change_24h: 8.0, formatted: '45.2K' },
      ],
      lastUpdated: new Date().toISOString(),
    });
  }
});

// GET /api/market/coins - Get top coins with market data (optionally filtered by chain)
router.get('/coins', async (req: Request, res: Response) => {
  try {
    const { chain, page = '1', per_page = '100' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const perPageNum = parseInt(per_page as string) || 100;

    // Fetch top coins from CoinGecko markets endpoint
    const coins = await coinGeckoService.getCoinsMarkets(perPageNum, pageNum);

    // If chain filter is specified, filter coins by platform
    let filteredCoins = coins;
    if (chain && chain !== 'all') {
      const chainLower = (chain as string).toLowerCase();
      
      // Map chain names to CoinGecko platform identifiers
      const platformMap: Record<string, string[]> = {
        'ethereum': ['ethereum'],
        'linea': ['linea'],
        'polygon': ['polygon-pos'],
        'arbitrum': ['arbitrum-one', 'arbitrum-nova'],
        'optimism': ['optimistic-ethereum'],
        'base': ['base'],
        'bsc': ['binance-smart-chain'],
      };

      const targetPlatforms = platformMap[chainLower];
      
      if (targetPlatforms) {
        // Filter coins that have contracts on the specified platform
        filteredCoins = coins.filter((coin: any) => {
          if (!coin.platforms) return false;
          return targetPlatforms.some(platform => 
            coin.platforms[platform] && coin.platforms[platform].startsWith('0x')
          );
        });
      }
    }

    // Format response with images and market data
    const formattedCoins = filteredCoins.map((coin: any, index: number) => ({
      id: coin.id,
      rank: (pageNum - 1) * perPageNum + index + 1,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      price: coin.current_price || 0,
      change24h: coin.price_change_percentage_24h || 0,
      volume24h: coin.total_volume || 0,
      marketCap: coin.market_cap || 0,
      image: coin.image || null,
      thumb: coin.image || null,
      platforms: coin.platforms || {},
    }));

    res.json({
      chain: chain || 'all',
      page: pageNum,
      per_page: perPageNum,
      coins: formattedCoins,
      attribution: coinGeckoService.getAttribution(),
    });
  } catch (error: any) {
    console.error('[Market Route] Coins Error:', error);
    res.status(500).json({
      error: 'Failed to fetch market coins',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export { router as marketRoutes };
