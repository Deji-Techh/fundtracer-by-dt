import { cache } from '../utils/cache.js';

const GECKOTERMINAL_BASE_URL = 'https://api.geckoterminal.com/api/v2';

// Chain ID mapping from FundTracer to GeckoTerminal
const CHAIN_MAP: Record<string, string> = {
  'ethereum': 'eth',
  'linea': 'linea',
  'polygon': 'polygon_pos',
  'arbitrum': 'arbitrum',
  'optimism': 'optimism',
  'base': 'base',
  'bsc': 'bsc',
  'avalanche': 'avalanche',
  'solana': 'solana',
  'fantom': 'fantom',
  'cronos': 'cronos',
  'gnosis': 'gnosis',
  'moonbeam': 'moonbeam',
  'moonriver': 'moonriver',
  'harmony': 'harmony',
  'metis': 'metis',
  'aurora': 'aurora',
  'klaytn': 'klaytn',
  'celo': 'celo',
  'heco': 'heco',
  'okex': 'okex',
  'kcc': 'kcc',
  'dogechain': 'dogechain',
};

export class GeckoTerminalService {
  // Get trending pools for a network
  async getTrendingPools(network: string, limit: number = 20) {
    const cacheKey = `geckoterminal:trending-pools:${network}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${GECKOTERMINAL_BASE_URL}/networks/${network}/trending_pools`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GeckoTerminal API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 300);
      return data;
    } catch (error) {
      console.error('[GeckoTerminalService] Error fetching trending pools:', error);
      throw error;
    }
  }

  // Get OHLCV data for a pool
  async getPoolOHLCV(
    network: string,
    poolAddress: string,
    timeframe: 'minute' | 'hour' | 'day' = 'hour',
    aggregate: string = '1',
    limit: number = 100
  ) {
    const cacheKey = `geckoterminal:ohlcv:${network}:${poolAddress}:${timeframe}:${aggregate}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${GECKOTERMINAL_BASE_URL}/networks/${network}/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GeckoTerminal API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 30);
      return data;
    } catch (error) {
      console.error('[GeckoTerminalService] Error fetching OHLCV:', error);
      throw error;
    }
  }

  // Get trades for a pool
  async getPoolTrades(network: string, poolAddress: string, limit: number = 50) {
    const cacheKey = `geckoterminal:trades:${network}:${poolAddress}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${GECKOTERMINAL_BASE_URL}/networks/${network}/pools/${poolAddress}/trades?limit=${limit}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GeckoTerminal API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 15);
      return data;
    } catch (error) {
      console.error('[GeckoTerminalService] Error fetching trades:', error);
      throw error;
    }
  }

  // Get pool details
  async getPoolDetails(network: string, poolAddress: string) {
    const cacheKey = `geckoterminal:pool:${network}:${poolAddress}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${GECKOTERMINAL_BASE_URL}/networks/${network}/pools/${poolAddress}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GeckoTerminal API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 300);
      return data;
    } catch (error) {
      console.error('[GeckoTerminalService] Error fetching pool details:', error);
      throw error;
    }
  }

  // Normalize chain ID to GeckoTerminal format
  private normalizeChainId(chainId: string): string {
    return CHAIN_MAP[chainId.toLowerCase()] || chainId.toLowerCase();
  }

  // Get cached data if API fails
  getCachedData(key: string) {
    return cache.get(key);
  }

  // Check if data exists in cache
  hasCachedData(key: string): boolean {
    return cache.has(key);
  }

  // Attribution
  getAttribution() {
    return {
      text: 'Powered by GeckoTerminal',
      url: 'https://geckoterminal.com',
    };
  }
}

export const geckoTerminalService = new GeckoTerminalService();
