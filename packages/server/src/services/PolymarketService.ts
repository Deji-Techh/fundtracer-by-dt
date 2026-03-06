/**
 * Polymarket API Service
 * Comprehensive wrapper for Gamma, Data, and CLOB APIs
 * 
 * APIs:
 * - Gamma API (gamma-api.polymarket.com): Markets, events, search
 * - Data API (data-api.polymarket.com): Positions, trades, leaderboards
 * - CLOB API (clob.polymarket.com): Order book, pricing
 */

import { cache } from '../utils/cache.js';

// API Base URLs
const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

// Types
export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  description: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: number;
  volume24hr: number;
  volume1wk: number;
  volume1mo: number;
  liquidity: number;
  active: boolean;
  closed: boolean;
  endDate: string;
  image: string;
  icon: string;
  category?: string;
  bestBid?: number;
  bestAsk?: number;
  lastTradePrice?: number;
  oneDayPriceChange?: number;
  oneWeekPriceChange?: number;
  clobTokenIds?: string[];
  events?: PolymarketEvent[];
}

export interface PolymarketEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  volume: number;
  volume24hr: number;
  liquidity: number;
  commentCount: number;
}

export interface PolymarketTrader {
  address: string;
  username?: string;
  profileImage?: string;
  volume: number;
  profit: number;
  positions: number;
  winRate?: number;
  rank?: number;
}

export interface PolymarketPosition {
  marketId: string;
  marketQuestion: string;
  outcome: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface PolymarketTrade {
  id: string;
  marketId: string;
  marketQuestion: string;
  outcome: string;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  timestamp: number;
  trader?: string;
}

export interface MarketSearchParams {
  query?: string;
  active?: boolean;
  closed?: boolean;
  limit?: number;
  offset?: number;
  order?: 'volume' | 'volume24hr' | 'liquidity' | 'endDate' | 'createdAt';
  ascending?: boolean;
}

export interface LeaderboardParams {
  period?: 'daily' | 'weekly' | 'monthly' | 'all';
  limit?: number;
  offset?: number;
}

export class PolymarketService {
  private rateLimited = false;
  private rateLimitExpires = 0;
  private requestCount = 0;
  private requestWindowStart = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 25; // Stay under 30/min limit

  // Rate limiting helper
  private async checkRateLimit(): Promise<void> {
    // Reset window if a minute has passed
    const now = Date.now();
    if (now - this.requestWindowStart >= 60000) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }

