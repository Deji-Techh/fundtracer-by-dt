import { Router, Request, Response } from 'express';
import { geckoTerminalService } from '../services/GeckoTerminalService.js';

export const geckoTerminalRoutes: Router = Router();

// Get trending pools for a network
geckoTerminalRoutes.get('/trending-pools/:network', async (req: Request, res: Response) => {
  try {
    const { network } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!network) {
      return res.status(400).json({ error: 'Network parameter is required' });
    }

    const data = await geckoTerminalService.getTrendingPools(network, limit);
    res.json(data);
  } catch (error: any) {
    console.error('[GeckoTerminal Routes] Error fetching trending pools:', error);

    const cached = geckoTerminalService.getCachedData(`geckoterminal:trending-pools:${req.params.network}`);
    if (cached) {
      return res.json(cached);
    }

    res.status(500).json({ error: 'Failed to fetch trending pools' });
  }
});

// Get OHLCV data for a pool
geckoTerminalRoutes.get('/ohlcv/:network/:poolAddress', async (req: Request, res: Response) => {
  try {
    const { network, poolAddress } = req.params;
    const timeframe = (req.query.timeframe as string) || 'hour';
    const aggregate = req.query.aggregate as string || '1';
    const limit = parseInt(req.query.limit as string) || 100;

    if (!network || !poolAddress) {
      return res.status(400).json({ error: 'Network and poolAddress parameters are required' });
    }

    const data = await geckoTerminalService.getPoolOHLCV(
      network,
      poolAddress,
      timeframe as 'minute' | 'hour' | 'day',
      aggregate,
      limit
    );
    res.json(data);
  } catch (error: any) {
    console.error('[GeckoTerminal Routes] Error fetching OHLCV:', error);

    const { network, poolAddress } = req.params;
    const timeframe = req.query.timeframe as string || 'hour';
    const aggregate = req.query.aggregate as string || '1';
    const cacheKey = `geckoterminal:ohlcv:${network}:${poolAddress}:${timeframe}:${aggregate}`;
    const cached = geckoTerminalService.getCachedData(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    res.status(500).json({ error: 'Failed to fetch OHLCV data' });
  }
});

// Get trades for a pool
geckoTerminalRoutes.get('/trades/:network/:poolAddress', async (req: Request, res: Response) => {
  try {
    const { network, poolAddress } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!network || !poolAddress) {
      return res.status(400).json({ error: 'Network and poolAddress parameters are required' });
    }

    const data = await geckoTerminalService.getPoolTrades(network, poolAddress, limit);
    res.json(data);
  } catch (error: any) {
    console.error('[GeckoTerminal Routes] Error fetching trades:', error);

    const { network, poolAddress } = req.params;
    const cached = geckoTerminalService.getCachedData(`geckoterminal:trades:${network}:${poolAddress}`);
    if (cached) {
      return res.json(cached);
    }

    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// Get pool details
geckoTerminalRoutes.get('/pool/:network/:poolAddress', async (req: Request, res: Response) => {
  try {
    const { network, poolAddress } = req.params;

    if (!network || !poolAddress) {
      return res.status(400).json({ error: 'Network and poolAddress parameters are required' });
    }

    const data = await geckoTerminalService.getPoolDetails(network, poolAddress);
    res.json(data);
  } catch (error: any) {
    console.error('[GeckoTerminal Routes] Error fetching pool details:', error);

    const { network, poolAddress } = req.params;
    const cached = geckoTerminalService.getCachedData(`geckoterminal:pool:${network}:${poolAddress}`);
    if (cached) {
      return res.json(cached);
    }

    res.status(500).json({ error: 'Failed to fetch pool details' });
  }
});

export default geckoTerminalRoutes;
