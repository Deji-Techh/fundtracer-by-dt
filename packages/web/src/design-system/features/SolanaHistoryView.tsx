import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Trash2, Wallet, Search, ExternalLink, Eye, RefreshCw } from 'lucide-react';
import './SolanaHistoryView.css';

interface HistoryItem {
  address: string;
  label?: string;
  timestamp: number;
  chain?: string;
  type?: 'wallet' | 'contract' | 'compare' | 'sybil';
  riskScore?: number;
  riskLevel?: string;
  totalTransactions?: number;
  balanceInEth?: number;
}

interface SolanaHistoryViewProps {
  address: string;
}

// Redis cache key
const HISTORY_CACHE_KEY = 'solana_history_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache
let cachedHistory: HistoryItem[] | null = null;
let cacheTimestamp = 0;

function getCachedHistory(): HistoryItem[] | null {
  if (!cachedHistory || Date.now() - cacheTimestamp > CACHE_TTL) {
    return null;
  }
  return cachedHistory;
}

function setCachedHistory(items: HistoryItem[]): void {
  cachedHistory = items;
  cacheTimestamp = Date.now();
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function formatSolanaHistory(): HistoryItem[] {
  return getCachedHistory() || [];
}

export function SolanaHistoryView({ address }: SolanaHistoryViewProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load from cache first, then fetch
  useEffect(() => {
    const cached = getCachedHistory();
    if (cached) {
      setHistory(cached);
    }
    fetchHistory();
  }, [address]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setSyncing(true);
    
    try {
      // Try to get from API (will use Redis on server)
      const token = localStorage.getItem('fundtracer_token');
      const res = await fetch('/api/solana/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        const items = data.history || [];
        setCachedHistory(items);
        setHistory(items);
      }
    } catch (err) {
      console.warn('History fetch error:', err);
      // Fall back to empty on error
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  const handleClear = useCallback(async () => {
    if (!confirm('Clear all history?')) return;
    
    try {
      const token = localStorage.getItem('fundtracer_token');
      await fetch('/api/solana/history', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      setHistory([]);
      setCachedHistory([]);
    } catch (err) {
      console.warn('Clear history error:', err);
    }
  }, []);

  const handleDelete = useCallback(async (addr: string) => {
    try {
      const token = localStorage.getItem('fundtracer_token');
      await fetch(`/api/solana/history/${addr}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const updated = history.filter(h => h.address.toLowerCase() !== addr.toLowerCase());
      setHistory(updated);
      setCachedHistory(updated);
    } catch (err) {
      console.warn('Delete history error:', err);
    }
  }, [history]);

  if (!address) {
    return (
      <div className="solana-view-empty">
        <Clock size={48} />
        <h3>No Address</h3>
        <p>Enter a Solana address in the search bar</p>
      </div>
    );
  }

  if (loading && history.length === 0) {
    return (
      <div className="solana-view-loading">
        <RefreshCw size={32} className={syncing ? 'spin' : ''} />
        <p>Loading history...</p>
      </div>
    );
  }

  return (
    <div className="solana-history-view">
      {/* Header */}
      <div className="history-view__header">
        <div className="history-view__header-left">
          <h1 className="history-view__title">History</h1>
          <span className="history-view__count">{history.length} scans</span>
        </div>
        <div className="history-view__header-right">
          <button 
            className="history-view__refresh" 
            onClick={fetchHistory}
            disabled={syncing}
          >
            <RefreshCw size={14} className={syncing ? 'spin' : ''} />
          </button>
          {history.length > 0 && (
            <button 
              className="history-view__clear"
              onClick={handleClear}
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {history.length > 0 ? (
        <div className="history-view__list">
          {history.map((item, idx) => (
            <div key={idx} className="history-view__item">
              <div className="history-view__item-icon">
                <Wallet size={16} />
              </div>
              <div className="history-view__item-main">
                <div className="history-view__item-address">
                  {item.address.slice(0, 6)}...{item.address.slice(-4)}
                </div>
                <div className="history-view__item-meta">
                  {item.chain && <span className="history-view__item-chain">{item.chain}</span>}
                  <span className="history-view__item-time">{formatRelativeTime(item.timestamp)}</span>
                </div>
              </div>
              <div className="history-view__item-actions">
                <a 
                  href={`https://solscan.io/address/${item.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="history-view__item-link"
                >
                  <ExternalLink size={14} />
                </a>
                <button 
                  className="history-view__item-delete"
                  onClick={() => handleDelete(item.address)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="history-view__empty">
          <Search size={48} />
          <h3>No History</h3>
          <p>Your Solana wallet scans will appear here</p>
        </div>
      )}
    </div>
  );
}

export default SolanaHistoryView;