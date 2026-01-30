import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const CACHE_PREFIX = 'fundtracer_cache_';
const DEFAULT_TTL = 1000 * 60 * 30; // 30 minutes

export function useLocalCache<T>(key: string, ttl: number = DEFAULT_TTL) {
  const [cachedData, setCachedData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fullKey = `${CACHE_PREFIX}${key}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(fullKey);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (entry.expiresAt > Date.now()) {
          setCachedData(entry.data);
        } else {
          localStorage.removeItem(fullKey);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsLoading(false);
  }, [fullKey]);

  const setCache = useCallback(
    (data: T) => {
      try {
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl,
        };
        localStorage.setItem(fullKey, JSON.stringify(entry));
        setCachedData(data);
      } catch {
        // localStorage might be full
      }
    },
    [fullKey, ttl]
  );

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(fullKey);
      setCachedData(null);
    } catch {
      // Ignore errors
    }
  }, [fullKey]);

  return { data: cachedData, setCache, clearCache, isLoading };
}

// Utility to clear all FundTracer cache
export function clearAllCache() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore errors
  }
}

export default useLocalCache;
