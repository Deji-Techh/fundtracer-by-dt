import { useState, useCallback } from 'react';
import { historyApi, HistoryResponse, Transaction } from '../services/api/historyApi';

export const useHistory = (walletAddress: string | null, chain: string = 'linea') => {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [pageToken, setPageToken] = useState<string | undefined>(undefined);

  const fetchHistory = useCallback(async (filters?: { type?: string; minAmount?: number }) => {
    if (!walletAddress) {
      setData([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await historyApi.getHistory(walletAddress, chain, undefined, filters);
      setData(result.transactions);
      setHasMore(result.pagination.hasMore);
      setPageToken(result.pagination.pageToken);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch history');
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, chain]);

  const loadMore = useCallback(async () => {
    if (!walletAddress || !pageToken || loadingMore) return;

    setLoadingMore(true);

    try {
      const result = await historyApi.getHistory(walletAddress, chain, pageToken);
      setData(prev => [...prev, ...result.transactions]);
      setHasMore(result.pagination.hasMore);
      setPageToken(result.pagination.pageToken);
    } catch (err: any) {
      console.error('Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [walletAddress, chain, pageToken, loadingMore]);

  return { 
    data, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    fetchHistory,
    loadMore 
  };
};

export default useHistory;
