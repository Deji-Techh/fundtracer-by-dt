import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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

// Optimized config for aggressive caching and prefetching
const POLLING_CONFIG = {
  refetchInterval: 15000, // 15 seconds = 4 calls/min per query
  staleTime: 300000,      // 5 minutes - data stays fresh longer
  gcTime: 600000,         // 10 minutes - keep in cache longer
  retry: 3,
  retryDelay: 1000,
  suspense: true,         // Enable suspense mode for better loading states
  placeholderData: (previousData: any) => previousData, // Show cached data while loading
};

// Prefetch trending pools for a chain
export const usePrefetchTrendingPools = (chainKey: ChainKey) => {
  const queryClient = useQueryClient();
  const network = CHAIN_CONFIG[chainKey].id;

  useEffect(() => {
    // Prefetch on mount if not already in cache
    queryClient.prefetchQuery({
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
      staleTime: 300000, // 5 minutes
    });
  }, [chainKey, network, queryClient]);
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

// Search pools (DEX Screener) - uses backend proxy to avoid CORS
export const usePoolSearch = (query: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.search(query),
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      const response = await fetch(
        `/api/dexscreener/search?q=${encodeURIComponent(query)}`,
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

      if (!data?.pairs || !Array.isArray(data.pairs)) {
        console.warn('[usePoolSearch] Invalid search response:', data);
        return [];
      }

      return data.pairs || [];
    },
    enabled: query.length >= 2,
    staleTime: 30000,
    gcTime: 60000,
  });
};

// Countdown hook for refresh timer
import { useState } from 'react';

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
