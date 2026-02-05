import { cache } from './cache.js';

/**
 * Fetch wrapper with retry logic and automatic fallback
 */
export async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error;
      console.warn(`[fetchWithRetry] Attempt ${attempt + 1}/${retries} failed:`, error.message);
      
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
  }
  
  throw lastError;
}

/**
 * Safe fetch that returns null instead of throwing
 */
export async function safeFetch(url, options = {}) {
  try {
    return await fetchWithRetry(url, options);
  } catch (error) {
    console.error('[safeFetch] Failed:', error.message);
    return null;
  }
}

/**
 * Fetch with cache
 */
export async function fetchWithCache(url, options = {}, cacheKey, ttlSeconds = 30) {
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch fresh data
  const data = await safeFetch(url, options);
  
  if (data) {
    cache.set(cacheKey, data, ttlSeconds);
  }
  
  return data;
}

/**
 * GeckoTerminal API client
 */
export const geckoTerminal = {
  async getOHLCV(network, poolAddress, timeframe = 'hour', aggregate = '1') {
    const url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=100`;
    const cacheKey = `gt:ohlcv:${network}:${poolAddress}:${timeframe}:${aggregate}`;
    
    return fetchWithCache(url, {}, cacheKey, cache.TTL?.OHLCV || 30);
  },
  
  async getTrades(network, poolAddress, limit = 50) {
    const url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${poolAddress}/trades?limit=${limit}`;
    const cacheKey = `gt:trades:${network}:${poolAddress}:${limit}`;
    
    return fetchWithCache(url, {}, cacheKey, cache.TTL?.TRADES || 10);
  },
  
  async getTopPools(network) {
    // Try trending pools endpoint first, fallback to pools list if needed
    try {
      const url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools?page=1&limit=10`;
      const cacheKey = `gt:pools:${network}`;
      
      const response = await fetchWithCache(url, {}, cacheKey, cache.TTL?.POOLS || 60);
      
      if (response && response.data) {
        return {
          data: response.data,
          success: true
        };
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.warn(`[GeckoTerminal] Failed to fetch top pools for ${network}:`, error);
      // Return empty data to prevent crashes
      return {
        data: [],
        success: false,
        error: error.message
      };
    }
  }
};

/**
 * DexScreener API client (fallback)
 */
export const dexScreener = {
  async getPair(chain, pairAddress) {
    const url = `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pairAddress}`;
    const cacheKey = `ds:pair:${chain}:${pairAddress}`;
    
    return fetchWithCache(url, {}, cacheKey, cache.TTL?.OHLCV || 30);
  },
  
  async search(query) {
    const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
    const cacheKey = `ds:search:${query}`;
    
    return fetchWithCache(url, {}, cacheKey, cache.TTL?.SEARCH || 30);
  }
};
