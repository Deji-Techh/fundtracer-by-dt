import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { geckoTerminal, dexScreener } from '../lib/apiClient.js';
import { getChainConfig } from '../lib/chains.js';
import { cache } from '../lib/cache.js';

/**
 * Hook to fetch OHLCV chart data with automatic fallback to DexScreener
 */
export function usePoolChartData(chainId, poolAddress, timeframe = 'hour') {
  const chainConfig = getChainConfig(chainId);
  
  return useQuery({
    queryKey: ['chart', chainId, poolAddress, timeframe],
    queryFn: async () => {
      if (!poolAddress) return [];
      
      // Try GeckoTerminal first
      const gtData = await geckoTerminal.getOHLCV(
        chainConfig.gecko, 
        poolAddress, 
        timeframe
      );
      
      if (gtData?.data?.attributes?.ohlcv_list?.length > 0) {
        return gtData.data.attributes.ohlcv_list
          .filter(item => item != null && Array.isArray(item) && item.length >= 6)
          .map(item => ({
            time: item[0],
            open: item[1] ?? 0,
            high: item[2] ?? 0,
            low: item[3] ?? 0,
            close: item[4] ?? 0,
            volume: item[5] ?? 0
          }));
      }
      
      // Fallback to DexScreener
      const dsData = await dexScreener.getPair(chainConfig.dex, poolAddress);
      if (dsData?.pairs?.[0]?.priceUsd) {
        // DexScreener doesn't provide OHLCV directly, just current price
        // Return empty array - UI should show "No chart data available"
        return [];
      }
      
      return [];
    },
    enabled: !!poolAddress && !!chainId,
    refetchInterval: 15000, // 15 seconds
    staleTime: 10000,
    placeholderData: (prev) => prev,
  });
}

/**
 * Hook to fetch live trades
 */
export function useLiveTrades(chainId, poolAddress, limit = 50) {
  const chainConfig = getChainConfig(chainId);
  
  return useQuery({
    queryKey: ['trades', chainId, poolAddress],
    queryFn: async () => {
      if (!poolAddress) return [];
      
      const data = await geckoTerminal.getTrades(
        chainConfig.gecko, 
        poolAddress, 
        limit
      );
      
      if (!data?.data || !Array.isArray(data.data)) {
        return [];
      }
      
      return data.data
        .filter(item => item?.attributes != null)
        .map(item => ({
          id: item.id || `${Date.now()}-${Math.random()}`,
          timestamp: item.attributes?.block_timestamp || new Date().toISOString(),
          type: item.attributes?.kind === 'buy' ? 'buy' : 'sell',
          price: parseFloat(item.attributes?.price_to_usd) || 0,
          amount: parseFloat(item.attributes?.from_token_amount) || 0,
          usdValue: parseFloat(item.attributes?.volume_in_usd) || 0,
          fromAddress: item.attributes?.tx_from_address || '0x0000000000000000000000000000000000000000',
          txHash: item.attributes?.tx_hash || ''
        }));
    },
    enabled: !!poolAddress && !!chainId,
    refetchInterval: 10000, // 10 seconds
    staleTime: 5000,
    placeholderData: (prev) => prev,
  });
}

/**
 * Hook to fetch trending pools
 */
export function useTrendingPools(chainId, limit = 20) {
  const chainConfig = getChainConfig(chainId);
  
  return useQuery({
    queryKey: ['pools', chainId],
    queryFn: async () => {
      const data = await geckoTerminal.getTopPools(chainConfig.gecko);
      
      if (!data?.data || !Array.isArray(data.data)) {
        return [];
      }
      
      return data.data
        .filter(item => item?.attributes != null)
        .map(item => ({
          address: item.attributes?.address || '',
          name: item.attributes?.name || 'Unknown',
          symbol: `${item.attributes?.base_token_symbol || '???'}/${item.attributes?.quote_token_symbol || '???'}`,
          price: parseFloat(item.attributes?.base_token_price_usd) || 0,
          volume24h: parseFloat(item.attributes?.volume_usd?.h24) || 0,
          liquidity: parseFloat(item.attributes?.reserve_in_usd) || 0,
          priceChange24h: parseFloat(item.attributes?.price_change_percentage?.h24) || 0,
          logoUrl: item.attributes?.base_token_logo_url || ''
        }));
    },
    enabled: !!chainId,
    refetchInterval: 30000, // 30 seconds
    staleTime: 20000,
    placeholderData: (prev) => prev,
  });
}

/**
 * Hook for prefetching data
 */
export function usePrefetchPoolData(chainId, poolAddress) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (poolAddress && chainId) {
      queryClient.prefetchQuery({
        queryKey: ['chart', chainId, poolAddress, 'hour'],
        queryFn: async () => {
          const chainConfig = getChainConfig(chainId);
          const gtData = await geckoTerminal.getOHLCV(chainConfig.gecko, poolAddress, 'hour');
          if (gtData?.data?.attributes?.ohlcv_list?.length > 0) {
            return gtData.data.attributes.ohlcv_list
              .filter(item => item != null && Array.isArray(item) && item.length >= 6)
              .map(item => ({
                time: item[0],
                open: item[1] ?? 0,
                high: item[2] ?? 0,
                low: item[3] ?? 0,
                close: item[4] ?? 0,
                volume: item[5] ?? 0
              }));
          }
          return [];
        },
        staleTime: 30000
      });
    }
  }, [chainId, poolAddress, queryClient]);
}
