import React, { useState, useEffect } from 'react';
import './RadarView.css';
import { 
  BellIcon, 
  DollarIcon, 
  ShieldIcon, 
  ArrowSwapIcon, 
  ImageIcon, 
  PositionIcon,
  PlusIcon,
  RadarEmptyIcon,
  CloseIcon,
  EmailIcon,
  ClockIcon,
  MessageIcon
} from './RadarIcons';

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
  alertLabel?: string;
  type: 'received' | 'sent' | 'swap' | 'nft' | 'stake' | 'other';
  amount?: number;
  amountUSD?: number;
  token?: string;
  timestamp: string;
  txHash: string;
}

interface UserProfile {
  email: string;
  displayName?: string;
}

// Message templates
const MESSAGE_TEMPLATES = [
  { id: 'new_tx', label: 'New transaction detected', text: 'New transaction detected on {address}' },
  { id: 'large_tx', label: 'Large transfer', text: 'Large transfer of {amount} {token} (${amountUSD}) detected from {address}' },
  { id: 'suspicious', label: 'Suspicious activity', text: 'Suspicious activity detected involving {address}' },
  { id: 'token_swap', label: 'Token swap', text: 'Token swap detected: {amountIn} -> {amountOut}' },
  { id: 'custom', label: 'Custom message', text: '' },
];

const AlertTypeIcon: React.FC<{ type: RadarAlert['alertType'] }> = ({ type }) => {
  const iconProps = { size: 20, className: 'wallet-card-icon-svg' };
  switch (type) {
    case 'any_transaction': return <BellIcon {...iconProps} />;
    case 'large_transfer': return <DollarIcon {...iconProps} />;
    case 'suspicious': return <ShieldIcon {...iconProps} />;
    case 'token_swap': return <ArrowSwapIcon {...iconProps} />;
    case 'nft_activity': return <ImageIcon {...iconProps} />;
    case 'new_position': return <PositionIcon {...iconProps} />;
    default: return <BellIcon {...iconProps} />;
  }
};

