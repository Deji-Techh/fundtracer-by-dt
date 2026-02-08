import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyzeWallet, compareWallets, analyzeContract } from '../api';
import type { AnalysisResult, MultiWalletResult } from '@fundtracer/core';

// Query keys for cache management
export const queryKeys = {
  wallet: (address: string, chain: string) => ['wallet', address, chain] as const,
  wallets: (addresses: string[]) => ['wallets', addresses] as const,
  contract: (address: string, chain: string) => ['contract', address, chain] as const,
  portfolio: (address: string) => ['portfolio', address] as const,
  transactions: (address: string, page: number) => ['transactions', address, page] as const,
};

// Hook for analyzing a single wallet
export function useWalletAnalysis(address: string, chain: string, options = {}) {
  return useQuery({
    queryKey: queryKeys.wallet(address, chain),
    queryFn: async () => {
      if (!address) throw new Error('Address is required');
      const result = await analyzeWallet(address, chain as any);
      return result;
    },
    // Don't run if no address
    enabled: !!address && address.length > 0,
    // Cache for 2 minutes (wallet data changes frequently)
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

// Hook for comparing multiple wallets
export function useWalletComparison(addresses: string[], options = {}) {
  return useQuery({
    queryKey: queryKeys.wallets(addresses),
    queryFn: async () => {
      if (!addresses.length) throw new Error('At least one address is required');
      const result = await compareWallets(addresses);
      return result;
    },
    enabled: addresses.length > 0,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

// Hook for analyzing a contract
export function useContractAnalysis(address: string, chain: string, options = {}) {
  return useQuery({
    queryKey: queryKeys.contract(address, chain),
    queryFn: async () => {
      if (!address) throw new Error('Contract address is required');
      const result = await analyzeContract(address, chain as any);
      return result;
    },
    enabled: !!address && address.length > 0,
    // Contract data doesn't change as frequently
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// Hook for prefetching wallet data (useful for search suggestions)
export function usePrefetchWallet() {
  const queryClient = useQueryClient();
  
  return (address: string, chain: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.wallet(address, chain),
      queryFn: () => analyzeWallet(address, chain as any),
      staleTime: 2 * 60 * 1000,
    });
  };
}

// Hook for invalidating wallet cache (after transactions)
export function useInvalidateWallet() {
  const queryClient = useQueryClient();
  
  return (address: string, chain: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.wallet(address, chain),
    });
  };
}

// Mutation hook for refreshing wallet data
export function useRefreshWallet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ address, chain }: { address: string; chain: string }) => {
      const result = await analyzeWallet(address, chain as any);
      return result;
    },
    onSuccess: (data, variables) => {
      // Update cache with fresh data
      queryClient.setQueryData(
        queryKeys.wallet(variables.address, variables.chain),
        data
      );
    },
  });
}

export default {
  useWalletAnalysis,
  useWalletComparison,
  useContractAnalysis,
  usePrefetchWallet,
  useInvalidateWallet,
  useRefreshWallet,
};
