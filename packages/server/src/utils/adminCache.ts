// Simple in-memory cache for admin dashboard endpoints
// Reduces Firestore read costs by caching responses for short periods

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 60_000; // 60 seconds

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttl: number = DEFAULT_TTL): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
  // Auto-cleanup: keep cache under 100 entries
  if (cache.size > 100) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    cache.forEach((entry, key) => {
      if (entry.expiresAt < oldestTime) {
        oldestTime = entry.expiresAt;
        oldestKey = key;
      }
    });
    if (oldestKey) cache.delete(oldestKey);
  }
}

export function clearCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }
  cache.forEach((_, key) => {
    if (key.includes(pattern)) cache.delete(key);
  });
}

export function adminCacheMiddleware(ttl: number = DEFAULT_TTL) {
  return (req: any, res: any, next: any) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();
    
    const cacheKey = `admin:${req.originalUrl}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (data: unknown) => {
      setCache(cacheKey, data, ttl);
      return originalJson(data);
    };
    next();
  };
}
