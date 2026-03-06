/**
 * Polymarket API Routes
 * Public endpoints for market data, search, and leaderboards
 */

import { Router } from 'express';
import { polymarketService } from '../services/PolymarketService.js';

const router = Router();

/**
 * GET /api/polymarket/markets
 * Get markets with optional search and filtering
 */
router.get('/markets', async (req, res) => {
  try {
    const {
      q,
      active = 'true',
      closed = 'false',
      limit = '20',
      offset = '0',
      order = 'volume24hr'
    } = req.query;

    const markets = await polymarketService.getMarkets({
      query: q as string,
      active: active === 'true',
      closed: closed === 'true',
      limit: parseInt(limit as string) || 20,
      offset: parseInt(offset as string) || 0,
      order: order as any
    });

    res.json({
      success: true,
      data: markets,
      count: markets.length
    });
  } catch (error: any) {
    console.error('[Polymarket API] Error fetching markets:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch markets'
    });
  }
});

/**
 * GET /api/polymarket/markets/:slug
 * Get market details by slug or condition ID
 */
router.get('/markets/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const market = await polymarketService.getMarket(slug);

    if (!market) {
      return res.status(404).json({
        success: false,
        error: 'Market not found'
      });
    }

    res.json({
      success: true,
      data: market
    });
  } catch (error: any) {
    console.error('[Polymarket API] Error fetching market:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch market'
    });
  }
});

/**
 * GET /api/polymarket/trending
 * Get trending markets (high 24h volume)
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = '10' } = req.query;
    const markets = await polymarketService.getTrendingMarkets(
      parseInt(limit as string) || 10
    );

    res.json({
      success: true,
      data: markets,
      count: markets.length
    });
  } catch (error: any) {
    console.error('[Polymarket API] Error fetching trending:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch trending markets'
    });
  }
});

/**
 * GET /api/polymarket/spikes
 * Get markets with volume spikes
 */
router.get('/spikes', async (req, res) => {
  try {
    const { threshold = '2.0', minVolume = '10000' } = req.query;

    const spikes = await polymarketService.detectVolumeSpikes(
      parseFloat(threshold as string) || 2.0,
      parseFloat(minVolume as string) || 10000
    );

    res.json({
      success: true,
      data: spikes,
      count: spikes.length
    });
  } catch (error: any) {
    console.error('[Polymarket API] Error detecting spikes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to detect volume spikes'
    });
  }
});

/**
 * GET /api/polymarket/movers
 * Get markets with significant price movement
 */
router.get('/movers', async (req, res) => {
  try {
    const { minChange = '0.05' } = req.query;
    const movers = await polymarketService.getPriceMovers(
      parseFloat(minChange as string) || 0.05
    );

    res.json({
      success: true,
      data: movers,
      count: movers.length
    });
  } catch (error: any) {
    console.error('[Polymarket API] Error fetching movers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch price movers'
    });
  }
});

/**
 * GET /api/polymarket/events
 * Get events (market groups)
 */
router.get('/events', async (req, res) => {
  try {
    const { active = 'true', limit = '20', offset = '0' } = req.query;

    const events = await polymarketService.getEvents({
      active: active === 'true',
      limit: parseInt(limit as string) || 20,
      offset: parseInt(offset as string) || 0
    });

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error: any) {
    console.error('[Polymarket API] Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch events'
    });
  }
});

/**
 * GET /api/polymarket/leaderboard
 * Get top traders leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = '20' } = req.query;
    const traders = await polymarketService.getLeaderboard(
      parseInt(limit as string) || 20
    );

    res.json({
      success: true,
      data: traders,
      count: traders.length
    });
  } catch (error: any) {
    console.error('[Polymarket API] Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch leaderboard'
    });
  }
});

/**
 * GET /api/polymarket/trader/:address
 * Get trader profile and positions
 */
router.get('/trader/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }

    const profile = await polymarketService.getTraderProfile(address);

    res.json({
      success: true,
      data: profile
    });
  } catch (error: any) {
    console.error('[Polymarket API] Error fetching trader:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch trader profile'
    });
  }
});

/**
 * GET /api/polymarket/orderbook/:tokenId
 * Get order book for a market token
 */
router.get('/orderbook/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const orderBook = await polymarketService.getOrderBook(tokenId);

    res.json({
      success: true,
      data: orderBook
    });
  } catch (error: any) {
    console.error('[Polymarket API] Error fetching orderbook:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch order book'
    });
  }
});

/**
 * GET /api/polymarket/trades/:conditionId
 * Get recent trades for a market
 */
router.get('/trades/:conditionId', async (req, res) => {
  try {
    const { conditionId } = req.params;
    const { limit = '50' } = req.query;

    const trades = await polymarketService.getMarketTrades(
      conditionId,
      parseInt(limit as string) || 50
    );

    res.json({
      success: true,
      data: trades,
      count: trades.length
    });
  } catch (error: any) {
    console.error('[Polymarket API] Error fetching trades:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch trades'
    });
  }
});

/**
 * GET /api/polymarket/history/:conditionId
 * Get price history for a market
 */
router.get('/history/:conditionId', async (req, res) => {
  try {
    const { conditionId } = req.params;
    const { interval = 'hour', limit = '100' } = req.query;

    const history = await polymarketService.getPriceHistory(
      conditionId,
      interval as 'hour' | 'day',
      parseInt(limit as string) || 100
    );

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error: any) {
    console.error('[Polymarket API] Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch price history'
    });
  }
});

export default router;