    // If we've hit the limit, wait
    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = 60000 - (now - this.requestWindowStart);
      console.warn(`[PolymarketService] Rate limit approaching, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.requestWindowStart = Date.now();
    }

    // If we're in a rate-limited state from API response
    if (this.rateLimited) {
      if (now >= this.rateLimitExpires) {
        this.rateLimited = false;
      } else {
        const waitTime = this.rateLimitExpires - now;
        console.warn(`[PolymarketService] Rate limited, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.rateLimited = false;
      }
    }
  }

  private setRateLimit(delayMs: number = 60000) {
    this.rateLimited = true;
    this.rateLimitExpires = Date.now() + delayMs;
    console.warn(`[PolymarketService] Rate limited for ${delayMs / 1000}s`);
  }

  // Generic fetch helper
  private async fetch<T>(url: string, cacheKey: string, cacheTtl: number): Promise<T> {
    const cached = cache.get(cacheKey);
    if (cached) return cached as T;

    await this.checkRateLimit();
    this.requestCount++;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FundTracer/1.0'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          this.setRateLimit(60000);
          throw new Error('Rate limited by Polymarket API');
        }
        throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as T;
      cache.set(cacheKey, data, cacheTtl);
      return data;
    } catch (error) {
      console.error(`[PolymarketService] Error fetching ${url}:`, error);
      throw error;
    }
  }

  // ==========================================
  // MARKET EXPLORER
  // ==========================================

  /**
   * Get active markets with optional filtering
   */
  async getMarkets(params: MarketSearchParams = {}): Promise<PolymarketMarket[]> {
    const {
      query,
      active = true,
      closed = false,
      limit = 20,
      offset = 0,
      order = 'volume24hr',
      ascending = false
    } = params;

    const queryParams = new URLSearchParams();
    queryParams.set('limit', String(limit));
    queryParams.set('offset', String(offset));
    queryParams.set('active', String(active));
    queryParams.set('closed', String(closed));
    queryParams.set('order', order);
    queryParams.set('ascending', String(ascending));

    if (query) {
      queryParams.set('_q', query);
    }

    const url = `${GAMMA_API}/markets?${queryParams.toString()}`;
    const cacheKey = `polymarket:markets:${queryParams.toString()}`;

    const rawMarkets = await this.fetch<any[]>(url, cacheKey, 60); // 1 min cache

    return rawMarkets.map(m => this.normalizeMarket(m));
  }

  /**
   * Search markets by keyword
   */
  async searchMarkets(query: string, limit: number = 20): Promise<PolymarketMarket[]> {
    return this.getMarkets({ query, limit });
  }

  /**
   * Get trending/hot markets (high volume in last 24h)
   */
  async getTrendingMarkets(limit: number = 10): Promise<PolymarketMarket[]> {
    return this.getMarkets({
      active: true,
      closed: false,
      limit,
      order: 'volume24hr',
      ascending: false
    });
  }

  /**
   * Get high liquidity markets
   */
  async getHighLiquidityMarkets(limit: number = 10): Promise<PolymarketMarket[]> {
    return this.getMarkets({
      active: true,
      closed: false,
      limit,
      order: 'liquidity',
      ascending: false
    });
  }

  /**
   * Get specific market by ID or slug
   */
  async getMarket(idOrSlug: string): Promise<PolymarketMarket | null> {
    const cacheKey = `polymarket:market:${idOrSlug}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached as PolymarketMarket;

    await this.checkRateLimit();
    this.requestCount++;

    try {
      // Try by slug first
      const url = `${GAMMA_API}/markets?slug=${encodeURIComponent(idOrSlug)}&limit=1`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const markets = await response.json() as any[];
        if (markets.length > 0) {
          const market = this.normalizeMarket(markets[0]);
          cache.set(cacheKey, market, 120);
          return market;
        }
      }

      // Try by condition ID
      const url2 = `${GAMMA_API}/markets?conditionId=${encodeURIComponent(idOrSlug)}&limit=1`;
      const response2 = await fetch(url2, {
        headers: { 'Accept': 'application/json' }
      });

      if (response2.ok) {
        const markets = await response2.json() as any[];
        if (markets.length > 0) {
          const market = this.normalizeMarket(markets[0]);
          cache.set(cacheKey, market, 120);
          return market;
        }
      }

      return null;
    } catch (error) {
      console.error('[PolymarketService] Error fetching market:', error);
      return null;
    }
  }

  // ==========================================
  // EVENTS
  // ==========================================

  /**
   * Get events (groups of related markets)
   */
  async getEvents(params: { active?: boolean; limit?: number; offset?: number } = {}): Promise<PolymarketEvent[]> {
    const { active = true, limit = 20, offset = 0 } = params;

    const queryParams = new URLSearchParams();
    queryParams.set('limit', String(limit));
    queryParams.set('offset', String(offset));
    queryParams.set('active', String(active));
    queryParams.set('order', 'volume24hr');
    queryParams.set('ascending', 'false');

    const url = `${GAMMA_API}/events?${queryParams.toString()}`;
    const cacheKey = `polymarket:events:${queryParams.toString()}`;

    const rawEvents = await this.fetch<any[]>(url, cacheKey, 120);

    return rawEvents.map(e => ({
      id: e.id,
      ticker: e.ticker,
      slug: e.slug,
      title: e.title,
      description: e.description,
      image: e.image,
      icon: e.icon,
      active: e.active,
      closed: e.closed,
      volume: e.volume || 0,
      volume24hr: e.volume24hr || 0,
      liquidity: e.liquidity || 0,
      commentCount: e.commentCount || 0
    }));
  }

  // ==========================================
  // VOLUME SPIKE DETECTION
  // ==========================================

  /**
   * Detect volume spikes - markets with unusual 24h volume
   */
  async detectVolumeSpikes(
    thresholdMultiplier: number = 2.0,
    minVolume24h: number = 10000
  ): Promise<Array<{ market: PolymarketMarket; spikeRatio: number; currentVolume: number; avgVolume: number }>> {
    const markets = await this.getMarkets({
      active: true,
      closed: false,
      limit: 100,
      order: 'volume24hr',
      ascending: false
    });

    const spikes: Array<{ market: PolymarketMarket; spikeRatio: number; currentVolume: number; avgVolume: number }> = [];

    for (const market of markets) {
      if (market.volume24hr < minVolume24h) continue;

      // Calculate average daily volume (total / estimated days)
      const totalVolume = market.volume;
      const volume24hr = market.volume24hr;

      // If we have weekly data, use that for comparison
      const avgDailyVolume = market.volume1wk ? market.volume1wk / 7 : totalVolume / 30;

      if (avgDailyVolume > 0) {
        const spike = volume24hr / avgDailyVolume;
        if (spike >= thresholdMultiplier) {
          spikes.push({
            market,
            spikeRatio: Math.round(spike * 100) / 100,
            currentVolume: volume24hr,
            avgVolume: Math.round(avgDailyVolume * 100) / 100
          });
        }
      }
    }

    // Sort by spike magnitude
    return spikes.sort((a, b) => b.spikeRatio - a.spikeRatio);
  }

  /**
   * Get markets with significant price movement
   */
  async getPriceMovers(minChange: number = 0.05): Promise<Array<{ market: PolymarketMarket; priceChange: number; previousPrice: number; currentPrice: number }>> {
    const markets = await this.getMarkets({
      active: true,
      closed: false,
      limit: 100,
      order: 'volume24hr'
    });

    return markets
      .filter(m => Math.abs(m.oneDayPriceChange || 0) >= minChange)
      .map(market => {
        const priceChange = market.oneDayPriceChange || 0;
        const currentPrice = market.lastTradePrice || (market.outcomePrices?.[0] ? parseFloat(market.outcomePrices[0]) : 0);
        const previousPrice = currentPrice - priceChange;
        return {
          market,
          priceChange,
          previousPrice: Math.max(0, previousPrice),
          currentPrice
        };
      })
      .sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange));
  }

  // ==========================================
  // CLOB API - Order Book & Pricing
  // ==========================================

  /**
   * Get order book for a market
   */
  async getOrderBook(tokenId: string): Promise<{
    bids: Array<{ price: number; size: number }>;
    asks: Array<{ price: number; size: number }>;
    spread: number;
  }> {
    const cacheKey = `polymarket:orderbook:${tokenId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    await this.checkRateLimit();
    this.requestCount++;

    try {
      const url = `${CLOB_API}/book?token_id=${tokenId}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 429) {
          this.setRateLimit(60000);
        }
        throw new Error(`CLOB API error: ${response.status}`);
      }

      const data = await response.json() as any;

      const bids = (data.bids || []).map((b: any) => ({
        price: parseFloat(b.price),
        size: parseFloat(b.size)
      }));

      const asks = (data.asks || []).map((a: any) => ({
        price: parseFloat(a.price),
        size: parseFloat(a.size)
      }));

      const bestBid = bids.length > 0 ? bids[0].price : 0;
      const bestAsk = asks.length > 0 ? asks[0].price : 1;
      const spread = bestAsk - bestBid;

      const result = { bids, asks, spread };
      cache.set(cacheKey, result, 10); // 10 second cache
      return result;
    } catch (error) {
      console.error('[PolymarketService] Error fetching order book:', error);
      return { bids: [], asks: [], spread: 0 };
    }
  }

  /**
   * Get all markets from CLOB API
   */
  async getClobMarkets(): Promise<any[]> {
    const cacheKey = 'polymarket:clob:markets';
    const cached = cache.get(cacheKey);
    if (cached) return cached as any[];

    await this.checkRateLimit();
    this.requestCount++;

    try {
      const response = await fetch(`${CLOB_API}/markets`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`CLOB API error: ${response.status}`);
      }

      const data = await response.json() as any[];
      cache.set(cacheKey, data, 300); // 5 min cache
      return data;
    } catch (error) {
      console.error('[PolymarketService] Error fetching CLOB markets:', error);
      return [];
    }
  }

  // ==========================================
  // LEADERBOARD (from CLOB API)
  // ==========================================

  /**
   * Get top traders leaderboard
   */
  async getLeaderboard(limit: number = 20): Promise<PolymarketTrader[]> {
    const cacheKey = `polymarket:leaderboard:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached as PolymarketTrader[];

    // The CLOB API has a rewards/leaderboard endpoint
    await this.checkRateLimit();
    this.requestCount++;

    try {
      const response = await fetch(`${CLOB_API}/rewards/leaderboard?limit=${limit}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json() as any[];
        const traders = data.map((t: any, index: number) => ({
          address: t.address || t.user || 'Unknown',
          username: t.username || t.name,
          profileImage: t.profileImage || t.avatar,
          volume: t.volume || t.totalVolume || 0,
          profit: t.pnl || t.profit || 0,
          positions: t.positions || 0,
          winRate: t.winRate,
          rank: index + 1
        }));

        cache.set(cacheKey, traders, 300); // 5 min cache
        return traders;
      }

      return [];
    } catch (error) {
      console.error('[PolymarketService] Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Get trader profile and positions
   */
  async getTraderProfile(address: string): Promise<{
    trader: PolymarketTrader | null;
    positions: PolymarketPosition[];
  }> {
    const cacheKey = `polymarket:trader:${address}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    await this.checkRateLimit();
    this.requestCount++;

    try {
      // Get user positions from CLOB API
      const response = await fetch(`${CLOB_API}/positions?user=${address}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        return { trader: null, positions: [] };
      }

      const positionsData = await response.json() as any[];

      // Calculate totals
      let totalPnl = 0;
      let totalVolume = 0;
      const positions: PolymarketPosition[] = [];

      for (const pos of positionsData) {
        const pnl = pos.pnl || 0;
        totalPnl += pnl;
        totalVolume += pos.size || 0;

        positions.push({
          marketId: pos.conditionId || pos.market,
          marketQuestion: pos.marketQuestion || pos.question || 'Unknown',
          outcome: pos.outcome,
          size: pos.size || 0,
          avgPrice: pos.avgPrice || 0,
          currentPrice: pos.currentPrice || pos.price || 0,
          pnl,
          pnlPercent: pos.pnlPercent || 0
        });
      }

      const trader: PolymarketTrader = {
        address,
        volume: totalVolume,
        profit: totalPnl,
        positions: positions.length
      };

      const result = { trader, positions };
      cache.set(cacheKey, result, 120); // 2 min cache
      return result;
    } catch (error) {
      console.error('[PolymarketService] Error fetching trader profile:', error);
      return { trader: null, positions: [] };
    }
  }

  // ==========================================
  // RECENT TRADES
  // ==========================================

  /**
   * Get recent trades for a market
   */
  async getMarketTrades(conditionId: string, limit: number = 50): Promise<PolymarketTrade[]> {
    const cacheKey = `polymarket:trades:${conditionId}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached as PolymarketTrade[];

    await this.checkRateLimit();
    this.requestCount++;

    try {
      const url = `${CLOB_API}/trades?asset_id=${conditionId}&limit=${limit}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as any[];
      const trades: PolymarketTrade[] = data.map((t: any) => ({
        id: t.id || t.tradeId,
        marketId: conditionId,
        marketQuestion: t.marketQuestion || '',
        outcome: t.outcome,
        side: t.side?.toLowerCase() || 'buy',
        price: parseFloat(t.price) || 0,
        size: parseFloat(t.size) || 0,
        timestamp: t.timestamp || t.createdAt || Date.now(),
        trader: t.maker || t.taker || t.user
      }));

      cache.set(cacheKey, trades, 30); // 30 second cache
      return trades;
    } catch (error) {
      console.error('[PolymarketService] Error fetching trades:', error);
      return [];
    }
  }

  // ==========================================
  // PRICE HISTORY
  // ==========================================

  /**
   * Get price history for a market (for charting)
   */
  async getPriceHistory(
    conditionId: string,
    interval: 'hour' | 'day' = 'hour',
    limit: number = 100
  ): Promise<Array<{ timestamp: number; price: number; volume: number }>> {
    const cacheKey = `polymarket:prices:${conditionId}:${interval}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached as any[];

    await this.checkRateLimit();
    this.requestCount++;

    try {
      // Use CLOB prices endpoint
      const response = await fetch(
        `${CLOB_API}/prices-history?market=${conditionId}&interval=${interval}&limit=${limit}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as any;
      const history = (data.history || data || []).map((p: any) => ({
        timestamp: p.t || p.timestamp,
        price: p.p || p.price || 0,
        volume: p.v || p.volume || 0
      }));

      cache.set(cacheKey, history, 60);
      return history;
    } catch (error) {
      console.error('[PolymarketService] Error fetching price history:', error);
      return [];
    }
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  /**
   * Normalize raw market data from API
   */
  private normalizeMarket(raw: any): PolymarketMarket {
    let outcomes: string[] = [];
    let outcomePrices: string[] = [];

    try {
      outcomes = typeof raw.outcomes === 'string' ? JSON.parse(raw.outcomes) : (raw.outcomes || []);
      outcomePrices = typeof raw.outcomePrices === 'string' ? JSON.parse(raw.outcomePrices) : (raw.outcomePrices || []);
    } catch {
      outcomes = ['Yes', 'No'];
      outcomePrices = ['0.5', '0.5'];
    }

    let clobTokenIds: string[] = [];
    try {
      clobTokenIds = typeof raw.clobTokenIds === 'string' ? JSON.parse(raw.clobTokenIds) : (raw.clobTokenIds || []);
    } catch {
      clobTokenIds = [];
    }

    return {
      id: raw.id,
      question: raw.question,
      conditionId: raw.conditionId,
      slug: raw.slug,
      description: raw.description || '',
      outcomes,
      outcomePrices,
      volume: raw.volumeNum || parseFloat(raw.volume) || 0,
      volume24hr: raw.volume24hr || 0,
      volume1wk: raw.volume1wk || 0,
      volume1mo: raw.volume1mo || 0,
      liquidity: raw.liquidityNum || parseFloat(raw.liquidity) || 0,
      active: raw.active,
      closed: raw.closed,
      endDate: raw.endDate,
      image: raw.image,
      icon: raw.icon,
      category: raw.category,
      bestBid: raw.bestBid,
      bestAsk: raw.bestAsk,
      lastTradePrice: raw.lastTradePrice,
      oneDayPriceChange: raw.oneDayPriceChange,
      oneWeekPriceChange: raw.oneWeekPriceChange,
      clobTokenIds,
      events: raw.events
    };
  }

  /**
   * Format market for display (Telegram, etc.)
   */
  formatMarketSummary(market: PolymarketMarket): string {
    const prices = market.outcomePrices.map(p => parseFloat(p));
    const yesPrice = prices[0] || 0;
    const noPrice = prices[1] || 0;

    const priceChange = market.oneDayPriceChange || 0;
    const changeEmoji = priceChange > 0 ? '📈' : priceChange < 0 ? '📉' : '➖';
    const changeStr = priceChange !== 0 ? ` (${priceChange > 0 ? '+' : ''}${(priceChange * 100).toFixed(1)}%)` : '';

    return [
      `📊 *${this.escapeMarkdown(market.question)}*`,
      '',
      `✅ Yes: ${(yesPrice * 100).toFixed(1)}¢`,
      `❌ No: ${(noPrice * 100).toFixed(1)}¢`,
      `${changeEmoji} 24h${changeStr}`,
      '',
      `💰 Volume 24h: $${this.formatNumber(market.volume24hr)}`,
      `💧 Liquidity: $${this.formatNumber(market.liquidity)}`,
      `📅 Ends: ${new Date(market.endDate).toLocaleDateString()}`
    ].join('\n');
  }

  /**
   * Format number for display
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(0);
  }

  /**
   * Escape markdown special characters
   */
  escapeMarkdown(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  /**
   * Get Polymarket URL for a market
   */
  getMarketUrl(market: PolymarketMarket): string {
    return `https://polymarket.com/event/${market.slug}`;
  }

  /**
   * Get attribution
   */
  getAttribution() {
    return {
      text: 'Powered by Polymarket',
      url: 'https://polymarket.com'
    };
  }
}

// Export singleton instance
export const polymarketService = new PolymarketService();
