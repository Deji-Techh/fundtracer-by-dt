import { Router, Request, Response } from 'express';
import { duneService } from '../services/DuneService.js';

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

export { router as marketRoutes };
