import React, { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { analyzeWallet, getAuthToken } from '../../api';
import './TrackView.css';

interface TrackedWallet {
  address: string;
  addedAt: number;
  lastActivity?: number;
  totalTxs?: number;
}

interface ActivityItem {
  hash: string;
  from: string;
  to: string;
  value: number;
  token: string;
  chain: string;
  type: 'buy' | 'sell' | 'transfer' | 'bridge';
  timestamp: number;
  status: 'success' | 'failed';
}

interface SmartMoneyWallet {
  address: string;
  chain: string;
  winRate: number;
  pnl: number;
  totalTrades: number;
  totalVolume: number;
  lastActive: number;
}

type DiscoverFilter = {
  chain: string;
  sortBy: string;
  timeframe: string;
};

const TrackView: React.FC = () => {
  const { user } = usePrivy();
  const [activeSection, setActiveSection] = useState<'tracked' | 'discover' | 'activity'>('tracked');
  const [trackedWallets, setTrackedWallets] = useState<TrackedWallet[]>([]);
  const [activities, setActivities] = useState<Record<string, ActivityItem[]>>({});
  const [smartMoney, setSmartMoney] = useState<SmartMoneyWallet[]>([]);
  const [newWallet, setNewWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [filters, setFilters] = useState<DiscoverFilter>({
    chain: 'all',
    sortBy: 'pnl',
    timeframe: '24h'
  });

  // Load tracked wallets from API
  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        const res = await fetch('/api/track', { 
          headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const data = await res.json();
        if (data.wallets && data.wallets.length > 0) {
          setTrackedWallets(data.wallets);
          setActiveSection('tracked');
        } else {
          setActiveSection('discover');
        }
      } catch (e) {
        console.error('Failed to load watchlist:', e);
        setActiveSection('discover');
      }
    };
    loadWatchlist();
  }, []);

  // Save tracked wallets (API sync)
  const saveTrackedWallets = useCallback((wallets: TrackedWallet[]) => {
    setTrackedWallets(wallets);
  }, []);

  // Add wallet to track
  const handleAddWallet = useCallback(async () => {
    if (!newWallet.trim() || !newWallet.startsWith('0x')) {
      return;
    }

    if (trackedWallets.some((w: TrackedWallet) => w.address.toLowerCase() === newWallet.toLowerCase())) {
      return;
    }

    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ address: newWallet })
      });
      const data = await res.json();

      if (data.success) {
        const newTracked: TrackedWallet = {
          address: newWallet.toLowerCase(),
          addedAt: Date.now(),
        };
        saveTrackedWallets([...trackedWallets, newTracked]);
        setNewWallet('');
        setActiveSection('tracked');
      }
    } catch (e) {
      console.error('Failed to add wallet:', e);
    } finally {
      setLoading(false);
    }
  }, [newWallet, trackedWallets, saveTrackedWallets]);

  // Remove wallet from track
  const handleRemoveWallet = useCallback(async (address: string) => {
    try {
      const token = getAuthToken();
      await fetch(`/api/track/${address}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Failed to remove wallet:', e);
    }
    const updated = trackedWallets.filter((w: TrackedWallet) => w.address.toLowerCase() !== address.toLowerCase());
    saveTrackedWallets(updated);
  }, [trackedWallets, saveTrackedWallets]);

  // Load activity for tracked wallets
  const handleLoadActivity = useCallback(async () => {
    if (trackedWallets.length === 0) return;

    setLoadingActivity(true);
    const allActivities: Record<string, ActivityItem[]> = {};

    try {
      for (const wallet of trackedWallets) {
        const chains = ['ethereum', 'arbitrum', 'base', 'optimism', 'polygon', 'bsc', 'linea'];
        
        for (const chain of chains) {
          try {
            const response = await analyzeWallet(wallet.address, chain as any, { limit: 20 });
            const txs = response.result?.transactions || [];
            
            if (txs.length > 0) {
              const chainActivities: ActivityItem[] = txs.map((tx: any) => {
                const fromAddr = (tx.from || tx.from_address || '').toLowerCase();
                const toAddr = (tx.to || tx.to_address || '').toLowerCase();
                const walletAddr = wallet.address.toLowerCase();
                
                let rawValue = tx.value || tx.valueInEth || tx.value_in_eth || tx.value_in_token || '0';
                let value = parseFloat(rawValue);
                if (!isNaN(value) && value > 1e10) {
                  value = value / 1e18;
                }
                if (isNaN(value)) value = 0;
                
                let timestamp = 0;
                if (tx.timestamp) {
                  const ts = tx.timestamp;
                  if (typeof ts === 'number') {
                    timestamp = ts > 1e12 ? ts : ts * 1000;
                  } else if (typeof ts === 'string') {
                    const parsed = new Date(ts).getTime();
                    if (!isNaN(parsed)) timestamp = parsed;
                  }
                }
                if (timestamp <= 0 || timestamp > Date.now() + 86400000) {
                  timestamp = 0;
                }
                
                return {
                  hash: tx.hash || tx.tx_hash || '',
                  from: fromAddr,
                  to: toAddr,
                  value,
                  token: tx.token || tx.symbol || 'ETH',
                  chain,
                  type: walletAddr === fromAddr ? 'sell' : 'buy',
                  timestamp,
                  status: tx.error || tx.failed ? 'failed' : 'success',
                };
              });
              
              if (!allActivities[chain]) {
                allActivities[chain] = [];
              }
              allActivities[chain] = [...allActivities[chain], ...chainActivities];
            }
          } catch (e) {
            // Continue to next chain
          }
        }
      }

      // Sort by timestamp
      Object.keys(allActivities).forEach(chain => {
        allActivities[chain].sort((a, b) => b.timestamp - a.timestamp);
      });

      setActivities(allActivities);
    } catch (e) {
      console.error('Failed to load activity:', e);
    } finally {
      setLoadingActivity(false);
    }
  }, [trackedWallets]);

  // Discover smart money from API with filters
  const handleDiscoverSmartMoney = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        chain: filters.chain,
        sortBy: filters.sortBy,
        timeframe: filters.timeframe,
        limit: '20'
      });
      const res = await fetch(`/api/smart-money/discover?${params}`);
      const data = await res.json();
      
      if (data.traders) {
        const smartMoneyWithStats: SmartMoneyWallet[] = data.traders.map((t: any) => ({
          address: t.address,
          chain: t.chain || 'ethereum',
          winRate: t.winRate || 0,
          pnl: t.pnl || 0,
          totalTrades: t.totalTrades || 0,
          totalVolume: t.totalVolume || 0,
          lastActive: t.lastActive || Date.now(),
        }));
        setSmartMoney(smartMoneyWithStats);
      }
    } catch (e) {
      console.error('Failed to discover smart money:', e);
      setSmartMoney([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Add smart money wallet to tracked
  const handleTrackSmartMoney = useCallback(async (address: string) => {
    if (trackedWallets.some((w: TrackedWallet) => w.address.toLowerCase() === address.toLowerCase())) {
      return;
    }

    try {
      const token = getAuthToken();
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ address })
      });
      const data = await res.json();

      if (data.success) {
        const newTracked: TrackedWallet = {
          address: address.toLowerCase(),
          addedAt: Date.now(),
        };
        saveTrackedWallets([...trackedWallets, newTracked]);
        setActiveSection('tracked');
      }
    } catch (e) {
      console.error('Failed to track wallet:', e);
    }
  }, [trackedWallets, saveTrackedWallets]);

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp || timestamp <= 0 || timestamp > Date.now() + 86400000) {
      return 'unknown';
    }
    const diff = Date.now() - timestamp;
    if (diff < 0) return 'just now';
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Format address
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="track-view">
      <div className="track-header">
        <h2>Wallet Tracking</h2>
        <p>Track wallet activity across all chains</p>
      </div>

      {/* Section Tabs */}
      <div className="track-tabs">
        <button 
          className={`track-tab ${activeSection === 'tracked' ? 'active' : ''}`}
          onClick={() => setActiveSection('tracked')}
        >
          My Tracked
          {trackedWallets.length > 0 && (
            <span className="badge">{trackedWallets.length}</span>
          )}
        </button>
        <button 
          className={`track-tab ${activeSection === 'discover' ? 'active' : ''}`}
          onClick={() => setActiveSection('discover')}
        >
          Discover
        </button>
        <button 
          className={`track-tab ${activeSection === 'activity' ? 'active' : ''}`}
          onClick={() => {
            setActiveSection('activity');
            if (Object.keys(activities).length === 0) {
              handleLoadActivity();
            }
          }}
        >
          Activity
        </button>
      </div>

      {/* Content */}
      <div className="track-content">
        {/* My Tracked Section */}
        {activeSection === 'tracked' && (
          <div className="tracked-section">
            {/* Add Wallet Input */}
            <div className="add-wallet-row">
              <input
                type="text"
                placeholder="Enter wallet address (0x...)"
                value={newWallet}
                onChange={(e) => setNewWallet(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWallet()}
                className="wallet-input"
              />
              <button 
                className="add-btn"
                onClick={handleAddWallet}
                disabled={loading || !newWallet.trim()}
              >
                {loading ? 'Adding...' : '+ Add'}
              </button>
            </div>

            {/* Tracked Wallets List */}
            {trackedWallets.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
                <p>No wallets tracked yet</p>
                <span>Add wallets to monitor their activity</span>
              </div>
            ) : (
              <div className="tracked-list">
                {trackedWallets.map((wallet) => (
                  <div key={wallet.address} className="tracked-item">
                    <div className="wallet-info">
                      <span className="wallet-address">{formatAddress(wallet.address)}</span>
                      {wallet.totalTxs !== undefined && (
                        <span className="tx-count">{wallet.totalTxs} txs</span>
                      )}
                    </div>
                    <div className="wallet-actions">
                      <button 
                        className="action-btn"
                        onClick={() => {
                          // Navigate to investigate with this wallet
                          window.location.href = `/app-evm?address=${wallet.address}&tab=wallet`;
                        }}
                      >
                        Analyze
                      </button>
                      <button 
                        className="remove-btn"
                        onClick={() => handleRemoveWallet(wallet.address)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Discover Section */}
        {activeSection === 'discover' && (
          <div className="discover-section">
            <div className="discover-header">
              <h3>Smart Money</h3>
              <p>Discover top performing wallets to track</p>
            </div>

            <div className="discover-filters">
              <select 
                value={filters.chain}
                onChange={(e) => setFilters({...filters, chain: e.target.value})}
                className="filter-select"
              >
                <option value="all">All Chains</option>
                <option value="ethereum">Ethereum</option>
                <option value="linea">Linea</option>
                <option value="base">Base</option>
                <option value="arbitrum">Arbitrum</option>
                <option value="polygon">Polygon</option>
                <option value="optimism">Optimism</option>
                <option value="bsc">BSC</option>
              </select>

              <select 
                value={filters.sortBy}
                onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                className="filter-select"
              >
                <option value="pnl">Sort by PnL</option>
                <option value="winRate">Sort by Win Rate</option>
                <option value="volume">Sort by Volume</option>
              </select>

              <select 
                value={filters.timeframe}
                onChange={(e) => setFilters({...filters, timeframe: e.target.value})}
                className="filter-select"
              >
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </div>

            <button 
              className="discover-btn"
              onClick={handleDiscoverSmartMoney}
              disabled={loading}
            >
              {loading ? 'Discovering...' : 'Find Top Traders'}
            </button>

            {smartMoney.length > 0 && (
              <div className="smart-money-list">
                {smartMoney.map((wallet) => (
                  <div key={wallet.address} className="smart-money-item">
                    <div className="wallet-info">
                      <div className="wallet-header">
                        <span className="wallet-address">{formatAddress(wallet.address)}</span>
                        <span className="wallet-chain">{wallet.chain}</span>
                      </div>
                      <div className="stats-row">
                        <span className="stat win-rate">
                          <span className="label">Win Rate</span>
                          <span className="value">{wallet.winRate}%</span>
                        </span>
                        <span className="stat pnl">
                          <span className="label">PnL</span>
                          <span className={`value ${wallet.pnl >= 0 ? 'positive' : 'negative'}`}>
                            {wallet.pnl >= 0 ? '+' : ''}{typeof wallet.pnl === 'number' ? wallet.pnl.toFixed(2) : wallet.pnl}%
                          </span>
                        </span>
                        <span className="stat trades">
                          <span className="label">Trades</span>
                          <span className="value">{wallet.totalTrades}</span>
                        </span>
                        <span className="stat volume">
                          <span className="label">Volume</span>
                          <span className="value">${typeof wallet.totalVolume === 'number' ? wallet.totalVolume.toLocaleString() : wallet.totalVolume}</span>
                        </span>
                      </div>
                    </div>
                    <button 
                      className="track-btn"
                      onClick={() => handleTrackSmartMoney(wallet.address)}
                      disabled={trackedWallets.some((w: TrackedWallet) => w.address.toLowerCase() === wallet.address.toLowerCase())}
                    >
                      {trackedWallets.some((w: TrackedWallet) => w.address.toLowerCase() === wallet.address.toLowerCase()) 
                        ? 'Tracking' 
                        : '+ Track'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity Section */}
        {activeSection === 'activity' && (
          <div className="activity-section">
            <div className="activity-header">
              <h3>Live Activity</h3>
              <button 
                className="refresh-btn"
                onClick={handleLoadActivity}
                disabled={loadingActivity}
              >
                {loadingActivity ? 'Loading...' : '↻ Refresh'}
              </button>
            </div>

            {Object.keys(activities).length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 8v4l3 3"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                <p>No activity yet</p>
                <span>Click refresh to load latest activity</span>
              </div>
            ) : (
              <div className="activity-feed">
                {Object.entries(activities).map(([chain, chainActivities]) => (
                  <div key={chain} className="chain-group">
                    <div className="chain-header">
                      <span className="chain-name">{chain}</span>
                      <span className="activity-count">{chainActivities.length} txs</span>
                    </div>
                    {chainActivities.slice(0, 10).map((activity, idx) => (
                      <div key={`${activity.hash}-${idx}`} className={`activity-item ${activity.type}`}>
                        <div className="activity-icon">
                          {activity.type === 'buy' && 'IN'}
                          {activity.type === 'sell' && 'OUT'}
                          {activity.type === 'transfer' && 'TX'}
                          {activity.type === 'bridge' && 'BR'}
                        </div>
                        <div className="activity-details">
                          <span className="activity-type">{activity.type}</span>
                          <span className="activity-value">{activity.value.toFixed(4)} {activity.token}</span>
                        </div>
                        <div className="activity-meta">
                          <span className="activity-time">{formatTimeAgo(activity.timestamp)}</span>
                          <a 
                            href={`https://etherscan.io/tx/${activity.hash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="activity-hash"
                          >
                            {formatAddress(activity.hash)}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackView;
