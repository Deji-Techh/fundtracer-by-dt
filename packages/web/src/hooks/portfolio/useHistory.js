import { useState, useEffect, useCallback, useRef } from 'react';
import { CHAINS } from '../../lib/chains.js';

export function useHistory(walletAddress) {
  const [chainTransactions, setChainTransactions] = useState({});
  const [chainErrors, setChainErrors] = useState({});
  const [loadingChains, setLoadingChains] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchChainTransactions = useCallback(async (chainId) => {
    if (!walletAddress) return null;

    try {
      setLoadingChains(prev => new Set([...prev, chainId]));

      const response = await fetch(
        `/api/proxy/ankr/txs/${chainId}/${walletAddress}`,
        { headers: { 'Cache-Control': 'no-cache' } }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ${chainId} transactions`);
      }

      const data = await response.json();

      if (mountedRef.current) {
        setChainTransactions(prev => ({
          ...prev,
          [chainId]: {
            transactions: data.transactions || [],
            pagination: data.pagination,
            timestamp: Date.now(),
          },
        }));
      }

      return data;
    } catch (error) {
      console.warn(`[useHistory] Failed to fetch ${chainId}:`, error);
      if (mountedRef.current) {
        setChainErrors(prev => ({ ...prev, [chainId]: error.message }));
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setLoadingChains(prev => {
          const next = new Set(prev);
          next.delete(chainId);
          return next;
        });
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    mountedRef.current = true;

    if (!walletAddress) {
      setChainTransactions({});
      setChainErrors({});
      setLoadingChains(new Set());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const chains = Object.keys(CHAINS);

    chains.forEach(chainId => {
      fetchChainTransactions(chainId);
    });

    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }, 3000);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [walletAddress, fetchChainTransactions]);

  const allTransactions = useState(() => {
    const txs = [];
    Object.entries(chainTransactions).forEach(([chainId, data]) => {
      const chainConfig = CHAINS[chainId];
      (data.transactions || []).forEach(tx => {
        txs.push({
          ...tx,
          chainId,
          chainName: chainConfig?.name,
          chainColor: chainConfig?.color,
        });
      });
    });
    return txs.sort((a, b) => b.timestamp - a.timestamp);
  })[0];

  const transactionsByChain = useState(() => {
    const byChain = {};
    Object.entries(chainTransactions).forEach(([chainId, data]) => {
      byChain[chainId] = {
        ...data,
        chainName: CHAINS[chainId]?.name,
        chainColor: CHAINS[chainId]?.color,
      };
    });
    return byChain;
  })[0];

  const totalCount = useState(() => {
    return Object.values(chainTransactions).reduce(
      (sum, data) => sum + (data.transactions?.length || 0),
      0
    );
  })[0];

  const refetch = useCallback(() => {
    Object.keys(CHAINS).forEach(fetchChainTransactions);
  }, [fetchChainTransactions]);

  return {
    transactions: allTransactions,
    transactionsByChain,
    chainTransactions,
    chainErrors,
    loadingChains: Array.from(loadingChains),
    isLoading: isLoading || loadingChains.size > 0,
    totalCount,
    refetch,
  };
}

export default useHistory;
