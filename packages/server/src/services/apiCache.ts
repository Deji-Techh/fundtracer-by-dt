/**
 * FundTracer API Cache Service
 * In-memory caching with optional Redis support
 * Falls back to in-memory if Redis is unavailable
 */

// In-memory cache
const memoryCache = new Map<string, { value: string; expires: number }>();

// Check if Redis is available
let isRedisAvailable = false;
let redisClient: any = null;

async function connectRedis() {
  if (!process.env.REDIS_URL) {
    return null;
  }
  
  try {
    const { createClient } = await import('redis');
    const client = createClient({ url: process.env.REDIS_URL });
    await client.connect();
    isRedisAvailable = true;
    return client;
  } catch {
    isRedisAvailable = false;
    return null;
  }
}

// Cache TTLs in seconds
export const CACHE_TTL = {
  ADDRESS_INFO: 30,
  TRANSACTIONS: 10,
  TOKEN_BALANCES: 30,
  NFT_HOLDINGS: 300,
  RISK_SCORE: 60,
  GRAPH_DATA: 60,
  ENTITY_LABELS: 300,
  CHAIN_INFO: 3600,
} as const;

// Initialize cache
export async function initializeCache(): Promise<void> {
  if (process.env.REDIS_URL) {
    redisClient = await connectRedis();
    if (redisClient) {
      console.log('[Cache] Connected to Redis');
    } else {
      console.log('[Cache] Using in-memory cache');
    }
  } else {
    console.log('[Cache] Using in-memory cache');
  }
}

// Check if cache is available
export function isCacheAvailable(): boolean {
  return true;
}

// Get from cache
export async function cacheGet<T>(key: string): Promise<T | null> {
  // Try memory cache first
  const memEntry = memoryCache.get(key);
  if (memEntry) {
    if (memEntry.expires > Date.now()) {
      try {
        return JSON.parse(memEntry.value) as T;
      } catch {
        memoryCache.delete(key);
      }
    } else {
      memoryCache.delete(key);
    }
  }
  
  // Try Redis if available
  if (isRedisAvailable && redisClient) {
    try {
      const data = await redisClient.get(key);
      if (data) {
        memoryCache.set(key, { value: data, expires: Date.now() + 60000 });
        return JSON.parse(data) as T;
      }
    } catch (error) {
      console.error('[Cache] Redis get error:', error);
    }
  }
  
  return null;
}

// Set in cache with TTL
export async function cacheSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  const data = JSON.stringify(value);
  const ttl = ttlSeconds || 60;
  
  memoryCache.set(key, { value: data, expires: Date.now() + ttl * 1000 });
  
  if (isRedisAvailable && redisClient) {
    try {
      await redisClient.setEx(key, ttl, data);
    } catch (error) {
      console.error('[Cache] Redis set error:', error);
    }
  }
}

// Delete from cache
export async function cacheDel(key: string): Promise<void> {
  memoryCache.delete(key);
  
  if (isRedisAvailable && redisClient) {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('[Cache] Redis delete error:', error);
    }
  }
}

// Delete keys by pattern (Redis only)
export async function cacheDelPattern(pattern: string): Promise<void> {
  const patternRegex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  const keysToDelete: string[] = [];
  
  memoryCache.forEach((_, key) => {
    if (patternRegex.test(key)) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => memoryCache.delete(key));
  
  if (isRedisAvailable && redisClient) {
    try {
      const redisKeys = await redisClient.keys(pattern);
      if (redisKeys.length > 0) {
        await redisClient.del(redisKeys);
      }
    } catch (error) {
      console.error('[Cache] Redis delete pattern error:', error);
    }
  }
}

// Get or set from cache
export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  const data = await fetcher();
  await cacheSet(key, data, ttlSeconds);
  
  return data;
}

// Invalidate address-related cache
export async function invalidateAddressCache(address: string, chain: string): Promise<void> {
  const prefix = `api:${chain}:${address.toLowerCase()}`;
  await cacheDelPattern(`${prefix}*`);
}

// Close cache connection
export async function closeCache(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  memoryCache.clear();
  isRedisAvailable = false;
}

// Cache stats
export async function getCacheStats(): Promise<{
  connected: boolean;
  backend: string;
  keys: number;
}> {
  return {
    connected: true,
    backend: isRedisAvailable ? 'redis' : 'memory',
    keys: memoryCache.size,
  };
}

// Build cache key helper
export function buildCacheKey(...parts: (string | number)[]): string {
  return `api:${parts.join(':')}`;
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(memoryCache.entries());
  entries.forEach(([key, entry]) => {
    if (entry.expires < now) {
      memoryCache.delete(key);
    }
  });
}, 60000);
