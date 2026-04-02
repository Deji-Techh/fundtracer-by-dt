import { AnalysisResult } from '@fundtracer/core';

const RESULTS_CACHE_KEY = 'fundtracer_results_cache';

interface CachedResult {
  result: any;
  timestamp: number;
}

interface ResultsCache {
  wallet?: CachedResult;
  contract?: CachedResult;
  compare?: CachedResult;
}

const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export const getCachedResults = (): ResultsCache => {
  try {
    const cached = localStorage.getItem(RESULTS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as ResultsCache;
      // Filter out expired entries
      const now = Date.now();
      const filtered: ResultsCache = {};
      
      if (parsed.wallet && now - parsed.wallet.timestamp < CACHE_EXPIRY) {
        filtered.wallet = parsed.wallet;
      }
      if (parsed.contract && now - parsed.contract.timestamp < CACHE_EXPIRY) {
        filtered.contract = parsed.contract;
      }
      if (parsed.compare && now - parsed.compare.timestamp < CACHE_EXPIRY) {
        filtered.compare = parsed.compare;
      }
      
      return filtered;
    }
  } catch (e) {
    console.error('Failed to read results cache:', e);
  }
  return {};
};

export const saveResultToCache = (type: 'wallet' | 'contract' | 'compare', result: any): void => {
  try {
    const cached = getCachedResults();
    cached[type] = {
      result,
      timestamp: Date.now()
    };
    localStorage.setItem(RESULTS_CACHE_KEY, JSON.stringify(cached));
  } catch (e) {
    console.error('Failed to save result to cache:', e);
  }
};

export const getCachedResult = (type: 'wallet' | 'contract' | 'compare'): any | null => {
  const cached = getCachedResults();
  return cached[type]?.result || null;
};

export const clearResultsCache = (): void => {
  localStorage.removeItem(RESULTS_CACHE_KEY);
};
