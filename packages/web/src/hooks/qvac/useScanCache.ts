import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../api';
import { getHistory, type HistoryItem } from '../../utils/history';

export interface ScanCacheItem {
  id: string;
  address: string;
  chain: string;
  label?: string;
  riskScore?: number;
  tags?: string[];
  timestamp: number;
  balance?: string;
  txCount?: number;
}

export interface WalletCacheData {
  address: string;
  chain: string;
  balance?: string;
  txCount?: number;
  riskScore?: number;
  tags?: string[];
  fundingSources?: string[];
  recentActivity?: string;
  lastUpdated: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useScanCache() {
  const [recentScans, setRecentScans] = useState<ScanCacheItem[]>([]);
  const [walletCache, setWalletCache] = useState<Map<string, WalletCacheData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentScans = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use local memory first (instant)
      const historyItems = getHistory() as HistoryItem[];
      
      if (historyItems && historyItems.length > 0) {
        const scans: ScanCacheItem[] = historyItems.slice(0, 20).map((item: HistoryItem) => ({
          id: crypto.randomUUID(),
          address: item.address,
          chain: item.chain || 'ethereum',
          label: item.label,
          riskScore: item.riskScore,
          tags: item.riskLevel ? [item.riskLevel] : [],
          timestamp: item.timestamp || Date.now(),
          balance: item.balanceInEth?.toString(),
          txCount: item.totalTransactions,
        }));
        
        setRecentScans(scans);
        return scans;
      }
      
      // Fallback to API if local is empty
      const response = await apiRequest('/api/scan-history', 'GET') as Response;
      const data = await response.json();
      
      if (data.success && data.items) {
        const scans: ScanCacheItem[] = data.items.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          address: item.address,
          chain: item.chain || 'ethereum',
          label: item.label,
          riskScore: item.riskScore,
          tags: item.tags,
          timestamp: item.timestamp || Date.now(),
          balance: item.balance,
          txCount: item.txCount,
        }));
        
        setRecentScans(scans);
        return scans;
      }
      return [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch scans';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchWalletCache = useCallback(async (address: string, chain: string = 'ethereum'): Promise<WalletCacheData | null> => {
    const cacheKey = `${chain}:${address.toLowerCase()}`;
    const cached = walletCache.get(cacheKey);
    
    if (cached && Date.now() - cached.lastUpdated < CACHE_TTL) {
      return cached;
    }

    try {
      const response = await apiRequest(`/api/wallet-cache/${chain}/${address}`, 'GET');
      const data = await response.json();
      
      if (data.success && data.wallet) {
        const walletData: WalletCacheData = {
          address: data.wallet.address,
          chain: data.wallet.chain,
          balance: data.wallet.balance,
          txCount: data.wallet.txCount,
          riskScore: data.wallet.riskScore,
          tags: data.wallet.tags,
          fundingSources: data.wallet.fundingSources,
          recentActivity: data.wallet.recentActivity,
          lastUpdated: Date.now(),
        };
        
        setWalletCache(prev => new Map(prev).set(cacheKey, walletData));
        return walletData;
      }
      return null;
    } catch {
      return cached || null;
    }
  }, [walletCache]);

  const saveScanToCache = useCallback(async (item: Omit<ScanCacheItem, 'id' | 'timestamp'>) => {
    try {
      const response = await apiRequest('/api/scan-history', 'POST', {
        address: item.address,
        chain: item.chain,
        label: item.label,
        riskScore: item.riskScore,
        tags: item.tags,
        balance: item.balance,
        txCount: item.txCount,
      });
      
      const data = await response.json();
      
      if (data.success) {
        const newScan: ScanCacheItem = {
          id: data.id || crypto.randomUUID(),
          ...item,
          timestamp: Date.now(),
        };
        
        setRecentScans(prev => [newScan, ...prev.slice(0, 49)]);
        return newScan;
      }
      return null;
    } catch (err) {
      console.error('Failed to save scan to cache:', err);
      return null;
    }
  }, []);

  const removeScanFromCache = useCallback(async (address: string) => {
    try {
      await apiRequest(`/api/scan-history/${address}`, 'DELETE');
      setRecentScans(prev => prev.filter(s => s.address.toLowerCase() !== address.toLowerCase()));
    } catch (err) {
      console.error('Failed to remove scan from cache:', err);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await apiRequest('/api/scan-history', 'DELETE');
      setRecentScans([]);
      setWalletCache(new Map());
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  }, []);

  const clearWalletCache = useCallback((address?: string) => {
    if (address) {
      setWalletCache(prev => {
        const newCache = new Map(prev);
        for (const key of newCache.keys()) {
          if (key.includes(address.toLowerCase())) {
            newCache.delete(key);
          }
        }
        return newCache;
      });
    } else {
      setWalletCache(new Map());
    }
  }, []);

  useEffect(() => {
    fetchRecentScans();
    
    // Listen for history changes (when new scans are added)
    const handleHistoryChange = () => {
      fetchRecentScans();
    };
    window.addEventListener('historyChanged', handleHistoryChange);
    
    return () => {
      window.removeEventListener('historyChanged', handleHistoryChange);
    };
  }, [fetchRecentScans]);

  return {
    recentScans,
    walletCache,
    isLoading,
    error,
    fetchRecentScans,
    fetchWalletCache,
    saveScanToCache,
    removeScanFromCache,
    clearCache,
    clearWalletCache,
  };
}