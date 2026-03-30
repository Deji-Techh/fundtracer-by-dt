import React, { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { analyzeWallet } from '../../api';
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
  winRate: number;
  pnl: number;
  totalTrades: number;
  lastActive: number;
}

const TrackView: React.FC = () => {
  const { user } = usePrivy();
  const [activeSection, setActiveSection] = useState<'tracked' | 'discover' | 'activity'>('tracked');
  const [trackedWallets, setTrackedWallets] = useState<TrackedWallet[]>([]);
  const [activities, setActivities] = useState<Record<string, ActivityItem[]>>({});
  const [smartMoney, setSmartMoney] = useState<SmartMoneyWallet[]>([]);
  const [newWallet, setNewWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Load tracked wallets from localStorage (synced with Telegram)
  useEffect(() => {
    const saved = localStorage.getItem('trackedWallets');
    if (saved) {
      try {
        const wallets = JSON.parse(saved);
        setTrackedWallets(wallets);
        if (wallets.length > 0) {
          setActiveSection('tracked');
        } else {
          setActiveSection('discover');
        }
      } catch (e) {
        setTrackedWallets([]);
        setActiveSection('discover');
      }
    } else {
      setActiveSection('discover');
    }
  }, []);

  // Save tracked wallets to localStorage
  const saveTrackedWallets = useCallback((wallets: TrackedWallet[]) => {
    localStorage.setItem('trackedWallets', JSON.stringify(wallets));
    setTrackedWallets(wallets);
  }, []);

  // Add wallet to track
  const handleAddWallet = useCallback(async () => {
    if (!newWallet.trim() || !newWallet.startsWith('0x')) {
      return;
    }

    if (trackedWallets.some(w => w.address.toLowerCase() === newWallet.toLowerCase())) {
      return;
    }

    setLoading(true);
    try {
      // Analyze the wallet to get initial data
      const response = await analyzeWallet(newWallet, 'ethereum', { limit: 10 });
      
      const newTracked: TrackedWallet = {
        address: newWallet.toLowerCase(),
        addedAt: Date.now(),
        lastActivity: response.result?.lastActive || Date.now(),
        totalTxs: response.result?.transactionCount || 0,
      };

      saveTrackedWallets([...trackedWallets, newTracked]);
      setNewWallet('');
      setActiveSection('tracked');
    } catch (e) {
      console.error('Failed to add wallet:', e);
    } finally {
      setLoading(false);
    }
  }, [newWallet, trackedWallets, saveTrackedWallets]);

  // Remove wallet from track
  const handleRemoveWallet = useCallback((address: string) => {
    const updated = trackedWallets.filter(w => w.address.toLowerCase() !== address.toLowerCase());
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
              const chainActivities: ActivityItem[] = txs.map((tx: any) => ({
                hash: tx.hash || tx.tx_hash || '',
                from: (tx.from || tx.from_address || '').toLowerCase(),
                to: (tx.to || tx.to_address || '').toLowerCase(),
                value: parseFloat(tx.value || tx.valueInEth || '0'),
                token: tx.token || 'ETH',
                chain,
                type: wallet.address.toLowerCase() === (tx.from || tx.from_address || '').toLowerCase() 
                  ? 'sell' 
                  : 'buy',
                timestamp: tx.timestamp ? new Date(tx.timestamp).getTime() : Date.now(),
                status: tx.error || tx.failed ? 'failed' : 'success',
              }));
              
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

  // Discover smart money (mock for now - would connect to backend)
  const handleDiscoverSmartMoney = useCallback(async () => {
    setLoading(true);
    try {
      // This would connect to backend API in production
      // For now, show sample data
      const mockSmartMoney: SmartMoneyWallet[] = [
        { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1', winRate: 78, pnl: 450, totalTrades: 156, lastActive: Date.now() - 3600000 },
        { address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72', winRate: 65, pnl: 220, totalTrades: 89, lastActive: Date.now() - 7200000 },
        { address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', winRate: 82, pnl: 890, totalTrades: 234, lastActive: Date.now() - 1800000 },
      ];
      setSmartMoney(mockSmartMoney);
    } catch (e) {
      console.error('Failed to discover smart money:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add smart money wallet to tracked
  const handleTrackSmartMoney = useCallback((address: string) => {
    if (trackedWallets.some(w => w.address.toLowerCase() === address.toLowerCase())) {
      return;
    }

    const newTracked: TrackedWallet = {
      address: address.toLowerCase(),
      addedAt: Date.now(),
    };

    saveTrackedWallets([...trackedWallets, newTracked]);
    setActiveSection('tracked');
  }, [trackedWallets, saveTrackedWallets]);

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
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

            <button 
              className="discover-btn"
              onClick={handleDiscoverSmartMoney}
              disabled={loading}
            >
              {loading ? 'Discovering...' : '🔍 Find Top Traders'}
            </button>

            {smartMoney.length > 0 && (
              <div className="smart-money-list">
                {smartMoney.map((wallet) => (
                  <div key={wallet.address} className="smart-money-item">
                    <div className="wallet-info">
                      <span className="wallet-address">{formatAddress(wallet.address)}</span>
                      <div className="stats-row">
                        <span className="stat win-rate">
                          <span className="label">Win Rate</span>
                          <span className="value">{wallet.winRate}%</span>
                        </span>
                        <span className="stat pnl">
                          <span className="label">PnL</span>
                          <span className="value">+{wallet.pnl}%</span>
                        </span>
                        <span className="stat trades">
                          <span className="label">Trades</span>
                          <span className="value">{wallet.totalTrades}</span>
                        </span>
                      </div>
                    </div>
                    <button 
                      className="track-btn"
                      onClick={() => handleTrackSmartMoney(wallet.address)}
                      disabled={trackedWallets.some(w => w.address.toLowerCase() === wallet.address.toLowerCase())}
                    >
                      {trackedWallets.some(w => w.address.toLowerCase() === wallet.address.toLowerCase()) 
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
                          {activity.type === 'buy' && '🟢'}
                          {activity.type === 'sell' && '🔴'}
                          {activity.type === 'transfer' && '🔵'}
                          {activity.type === 'bridge' && '🌉'}
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
