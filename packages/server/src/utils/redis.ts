/**
 * FundTracer Redis Client
 * Unified Redis wrapper using @upstash/redis
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
let isConnected = false;

export async function initRedis(): Promise<Redis | null> {
  if (redis) return redis;
  
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.log('[Redis] REDIS_URL not set, using in-memory fallback');
    return null;
  }
  
  try {
    const redisToken = process.env.REDIS_TOKEN;
    
    if (!redisToken) {
      console.log('[Redis] REDIS_TOKEN not set, using in-memory fallback');
      return null;
    }
    
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
      enableAutoPipelining: true,
    });
    
    // Test connection
    await redis.ping();
    isConnected = true;
    console.log('[Redis] Connected to Upstash');
    
    return redis;
  } catch (error) {
    console.error('[Redis] Failed to connect:', error);
    redis = null;
    isConnected = false;
    return null;
  }
}

export function getRedis(): Redis | null {
  return redis;
}

export function isRedisConnected(): boolean {
  return isConnected;
}

// In-memory fallback for when Redis is unavailable
const memoryFallback = new Map<string, { value: string; expires: number }>();

export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 60
): Promise<T> {
  if (redis && isConnected) {
    try {
      const cached = await redis.get<string>(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      console.error('[Redis] Get error:', error);
    }
  }
  
  // Memory fallback
  const memEntry = memoryFallback.get(key);
  if (memEntry && memEntry.expires > Date.now()) {
    try {
      return JSON.parse(memEntry.value) as T;
    } catch {
      memoryFallback.delete(key);
    }
  }
  
  const data = await fetcher();
  
  // Store in Redis
  if (redis && isConnected) {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (error) {
      console.error('[Redis] Set error:', error);
    }
  }
  
  // Store in memory fallback
  memoryFallback.set(key, {
    value: JSON.stringify(data),
    expires: Date.now() + ttlSeconds * 1000
  });
  
  return data;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (redis && isConnected) {
    try {
      const cached = await redis.get<string>(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      console.error('[Redis] Get error:', error);
    }
  }
  
  // Memory fallback
  const memEntry = memoryFallback.get(key);
  if (memEntry && memEntry.expires > Date.now()) {
    try {
      return JSON.parse(memEntry.value) as T;
    } catch {
      memoryFallback.delete(key);
    }
  }
  
  return null;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number = 60): Promise<void> {
  const serialized = JSON.stringify(value);
  
  if (redis && isConnected) {
    try {
      await redis.setex(key, ttlSeconds, serialized);
    } catch (error) {
      console.error('[Redis] Set error:', error);
    }
  }
  
  // Memory fallback
  memoryFallback.set(key, {
    value: serialized,
    expires: Date.now() + ttlSeconds * 1000
  });
}

export async function cacheDel(key: string): Promise<void> {
  if (redis && isConnected) {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('[Redis] Del error:', error);
    }
  }
  
  memoryFallback.delete(key);
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (redis && isConnected) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.error('[Redis] Del pattern error:', error);
    }
  }
  
  // Memory fallback - simple prefix match
  const prefix = pattern.replace('*', '');
  for (const key of Array.from(memoryFallback.keys())) {
    if (key.startsWith(prefix)) {
      memoryFallback.delete(key);
    }
  }
}

// Hash operations for Telegram data
export async function hset(hash: string, key: string, value: any): Promise<void> {
  if (redis && isConnected) {
    try {
      await redis.hset(hash, { [key]: JSON.stringify(value) });
    } catch (error) {
      console.error('[Redis] Hset error:', error);
    }
  }
}

export async function hget<T>(hash: string, key: string): Promise<T | null> {
  if (redis && isConnected) {
    try {
      const value = await redis.hget<string>(hash, key);
      if (value) {
        return JSON.parse(value) as T;
      }
    } catch (error) {
      console.error('[Redis] Hget error:', error);
    }
  }
  return null;
}

export async function hgetall<T>(hash: string): Promise<Record<string, T> | null> {
  if (redis && isConnected) {
    try {
      const data = await redis.hgetall<Record<string, string>>(hash);
      if (data) {
        const result: Record<string, T> = {};
        for (const [k, v] of Object.entries(data)) {
          try {
            result[k] = JSON.parse(v) as T;
          } catch {
            // skip invalid entries
          }
        }
        return result;
      }
    } catch (error) {
      console.error('[Redis] Hgetall error:', error);
    }
  }
  return null;
}

export async function hdel(hash: string, ...keys: string[]): Promise<void> {
  if (redis && isConnected) {
    try {
      await redis.hdel(hash, ...keys);
    } catch (error) {
      console.error('[Redis] Hdel error:', error);
    }
  }
}

export async function sadd(set: string, ...members: string[]): Promise<void> {
  if (redis && isConnected) {
    try {
      await redis.sadd(set, ...members);
    } catch (error) {
      console.error('[Redis] Sadd error:', error);
    }
  }
}

export async function smembers(set: string): Promise<string[]> {
  if (redis && isConnected) {
    try {
      return await redis.smembers(set);
    } catch (error) {
      console.error('[Redis] Smembers error:', error);
    }
  }
  return [];
}

export async function zadd(sortedSet: string, score: number, member: string): Promise<void> {
  if (redis && isConnected) {
    try {
      await redis.zadd(sortedSet, { score, member });
    } catch (error) {
      console.error('[Redis] Zadd error:', error);
    }
  }
}

export async function zrange(sortedSet: string, min: number, max: number): Promise<string[]> {
  if (redis && isConnected) {
    try {
      return await redis.zrange(sortedSet, min, max);
    } catch (error) {
      console.error('[Redis] Zrange error:', error);
    }
  }
  return [];
}

export async function zrevrange(sortedSet: string, min: number, max: number): Promise<string[]> {
  if (redis && isConnected) {
    try {
      return await redis.zrevrange(sortedSet, min, max);
    } catch (error) {
      console.error('[Redis] Zrevrange error:', error);
    }
  }
  return [];
}

export async function incr(key: string): Promise<number> {
  if (redis && isConnected) {
    try {
      return await redis.incr(key);
    } catch (error) {
      console.error('[Redis] Incr error:', error);
    }
  }
  return 0;
}

export async function expire(key: string, seconds: number): Promise<void> {
  if (redis && isConnected) {
    try {
      await redis.expire(key, seconds);
    } catch (error) {
      console.error('[Redis] Expire error:', error);
    }
  }
}

// Cleanup memory fallback periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(memoryFallback.entries())) {
    if (entry.expires < now) {
      memoryFallback.delete(key);
    }
  }
}, 60000);

export async function closeRedis(): Promise<void> {
  redis = null;
  isConnected = false;
  memoryFallback.clear();
}