import React, { useState, useEffect } from 'react';
import './RadarView.css';

const API_BASE = '/api';

interface RadarAlert {
  id: string;
  address: string;
  label?: string;
  chain: 'solana' | 'evm';
  alertType: 'any_transaction' | 'large_transfer' | 'suspicious' | 'token_swap' | 'nft_activity' | 'new_position';
  threshold?: number;
  enabled: boolean;
  email: string;
  customMessage?: string;
}

interface LiveActivity {
  id: string;
  address: string;
  type: 'received' | 'sent' | 'swap' | 'nft' | 'stake' | 'other';
  amount?: number;
  amountUSD?: number;
  token?: string;
  timestamp: string;
  txHash: string;
}

const RadarView: React.FC = () => {
  const [chain, setChain] = useState<'solana' | 'evm'>('solana');
  const [alerts, setAlerts] = useState<RadarAlert[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [liveActivities, setLiveActivities] = useState<LiveActivity[]>([]);
  const [emailSettings, setEmailSettings] = useState({
    enabled: true,
    address: '',
    verified: false,
    customMessage: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  // Load alerts from API
  const loadAlerts = async (user: string) => {
    try {
      const [alertsRes, activityRes] = await Promise.all([
        fetch(`${API_BASE}/radar/alerts?userId=${user}`),
        fetch(`${API_BASE}/radar/activity?userId=${user}&limit=50`)
      ]);

      const alertsData = await alertsRes.json();
      const activityData = await activityRes.json();

      if (alertsData.alerts) {
        setAlerts(alertsData.alerts.filter((a: RadarAlert) => a.chain === chain));
      }
      if (activityData.activities) {
        setLiveActivities(activityData.activities);
      }
    } catch (error) {
      console.error('[Radar] Failed to load data:', error);
      // Fall back to empty state
      setAlerts([]);
      setLiveActivities([]);
    }
  };

  // Get user ID from localStorage or create guest session
  useEffect(() => {
    const storedUser = localStorage.getItem('fundtracer_user_id');
    const user = storedUser || `guest_${Date.now()}`;
    if (!storedUser) {
      localStorage.setItem('fundtracer_user_id', user);
    }
    setUserId(user);
  }, []);

  // Load data when userId changes
  useEffect(() => {
    if (userId) {
      setIsLoading(true);
      loadAlerts(userId).finally(() => setIsLoading(false));
    }
  }, [userId, chain]);

  // Poll for live activity every 30 seconds
  useEffect(() => {
    if (!userId || isLoading) return;

    const pollInterval = setInterval(() => {
      loadAlerts(userId);
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [userId, isLoading]);

  const toggleAlert = async (id: string) => {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;

    const newEnabled = !alert.enabled;

    // Optimistic update
    setAlerts(alerts.map(a => 
      a.id === id ? { ...a, enabled: newEnabled } : a
    ));

    try {
      await fetch(`${API_BASE}/radar/alerts/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled })
      });
    } catch (error) {
      console.error('[Radar] Failed to toggle alert:', error);
      // Revert on error
      setAlerts(alerts.map(a => 
        a.id === id ? { ...a, enabled: !newEnabled } : a
      ));
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      await fetch(`${API_BASE}/radar/alerts/${id}`, { method: 'DELETE' });
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (error) {
      console.error('[Radar] Failed to delete alert:', error);
    }
  };

  const formatTime = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getAlertTypeLabel = (type: RadarAlert['alertType']) => {
    const labels = {
      any_transaction: 'Any Transaction',
      large_transfer: 'Large Transfer',
      suspicious: 'Suspicious Activity',
      token_swap: 'Token Swap',
      nft_activity: 'NFT Activity',
      new_position: 'New Position',
    };
    return labels[type];
  };

  const getActivityIcon = (type: LiveActivity['type']) => {
    switch (type) {
      case 'received': return '↓';
      case 'sent': return '↑';
      case 'swap': return '⇄';
      case 'nft': return '🎨';
      case 'stake': return '⚡';
      default: return '•';
    }
  };

  const getActivityColor = (type: LiveActivity['type']) => {
    switch (type) {
      case 'received': return 'var(--color-positive)';
      case 'sent': return 'var(--color-negative)';
      case 'swap': return 'var(--color-accent)';
      case 'nft': return 'var(--color-warning)';
      case 'stake': return 'var(--color-info)';
      default: return 'var(--color-text-muted)';
    }
  };

  if (isLoading) {
    return (
      <div className="radar-loading">
        <div className="loading-spinner" />
        <span>Loading Radar...</span>
      </div>
    );
  }

  return (
    <div className="radar-container">
      {/* Header */}
      <div className="radar-header">
        <div className="radar-header-left">
          <h2 className="radar-title">RADAR</h2>
          <div className="radar-chain-selector">
            <button 
              className={`chain-btn ${chain === 'solana' ? 'active' : ''}`}
              onClick={() => setChain('solana')}
            >
              <span className="chain-dot solana"></span>
              Solana
            </button>
            <button 
              className={`chain-btn ${chain === 'evm' ? 'active' : ''} disabled`}
              onClick={() => {}}
              disabled
              title="Coming soon"
            >
              <span className="chain-dot evm"></span>
              EVM
            </button>
          </div>
        </div>
        <div className="radar-header-right">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Wallet
          </button>
        </div>
      </div>

      {/* Main Content - Split Grid (Design 4) */}
      <div className="radar-grid">
        {/* Left Column - Active Wallets */}
        <div className="radar-wallets-section">
          <div className="section-header">
            <h3>ACTIVE WALLETS ({alerts.length})</h3>
          </div>
          
          <div className="wallet-cards">
            {alerts.map((alert) => (
              <div key={alert.id} className={`wallet-card ${!alert.enabled ? 'paused' : ''}`}>
                <div className="wallet-card-header">
                  <div className="wallet-card-icon">
                    {alert.alertType === 'any_transaction' ? '🔔' : 
                     alert.alertType === 'large_transfer' ? '🐋' :
                     alert.alertType === 'suspicious' ? '⚠️' : '📊'}
                  </div>
                  <div className="wallet-card-info">
                    <div className="wallet-label">{alert.label}</div>
                    <div className="wallet-address">
                      {alert.address.slice(0, 8)}...{alert.address.slice(-4)}
                    </div>
                  </div>
                </div>
                
                <div className="wallet-card-body">
                  <div className="alert-type">
                    {alert.alertType === 'large_transfer' && alert.threshold 
                      ? `>$${alert.threshold.toLocaleString()} Transfer`
                      : getAlertTypeLabel(alert.alertType)}
                  </div>
                </div>

                <div className="wallet-card-footer">
                  <button 
                    className={`toggle-btn ${alert.enabled ? 'active' : ''}`}
                    onClick={() => toggleAlert(alert.id)}
                  >
                    {alert.enabled ? '● Active' : '○ Paused'}
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => deleteAlert(alert.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}

            {/* Add New Card */}
            <div className="wallet-card add-card" onClick={() => setShowAddModal(true)}>
              <div className="add-icon">+</div>
              <div className="add-text">Add Wallet</div>
            </div>
          </div>

          {/* Email Settings */}
          <div className="email-settings-section">
            <div className="section-header">
              <h3>📧 EMAIL NOTIFICATIONS</h3>
            </div>
            <div className="email-card">
              <div className="email-input-row">
                <input 
                  type="email" 
                  placeholder="your@email.com"
                  value={emailSettings.address}
                  onChange={(e) => setEmailSettings({...emailSettings, address: e.target.value})}
                  className="email-input"
                />
                <button className="verify-btn">
                  {emailSettings.verified ? '✓ Verified' : 'Verify'}
                </button>
              </div>
              <div className="custom-message-row">
                <span className="custom-label">Custom message:</span>
                <button className="customize-btn">
                  {emailSettings.customMessage ? 'Edit' : 'Add'} 
                  {emailSettings.customMessage && ' ✏️'}
                </button>
              </div>
              {emailSettings.customMessage && (
                <div className="custom-message-preview">
                  "{emailSettings.customMessage}"
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Live Activity */}
        <div className="radar-activity-section">
          <div className="section-header">
            <h3>⚡ LIVE ACTIVITY</h3>
            <span className="live-badge">● Live</span>
          </div>
          
          <div className="activity-feed">
            {liveActivities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div 
                  className="activity-icon"
                  style={{ color: getActivityColor(activity.type) }}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="activity-content">
                  <div className="activity-main">
                    <span className="activity-address">
                      {activity.address.slice(0, 8)}...{activity.address.slice(-4)}
                    </span>
                    <span className="activity-action">
                      {activity.type === 'received' && 'received'}
                      {activity.type === 'sent' && 'sent'}
                      {activity.type === 'swap' && 'swapped'}
                      {activity.type === 'nft' && 'NFT activity'}
                      {activity.type === 'stake' && 'staked'}
                    </span>
                  </div>
                  <div className="activity-details">
                    {activity.amount && (
                      <span className="activity-amount">
                        {activity.type === 'received' ? '+' : '-'}
                        {activity.amount} {activity.token}
                      </span>
                    )}
                    <span className="activity-time">{formatTime(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* FundTracer Banner */}
          <div className="fundtracer-banner">
            <div className="banner-content">
              <div className="banner-logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="banner-text">
                <span className="banner-title">FundTracer</span>
                <span className="banner-subtitle">Wallet Intelligence Platform</span>
              </div>
            </div>
            <button className="banner-cta">Learn More →</button>
          </div>
        </div>
      </div>

      {/* Add Wallet Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Alert</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Wallet Address</label>
                <input 
                  type="text" 
                  placeholder="Enter wallet address..."
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Label (optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g., My Wallet, Whale Target"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Alert Type</label>
                <select className="form-select">
                  <option value="any_transaction">Any Transaction</option>
                  <option value="large_transfer">Large Transfer (&gt;$1000)</option>
                  <option value="token_swap">Token Swap</option>
                  <option value="nft_activity">NFT Activity</option>
                  <option value="new_position">New DeFi Position</option>
                </select>
              </div>
              <div className="form-group threshold-group">
                <label>Threshold (USD)</label>
                <input 
                  type="number" 
                  placeholder="1000"
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary">
                Add Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadarView;
