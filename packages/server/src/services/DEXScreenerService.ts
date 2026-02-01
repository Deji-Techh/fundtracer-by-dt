import { cache } from '../utils/cache.js';

const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com';

// Chain ID mapping from FundTracer to DEX Screener
const CHAIN_MAP: Record<string, string> = {
  'ethereum': 'ethereum',
  'linea': 'linea',
  'polygon': 'polygon',
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

export class DEXScreenerService {
  // Get latest token profiles (for hero section)
  async getLatestTokenProfiles() {
    const cacheKey = 'dexscreener:latest-profiles';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${DEXSCREENER_BASE_URL}/token-profiles/latest/v1`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DEX Screener API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 300); // 5 minute cache
      return data;
    } catch (error) {
      console.error('[DEXScreenerService] Error fetching latest profiles:', error);
      throw error;
    }
  }

  // Get top boosted tokens (for trending)
  async getTopBoostedTokens() {
    const cacheKey = 'dexscreener:top-boosted';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${DEXSCREENER_BASE_URL}/token-boosts/top/v1`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DEX Screener API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 300); // 5 minute cache
      return data;
    } catch (error) {
      console.error('[DEXScreenerService] Error fetching top boosted:', error);
      throw error;
    }
  }

  // Get top pairs by searching for popular tokens
  async getTopPairs(limit: number = 100) {
    const cacheKey = `dexscreener:top-pairs:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Search for common terms to get top pairs
      // Using "SOL" as a search term typically returns top Solana tokens
      const searchQueries = ['SOL', 'ETH', 'BSC', 'USDC', 'USDT'];
      const allPairs: any[] = [];
      const seenPairs = new Set();

      for (const query of searchQueries) {
        try {
          const response = await fetch(
            `${DEXSCREENER_BASE_URL}/latest/dex/search?q=${encodeURIComponent(query)}`,
            {
              headers: {
                'Accept': 'application/json',
              },
            }
          );

          if (!response.ok) continue;

          const data = await response.json();
          
          if (data.pairs && Array.isArray(data.pairs)) {
            data.pairs.forEach((pair: any) => {
              const key = `${pair.chainId}-${pair.pairAddress}`;
              if (!seenPairs.has(key)) {
                seenPairs.add(key);
                allPairs.push(pair);
              }
            });
          }

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`[DEXScreenerService] Error searching for ${query}:`, err);
        }
      }

      // Sort by volume and take top pairs
      const sortedPairs = allPairs
        .sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
        .slice(0, limit);

      cache.set(cacheKey, sortedPairs, 300); // 5 minute cache
      return sortedPairs;
    } catch (error) {
      console.error('[DEXScreenerService] Error fetching top pairs:', error);
      throw error;
    }
  }

  // Search across DEX pairs
  async searchPairs(query: string) {
    const cacheKey = `dexscreener:search:${query.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${DEXSCREENER_BASE_URL}/latest/dex/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DEX Screener API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 60); // 1 minute cache for search
      return data;
    } catch (error) {
      console.error('[DEXScreenerService] Error searching pairs:', error);
      throw error;
    }
  }

  // Get token details by chain and address
  async getTokenDetails(chainId: string, tokenAddress: string) {
    const normalizedChain = CHAIN_MAP[chainId.toLowerCase()] || chainId.toLowerCase();
    const cacheKey = `dexscreener:token:${normalizedChain}:${tokenAddress.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${DEXSCREENER_BASE_URL}/tokens/v1/${normalizedChain}/${tokenAddress}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DEX Screener API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 300); // 5 minute cache
      return data;
    } catch (error) {
      console.error('[DEXScreenerService] Error fetching token details:', error);
      throw error;
    }
  }

  // Get token pairs (for market table)
  async getTokenPairs(chainId: string, tokenAddress: string) {
    const normalizedChain = CHAIN_MAP[chainId.toLowerCase()] || chainId.toLowerCase();
    const cacheKey = `dexscreener:pairs:${normalizedChain}:${tokenAddress.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${DEXSCREENER_BASE_URL}/token-pairs/v1/${normalizedChain}/${tokenAddress}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DEX Screener API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 300); // 5 minute cache
      return data;
    } catch (error) {
      console.error('[DEXScreenerService] Error fetching token pairs:', error);
      throw error;
    }
  }

  // Get pair details (for charts and detailed info)
  async getPairDetails(chainId: string, pairId: string) {
    const normalizedChain = CHAIN_MAP[chainId.toLowerCase()] || chainId.toLowerCase();
    const cacheKey = `dexscreener:pair:${normalizedChain}:${pairId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${DEXSCREENER_BASE_URL}/latest/dex/pairs/${normalizedChain}/${pairId}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DEX Screener API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 300); // 5 minute cache
      return data;
    } catch (error) {
      console.error('[DEXScreenerService] Error fetching pair details:', error);
      throw error;
    }
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
      text: 'Powered by DEX Screener',
      url: 'https://dexscreener.com',
    };
  }
}

export const dexScreenerService = new DEXScreenerService();
