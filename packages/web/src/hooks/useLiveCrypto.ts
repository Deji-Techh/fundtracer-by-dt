import { useQuery } from '@tanstack/react-query';
import {
  CHAIN_CONFIG,
  ChainKey,
  getTrendingPoolsUrl,
  getPoolOHLCVUrl,
  getPoolTradesUrl,
} from '../config/chains';

// Query keys
export const QUERY_KEYS = {
  trendingPools: (chain: ChainKey) => ['trendingPools', chain],
  poolOHLCV: (chain: ChainKey, pool: string, timeframe: string) => 
    ['poolOHLCV', chain, pool, timeframe],
  poolTrades: (chain: ChainKey, pool: string) => ['poolTrades', chain, pool],
  search: (query: string) => ['search', query],
};

// Smart polling config (stay within 30 calls/min limit)
const POLLING_CONFIG = {
  refetchInterval: 15000, // 15 seconds = 4 calls/min per query
  staleTime: 10000,       // 10 seconds
  gcTime: 60000,          // 1 minute (garbage collection time, was cacheTime in v4)
  retry: 3,
  retryDelay: 1000,
};

// Fetch trending pools for a chain
export const useTrendingPools = (chainKey: ChainKey) => {
  const network = CHAIN_CONFIG[chainKey].id;
  
  return useQuery({
    queryKey: QUERY_KEYS.trendingPools(chainKey),
    queryFn: async () => {
      const response = await fetch(getTrendingPoolsUrl(network), {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trending pools: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || [];
    },
    ...POLLING_CONFIG,
    enabled: !!chainKey,
  });
};

// Fetch OHLCV data for a pool
export const usePoolOHLCV = (
  chainKey: ChainKey, 
  poolAddress: string, 
  timeframe: 'minute' | 'hour' | 'day' = 'hour'
) => {
  const network = CHAIN_CONFIG[chainKey].id;
  
  return useQuery({
    queryKey: QUERY_KEYS.poolOHLCV(chainKey, poolAddress, timeframe),
    queryFn: async () => {
      const response = await fetch(
        getPoolOHLCVUrl(network, poolAddress, timeframe),
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch OHLCV: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        attributes: data.data?.attributes,
        ohlcv: data.data?.attributes?.ohlcv_list || [],
      };
    },
    ...POLLING_CONFIG,
    enabled: !!chainKey && !!poolAddress,
  });
};

// Fetch trades for a pool
export const usePoolTrades = (chainKey: ChainKey, poolAddress: string) => {
  const network = CHAIN_CONFIG[chainKey].id;
  
  return useQuery({
    queryKey: QUERY_KEYS.poolTrades(chainKey, poolAddress),
    queryFn: async () => {
      const response = await fetch(getPoolTradesUrl(network, poolAddress), {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trades: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || [];
    },
    ...POLLING_CONFIG,
    enabled: !!chainKey && !!poolAddress,
  });
};

// Search pools (DEX Screener)
export const usePoolSearch = (query: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.search(query),
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data.pairs || [];
    },
    enabled: query.length >= 2,
    staleTime: 30000, // 30 seconds for search
    gcTime: 60000,
  });
};

// Countdown hook for refresh timer
import { useState, useEffect } from 'react';

export const useRefreshCountdown = (refetchInterval: number = 15000) => {
  const [countdown, setCountdown] = useState(refetchInterval / 1000);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return refetchInterval / 1000;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [refetchInterval]);
  
  return countdown;
};
