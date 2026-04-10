/**
 * FundTracer API Cache Service
 * Uses @upstash/redis for persistent caching
 */

import { initRedis, cacheGet, cacheSet, cacheDel, cacheDelPattern, isRedisConnected } from '../utils/redis';

// In-memory cache (fallback when Redis unavailable)
const memoryCache = new Map<string, { value: string; expires: number }>();

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
  await initRedis();
  const connected = isRedisConnected();
  console.log(connected ? '[Cache] Redis connected via Upstash' : '[Cache] Using in-memory fallback');
}

// Check if cache is available
export function isCacheAvailable(): boolean {
  return true;
}

// Get from cache
export async function cacheGetCached<T>(key: string): Promise<T | null> {
  // Try Redis first
  const redisResult = await cacheGet<T>(key);
  if (redisResult !== null) {
    return redisResult;
  }
  
  // Fallback to memory
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
  
  return null;
}

// Set in cache with TTL
export async function cacheSetCached<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  const data = JSON.stringify(value);
  const ttl = ttlSeconds || 60;
  
  // Set in Redis with stringified value
  await cacheSet(key, data, ttl);
  
  // Also update memory fallback directly
  memoryCache.set(key, { value: data, expires: Date.now() + ttl * 1000 });
}

// Delete from cache
export async function cacheDelCached(key: string): Promise<void> {
  await cacheDel(key);
  memoryCache.delete(key);
}

// Delete keys by pattern
export async function cacheDelPatternCached(pattern: string): Promise<void> {
  await cacheDelPattern(pattern);
  
  // Memory fallback cleanup
  const patternRegex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  const keysToDelete: string[] = [];
  memoryCache.forEach((_, key) => {
    if (patternRegex.test(key)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => memoryCache.delete(key));
}

// Get or set from cache
export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  const cached = await cacheGetCached<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  const data = await fetcher();
  await cacheSetCached(key, data, ttlSeconds);
  
  return data;
}

// Invalidate address-related cache
export async function invalidateAddressCache(address: string, chain: string): Promise<void> {
  const prefix = `api:${chain}:${address.toLowerCase()}`;
  await cacheDelPatternCached(`${prefix}*`);
}

// Close cache connection - handled by redis.ts
export async function closeCache(): Promise<void> {
  memoryCache.clear();
}

// Cache stats
export async function getCacheStats(): Promise<{
  connected: boolean;
  backend: string;
  keys: number;
}> {
  return {
    connected: isRedisConnected(),
    backend: isRedisConnected() ? 'redis' : 'memory',
    keys: memoryCache.size,
  };
}

// Build cache key helper
export function buildCacheKey(...parts: (string | number)[]): string {
  return `api:${parts.join(':')}`;
}

// Cleanup expired memory entries every minute
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(memoryCache.entries());
  entries.forEach(([key, entry]) => {
    if (entry.expires < now) {
      memoryCache.delete(key);
    }
  });
}, 60000);

// Re-export functions with original names for backward compatibility
export { cacheGet as cacheGetOld, cacheSet as cacheSetOld, cacheDel as cacheDelOld, cacheDelPattern as cacheDelPatternOld };