const RadarView: React.FC = () => {
  const [chain, setChain] = useState<'solana' | 'evm'>('solana');
  const [alerts, setAlerts] = useState<RadarAlert[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [liveActivities, setLiveActivities] = useState<LiveActivity[]>([]);
  const [emailSettings, setEmailSettings] = useState({
    enabled: true,
    address: '',
    verified: false,
    customMessage: '',
  });
  const [formData, setFormData] = useState({
    address: '',
    label: '',
    alertType: 'any_transaction',
    threshold: 1000,
    email: '',
    frequency: 'instant',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [deletedAlert, setDeletedAlert] = useState<RadarAlert | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

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
    setMounted(true);
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

  // Fetch user profile from API to auto-fill email
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/profile`);
        if (res.ok) {
          const profile: UserProfile = await res.json();
          if (profile.email) {
            setEmailSettings(prev => ({
              ...prev,
              address: profile.email,
              verified: true,
            }));
          }
        }
      } catch (error) {
        console.log('[Radar] No authenticated profile, using guest mode');
      }
    };

    fetchUserProfile();
  }, []);

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
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;

    setDeletedAlert(alert);
    setAlerts(alerts.filter(a => a.id !== id));
    setShowUndoToast(true);

    try {
      await fetch(`${API_BASE}/radar/alerts/${id}`, { method: 'DELETE' });
      setTimeout(() => {
        setShowUndoToast(false);
        setDeletedAlert(null);
      }, 4000);
    } catch (error) {
      console.error('[Radar] Failed to delete alert:', error);
      setAlerts([...alerts, alert]);
    }
  };

  const handleUndoDelete = () => {
    if (deletedAlert) {
      setAlerts([...alerts, deletedAlert]);
      setShowUndoToast(false);
      setDeletedAlert(null);
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
      case 'received': return 'IN';
      case 'sent': return 'OUT';
      case 'swap': return 'SWAP';
      case 'nft': return 'NFT';
      case 'stake': return 'STAKE';
      default: return '--';
    }
  };

  const getActivityColor = (type: LiveActivity['type']) => {
    switch (type) {
      case 'received': return 'var(--intel-green)';
      case 'sent': return 'var(--intel-red)';
      case 'swap': return 'var(--intel-purple)';
      case 'nft': return 'var(--intel-orange)';
      case 'stake': return 'var(--intel-cyan)';
      default: return 'var(--intel-text-muted)';
    }
  };

  // Handle adding a new alert
  const handleAddAlert = async () => {
    if (!formData.address.trim()) {
      alert('Please enter a wallet address');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/radar/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: formData.address,
          label: formData.label,
          chain: chain,
          alertType: formData.alertType,
          threshold: formData.alertType === 'large_transfer' ? formData.threshold : undefined,
          email: emailSettings.address,
          customMessage: emailSettings.customMessage,
          userId: userId,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setFormData({ address: '', label: '', alertType: 'any_transaction', threshold: 1000, email: '', frequency: 'instant' });
        loadAlerts(userId);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create alert');
      }
    } catch (error) {
      console.error('[Radar] Failed to create alert:', error);
      alert('Failed to create alert');
    }
  };

  // Handle verify email
  const handleVerifyEmail = async () => {
    if (!emailSettings.address) {
      alert('Please enter an email address first');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/radar/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailSettings.address, userId: userId }),
      });

      if (res.ok) {
        setEmailSettings(prev => ({ ...prev, verified: true }));
        alert('Verification email sent!');
      } else {
        alert('Failed to send verification email');
      }
    } catch (error) {
      console.error('[Radar] Failed to verify email:', error);
      alert('Failed to send verification email');
    }
  };

  // Handle custom message selection
  const handleTemplateSelect = (templateId: string) => {
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setEmailSettings(prev => ({ ...prev, customMessage: template.text }));
      setShowTemplateModal(false);
    }
  };

  // Handle navigation
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  if (isLoading) {
    return (
      <div className="radar-loading">
        {/* Skeleton Header */}
        <div className="skeleton-header">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-chain" />
        </div>

        {/* Skeleton Grid */}
        <div className="skeleton-grid">
          {/* Left - Wallet Cards Skeleton */}
          <div className="skeleton-card">
            <div className="skeleton-card-header">
              <div className="skeleton skeleton-avatar" />
              <div className="skeleton-card-info">
                <div className="skeleton skeleton-label" />
                <div className="skeleton skeleton-address" />
              </div>
            </div>
            <div className="skeleton-card-body">
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line-short" />
            </div>
            <div className="skeleton-card-footer">
              <div className="skeleton skeleton-toggle" />
              <div className="skeleton skeleton-delete" />
            </div>
          </div>

          {/* Duplicated for visual balance */}
          <div className="skeleton-card">
            <div className="skeleton-card-header">
              <div className="skeleton skeleton-avatar" />
              <div className="skeleton-card-info">
                <div className="skeleton skeleton-label" />
                <div className="skeleton skeleton-address" />
              </div>
            </div>
            <div className="skeleton-card-body">
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line-short" />
            </div>
            <div className="skeleton-card-footer">
              <div className="skeleton skeleton-toggle" />
              <div className="skeleton skeleton-delete" />
            </div>
          </div>

          {/* Right - Activity Skeleton */}
          <div className="skeleton-activity-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-activity-item">
                <div className="skeleton skeleton-activity-icon" />
                <div className="skeleton-activity-content">
                  <div className="skeleton-activity-main">
                    <div className="skeleton skeleton-activity-address" />
                    <div className="skeleton skeleton-activity-action" />
                  </div>
                  <div className="skeleton-activity-details">
                    <div className="skeleton skeleton-activity-amount" />
                    <div className="skeleton skeleton-activity-time" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
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
            <PlusIcon size={16} /> Add Wallet
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
            {alerts.length === 0 && (
              <div className="radar-empty">
                <div className="radar-empty-illustration">
                  <RadarEmptyIcon />
                </div>
                <h4 className="radar-empty-title">No wallets being tracked</h4>
                <p className="radar-empty-desc">
                  Add wallets to monitor their activity and receive alerts in real-time
                </p>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowAddModal(true)}
                >
                  <PlusIcon size={16} /> Add Your First Wallet
                </button>
              </div>
            )}
            {alerts.map((alert, index) => (
              <div 
                key={alert.id} 
                className={`wallet-card ${!alert.enabled ? 'paused' : ''}`}
                style={{ 
                  animationDelay: `${index * 0.05}s`,
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(10px)'
                }}
              >
                <div className="wallet-card-header">
                  <div className="wallet-card-icon">
                    <AlertTypeIcon type={alert.alertType} />
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
                    <CloseIcon size={16} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add New Card */}
            {alerts.length > 0 && (
              <div className="wallet-card add-card" onClick={() => setShowAddModal(true)}>
                <div className="add-icon">
                  <PlusIcon size={24} />
                </div>
                <div className="add-text">Add Wallet</div>
              </div>
            )}
          </div>

          {/* Email Settings - 4 Grid Boxes */}
          <div className="settings-grid">
            <div className="settings-box">
              <div className="box-header">
                <EmailIcon size={14} /> EMAIL NOTIFICATIONS
              </div>
              <div className="box-content">
                <label className="toggle-label">
                  <input 
                    type="checkbox" 
                    checked={emailSettings.enabled}
                    onChange={(e) => setEmailSettings({...emailSettings, enabled: e.target.checked})}
                  />
                  <span className="toggle-switch"></span>
                  <span className="toggle-text">{emailSettings.enabled ? 'On' : 'Off'}</span>
                </label>
              </div>
            </div>
            
            <div className="settings-box">
              <div className="box-header">
                <ClockIcon size={14} /> FREQUENCY
              </div>
              <div className="box-content">
                <select 
                  className="frequency-select"
                  defaultValue="instant"
                >
                  <option value="instant">Instant</option>
                  <option value="hourly">Hourly Digest</option>
                  <option value="daily">Daily Digest</option>
                </select>
              </div>
            </div>
            
            <div className="settings-box">
              <div className="box-header">
                <EmailIcon size={14} /> YOUR EMAIL
              </div>
              <div className="box-content">
                <div className="email-display">{emailSettings.address || 'Loading...'}</div>
              </div>
            </div>
            
            <div className="settings-box">
              <div className="box-header">
                <MessageIcon size={14} /> CUSTOM MESSAGE
              </div>
              <div className="box-content">
                <div className="custom-msg-display">
                  {emailSettings.customMessage || 'Using default template'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Live Activity */}
        <div className="radar-activity-section">
          <div className="section-header">
            <h3>LIVE ACTIVITY</h3>
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
                    {activity.alertLabel && (
                      <span className="activity-wallet-badge">{activity.alertLabel}</span>
                    )}
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
            <button className="banner-cta" onClick={() => navigateTo('/features')}>
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Add Wallet Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Alert</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Wallet Address</label>
                <input 
                  type="text" 
                  placeholder="Enter wallet address..."
                  className="form-input"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Label (optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g., My Wallet, Whale Target"
                  className="form-input"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Alert Type</label>
                <select 
                  className="form-select"
                  value={formData.alertType}
                  onChange={(e) => setFormData(prev => ({ ...prev, alertType: e.target.value }))}
                >
                  <option value="any_transaction">Any Transaction - Get notified of every action</option>
                  <option value="large_transfer">Large Transfer - Alerts when transfers exceed threshold</option>
                  <option value="token_swap">Token Swap - Notify on DEX trades</option>
                  <option value="nft_activity">NFT Activity - Mint, transfer, or sale events</option>
                  <option value="new_position">New DeFi Position - New lending/staking positions</option>
                </select>
              </div>
              <div className={`form-group threshold-group ${formData.alertType === 'large_transfer' ? 'visible' : ''}`}>
                <label>Threshold (USD)</label>
                <input 
                  type="number" 
                  placeholder="1000"
                  className="form-input"
                  value={formData.threshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, threshold: parseInt(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="modal-section-divider" />
              
              <div className="form-group">
                <label>Notification Email (optional)</label>
                <input 
                  type="email" 
                  placeholder={emailSettings.address || "your@email.com"}
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              
              <div className="form-group">
                <label>Alert Frequency</label>
                <select 
                  className="form-select"
                  value={formData.frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                >
                  <option value="instant">Instant - Get notified immediately</option>
                  <option value="hourly">Hourly Digest - Once per hour</option>
                  <option value="daily">Daily Digest - Once per day</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddAlert}>
                Add Alert
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Undo Toast */}
      {showUndoToast && (
        <div className="undo-toast">
          <span>Wallet removed</span>
          <button onClick={handleUndoDelete}>Undo</button>
        </div>
      )}

      {/* Custom Message Template Modal */}
      {showTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Custom Message Template</h3>
              <button className="modal-close" onClick={() => setShowTemplateModal(false)}>
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="template-desc">Select a template for your alert notifications:</p>
              <div className="template-list">
                {MESSAGE_TEMPLATES.map(template => (
                  <div 
                    key={template.id} 
                    className="template-item"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <div className="template-label">{template.label}</div>
                    {template.text && (
                      <div className="template-preview">{template.text}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadarView;
