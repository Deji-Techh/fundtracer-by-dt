import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Copy, Check, Trash2, Plus, Eye, EyeOff, AlertCircle, ExternalLink, Code, Loader2, User, LogOut, HelpCircle, ChevronDown, Mail } from 'lucide-react';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { useAuth } from '../contexts/AuthContext';
import { listApiKeys as serverListApiKeys, createApiKey as serverCreateApiKey, deleteApiKey as serverDeleteApiKey } from '../api';
import type { ApiKeyData } from '../api';
import './ApiKeysPage.css';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'API', href: '/api-docs', active: true },
  { label: 'CLI', href: '/cli' },
];

export function ApiKeysPage() {
  const { user, profile, signOutAccount, isAuthenticated } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<'live' | 'test'>('test');
  const [error, setError] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  
  // 2FA modal state
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true); // true = prompt for code
  const [pendingKeyName, setPendingKeyName] = useState('');

  useEffect(() => {
    if (user?.uid || isAuthenticated) {
      loadKeys();
    }
  }, [user?.uid, isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await serverListApiKeys();
      setKeys(result.keys || []);
    } catch (err) {
      console.error('Failed to load API keys:', err);
      setError('Failed to load API keys. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleShowKey = (id: string) => {
    setShowKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSignOut = async () => {
    if (signingOut) return; // Prevent double sign out
    setSigningOut(true);
    try {
      await signOutAccount();
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out error:', err);
      setSigningOut(false);
    }
  };

  const maskKey = (key: string) => {
    return key.replace(/(ft_(?:live|test)_).*(_[a-z0-9]{4})$/, '$1••••••••••••••••••••••••$2');
  };

  const formatDate = (date: Date | string | null): string => {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Never';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const FREE_TIER_KEY_LIMIT = 2;
  const isFreeTier = !profile?.tier || profile.tier === 'free';
  const hasReachedKeyLimit = isFreeTier && keys.length >= FREE_TIER_KEY_LIMIT;

  const handleCreateKey = async () => {
    if (!newKeyName.trim() || !user?.uid) return;
    if (hasReachedKeyLimit) {
      setError(`Free tier is limited to ${FREE_TIER_KEY_LIMIT} API keys. Upgrade to Pro or Max for unlimited keys.`);
      return;
    }
    
    setCreating(true);
    setError(null);
    try {
      // First try without 2FA code to check if 2FA is enabled
      const result = await serverCreateApiKey(newKeyName.trim(), newKeyType, undefined);
      
      if (!result.success && result.twoFactorEnabled === false) {
        // 2FA not enabled - show enable popup
        setShowTwoFactorModal(true);
        setTwoFactorEnabled(false);
        setTwoFactorError(null);
        setPendingKeyName(newKeyName.trim());
        setCreating(false);
        return;
      }
      
      if (!result.success && result.requiresCode) {
        // 2FA enabled but no code provided - show code input
        setShowTwoFactorModal(true);
        setTwoFactorEnabled(true);
        setTwoFactorError(null);
        setPendingKeyName(newKeyName.trim());
        setCreating(false);
        return;
      }
      
      if (result.success && result.key) {
        setKeys((prev) => [result.key!, ...prev]);
        setNewKeyName('');
        setShowTwoFactorModal(false);
        setTwoFactorCode('');
        setPendingKeyName('');
      } else {
        setError(result.error || 'Failed to create API key.');
      }
    } catch (err: any) {
      console.error('Failed to create API key:', err);
      
      // Check for 2FA-specific errors
      if (err.twoFactorEnabled === false) {
        setShowTwoFactorModal(true);
        setTwoFactorEnabled(false);
        setPendingKeyName(newKeyName.trim());
        setError(null);
      } else if (err.requiresCode) {
        setShowTwoFactorModal(true);
        setTwoFactorEnabled(true);
        setTwoFactorError(err.message || 'Please enter your 2FA code');
        setPendingKeyName(newKeyName.trim());
      } else if (err.status === 403) {
        setError(`Free tier is limited to ${FREE_TIER_KEY_LIMIT} API keys. Upgrade to Pro or Max for unlimited keys.`);
      } else {
        setError(err.message || 'Failed to create API key. Please try again.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleTwoFactorSubmit = async () => {
    if (!pendingKeyName) return;
    
    setCreating(true);
    setTwoFactorError(null);
    try {
      const result = await serverCreateApiKey(pendingKeyName, newKeyType, twoFactorCode);
      if (result.success && result.key) {
        setKeys((prev) => [result.key!, ...prev]);
        setNewKeyName('');
        setShowTwoFactorModal(false);
        setTwoFactorCode('');
        setPendingKeyName('');
      } else {
        setTwoFactorError(result.error || 'Failed to create API key.');
      }
    } catch (err: any) {
      setTwoFactorError(err.message || 'Invalid 2FA code. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleCloseTwoFactorModal = () => {
    setShowTwoFactorModal(false);
    setTwoFactorCode('');
    setTwoFactorError(null);
    setPendingKeyName('');
    setNewKeyName('');
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!user?.uid) return;
    
    try {
      await serverDeleteApiKey(keyId);
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (err) {
      console.error('Failed to delete API key:', err);
      setError('Failed to delete API key. Please try again.');
    }
  };

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="api-keys-page">
        <div className="api-keys-container">
          <motion.div
            className="api-keys-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="api-keys-header-row">
              <div className="api-keys-title">
                <Key size={32} strokeWidth={1.5} />
                <h1>API Keys</h1>
              </div>
              <div className="profile-dropdown" ref={profileRef}>
                <button 
                  className="profile-trigger"
                  onClick={() => setShowProfile(!showProfile)}
                >
                  {profile?.profilePicture || profile?.photoURL ? (
                    <img 
                      src={profile.profilePicture || profile.photoURL || ''} 
                      alt="Profile" 
                      className="profile-avatar"
                    />
                  ) : (
                    <div className="profile-avatar-placeholder">
                      <User size={20} />
                    </div>
                  )}
                  <ChevronDown size={16} className={`chevron ${showProfile ? 'open' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showProfile && (
                    <motion.div 
                      className="profile-menu"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="profile-info">
                        <div className="profile-header">
                          {profile?.profilePicture || profile?.photoURL ? (
                            <img 
                              src={profile.profilePicture || profile.photoURL || ''} 
                              alt="Profile" 
                              className="profile-avatar-large"
                            />
                          ) : (
                            <div className="profile-avatar-placeholder-large">
                              <User size={24} />
                            </div>
                          )}
                          <div className="profile-details">
                            <span className="profile-name">
                              {profile?.displayName || profile?.name || 'User'}
                            </span>
                            <span className="profile-email">
                              <Mail size={12} />
                              {profile?.email || user?.uid || 'No email'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="profile-menu-divider" />
                      <a href="mailto:support@fundtracer.xyz" className="profile-menu-item">
                        <HelpCircle size={18} />
                        <span>Contact Support</span>
                      </a>
                      <button className="profile-menu-item logout" onClick={handleSignOut} disabled={signingOut}>
                        {signingOut ? <Loader2 size={18} className="spinner" /> : <LogOut size={18} />}
                        <span>{signingOut ? 'Signing out...' : 'Log Out'}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <p>
              Manage your API keys for authenticating requests to the FundTracer API.
              Keep your keys secure and never share them publicly.
            </p>
          </motion.div>

          <motion.div
            className="api-keys-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="api-keys-create">
              <h2>Create New API Key</h2>
              {hasReachedKeyLimit ? (
                <div className="create-notice create-notice--limit">
                  <AlertCircle size={16} />
                  <span>
                    Free tier is limited to {FREE_TIER_KEY_LIMIT} API keys. You have reached your limit.{' '}
                    <a href="/pricing" style={{ color: 'inherit', textDecoration: 'underline' }}>
                      Upgrade to Pro or Max
                    </a>{' '}
                    for unlimited keys.
                  </span>
                </div>
              ) : (
              <div className="create-form">
                <input
                  type="text"
                  placeholder="Key name (e.g., Production, Development)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="create-input"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                />
                <div className="type-selector">
                  <button
                    className={`type-btn ${newKeyType === 'test' ? 'active' : ''}`}
                    onClick={() => setNewKeyType('test')}
                  >
                    Test Key
                  </button>
                  <button
                    className={`type-btn ${newKeyType === 'live' ? 'active' : ''}`}
                    onClick={() => setNewKeyType('live')}
                  >
                    Live Key
                  </button>
                </div>
                <button 
                  className="create-btn" 
                  onClick={handleCreateKey}
                  disabled={creating || !newKeyName.trim()}
                >
                  {creating ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                  Create Key
                </button>
              </div>
              )}
              <div className="create-notice">
                <AlertCircle size={16} />
                <span>
                  {newKeyType === 'test'
                    ? 'Test keys are for development only and do not count against rate limits.'
                    : 'Live keys are for production use and will count against your rate limits.'}
                  {isFreeTier && ` Free tier limited to ${FREE_TIER_KEY_LIMIT} keys.`}
                </span>
              </div>
            </div>

            <div className="api-keys-list">
              <h2>
                Your API Keys
                {isFreeTier && <span className="key-count-badge">{keys.length}/{FREE_TIER_KEY_LIMIT}</span>}
              </h2>
              {loading ? (
                <div className="loading-keys">
                  <Loader2 size={32} className="spin" />
                  <p>Loading your API keys...</p>
                </div>
              ) : error ? (
                <div className="error-state">
                  <AlertCircle size={32} />
                  <p>{error}</p>
                  <button onClick={loadKeys} className="retry-btn">
                    Try Again
                  </button>
                </div>
              ) : keys.length === 0 ? (
                <div className="no-keys">
                  <Key size={48} strokeWidth={1} />
                  <p>No API keys yet. Create your first key above.</p>
                </div>
              ) : (
                <div className="keys-grid">
                  {keys.map((apiKey, index) => (
                    <motion.div
                      key={apiKey.id}
                      className="api-key-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="key-card-header">
                        <div className="key-info">
                          <h3>{apiKey.name}</h3>
                          <span className={`key-type ${apiKey.type}`}>
                            {apiKey.type === 'live' ? 'Live' : 'Test'}
                          </span>
                        </div>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteKey(apiKey.id)}
                          title="Delete key"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="key-value">
                        <code>
                          {showKey[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                        </code>
                        <button
                          className="toggle-visibility-btn"
                          onClick={() => toggleShowKey(apiKey.id)}
                          title={showKey[apiKey.id] ? 'Hide key' : 'Show key'}
                        >
                          {showKey[apiKey.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          className="copy-btn"
                          onClick={() => handleCopy(apiKey.key, apiKey.id)}
                          title="Copy key"
                        >
                          {copied === apiKey.id ? (
                            <Check size={16} className="copied" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                      <div className="key-stats">
                        <div className="stat">
                          <span className="stat-label">Created</span>
                          <span className="stat-value">{formatDate(apiKey.createdAt)}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Last Used</span>
                          <span className="stat-value">
                            {formatDate(apiKey.lastUsed)}
                          </span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Requests</span>
                          <span className="stat-value">
                            {apiKey.requests.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="api-keys-security">
              <h2>Security Best Practices</h2>
              <ul>
                <li>Never expose your API keys in client-side code or public repositories</li>
                <li>Use environment variables to store your API keys</li>
                <li>Use test keys for development and live keys only in production</li>
                <li>Rotate your keys regularly or immediately if compromised</li>
                <li>Monitor your API usage for any unexpected activity</li>
              </ul>
            </div>

            <div className="api-keys-documentation">
              <h2>Documentation</h2>
              <p>Learn how to integrate FundTracer API into your applications</p>
              <div className="doc-links">
                <a href="/api/docs" className="doc-link" target="_blank" rel="noopener noreferrer">
                  <div className="doc-link-icon">
                    <ExternalLink size={20} />
                  </div>
                  <div className="doc-link-content">
                    <h3>API Reference</h3>
                    <p>Explore all available endpoints and parameters</p>
                  </div>
                </a>
                <a href="/api-docs#authentication" className="doc-link">
                  <div className="doc-link-icon">
                    <Key size={20} />
                  </div>
                  <div className="doc-link-content">
                    <h3>Authentication</h3>
                    <p>Learn how to authenticate your API requests</p>
                  </div>
                </a>
                <a href="/api-docs#sdks" className="doc-link">
                  <div className="doc-link-icon">
                    <Code size={20} />
                  </div>
                  <div className="doc-link-content">
                    <h3>SDKs & Libraries</h3>
                    <p>Official SDKs for JavaScript, Python, and more</p>
                  </div>
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 2FA Modal */}
      <AnimatePresence>
        {showTwoFactorModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseTwoFactorModal}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e: any) => e.stopPropagation()}
            >
              {!twoFactorEnabled ? (
                // 2FA not enabled - show enable prompt
                <>
                  <div className="modal-header">
                    <AlertCircle size={48} strokeWidth={1.5} />
                    <h2>2FA Required</h2>
                  </div>
                  <div className="modal-body">
                    <p>Two-factor authentication is required to create API keys.</p>
                    <p>Please enable 2FA in your account settings to continue.</p>
                  </div>
                  <div className="modal-footer">
                    <a href="/app-evm?tab=settings" className="btn btn-primary">
                      Enable 2FA in Settings
                    </a>
                    <button className="btn btn-secondary" onClick={handleCloseTwoFactorModal}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                // 2FA enabled - show code input
                <>
                  <div className="modal-header">
                    <AlertCircle size={48} strokeWidth={1.5} />
                    <h2>2FA Verification</h2>
                  </div>
                  <div className="modal-body">
                    <p>Enter your 2FA code to create an API key</p>
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter 2FA code"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        autoFocus
                      />
                    </div>
                    {twoFactorError && <p className="error-text">{twoFactorError}</p>}
                  </div>
                  <div className="modal-footer">
                    <button 
                      className="btn btn-primary" 
                      onClick={handleTwoFactorSubmit}
                      disabled={creating || twoFactorCode.length < 6}
                    >
                      {creating ? <Loader2 size={18} className="spinner" /> : 'Verify & Create'}
                    </button>
                    <button className="btn btn-secondary" onClick={handleCloseTwoFactorModal}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LandingLayout>
  );
}

export default ApiKeysPage;
