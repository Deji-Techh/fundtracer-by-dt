/**
 * SettingsView - Account settings using new design system
 * Full redesign to match InvestigateView layout
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotify } from '../../contexts/ToastContext';
import { getAuthToken } from '../../api';
import './SettingsView.css';

type SettingsTab = 'profile' | 'account' | 'preferences' | 'security';
type SecurityAction = 'none' | 'enable' | 'verify' | 'disable';

interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  manualEntry: string;
}

export function SettingsView() {
  const { user, profile, refreshProfile, signOut, signOutAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { success: notifySuccess, error: notifyError } = useNotify();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [name, setName] = useState(profile?.username || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [securityAction, setSecurityAction] = useState<SecurityAction>('none');
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTwoFactorStatus();
  }, []);

  const fetchTwoFactorStatus = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/user/2fa/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTwoFactorEnabled(data.enabled || false);
    } catch (err) {
      console.error('Failed to fetch 2FA status:', err);
    }
  };

  const handleStart2FA = async () => {
    setTwoFactorLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/user/2fa/setup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setTwoFactorSetup(data.setup);
        setSecurityAction('verify');
        notifySuccess('2FA setup initiated');
      } else {
        notifyError(data.error || 'Failed to setup 2FA');
      }
    } catch (err) {
      notifyError('Failed to setup 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      notifyError('Please enter a 6-digit code');
      return;
    }

    setTwoFactorLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/user/2fa/verify', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verificationCode })
      });
      const data = await res.json();
      
      if (data.success) {
        setBackupCodes(data.backupCodes || []);
        setShowBackupCodes(true);
        setTwoFactorEnabled(true);
        setSecurityAction('none');
        setTwoFactorSetup(null);
        setVerificationCode('');
        notifySuccess('2FA enabled successfully!');
      } else {
        notifyError(data.error || 'Invalid code');
      }
    } catch (err) {
      notifyError('Failed to verify 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'fundtracer') {
      notifyError('Please type "fundtracer" to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verificationCode })
      });
      const data = await res.json();
      
      if (data.success) {
        notifySuccess('Account deleted successfully');
        // Redirect to home or sign out
        window.location.href = '/';
      } else {
        notifyError(data.error || 'Failed to delete account');
      }
    } catch (err) {
      notifyError('Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      notifyError('Please enter your 2FA code or a backup code');
      return;
    }

    setTwoFactorLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verificationCode })
      });
      const data = await res.json();
      
      if (data.success) {
        setTwoFactorEnabled(false);
        setSecurityAction('none');
        setVerificationCode('');
        notifySuccess('2FA disabled successfully');
      } else {
        notifyError(data.error || 'Failed to disable 2FA');
      }
    } catch (err) {
      notifyError('Failed to disable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await refreshProfile();
      notifySuccess('Profile updated successfully');
    } catch (error) {
      notifyError('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="investigate-view">
      {/* Page Header */}
      <div className="page-head">
        <div className="page-title">Settings</div>
        <div className="page-desc">Manage your account, preferences, and security settings</div>
      </div>

      {/* Stats Grid */}
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Account Status</div>
          <div className="stat-val">{profile?.tier || 'Free'}</div>
          <div className="stat-note">Current plan</div>
        </div>
        <div className="stat">
          <div className="stat-label">API Keys</div>
          <div className="stat-val">2</div>
          <div className="stat-note">Included</div>
        </div>
        <div className="stat">
          <div className="stat-label">Daily Queries</div>
          <div className="stat-val">0</div>
          <div className="stat-note">Used today</div>
        </div>
        <div className="stat">
          <div className="stat-label">Security</div>
          <div className="stat-val">{twoFactorEnabled ? 'Protected' : 'Basic'}</div>
          <div className="stat-note">{twoFactorEnabled ? '2FA enabled' : 'No 2FA'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Profile
        </button>
        <button 
          className={`tab ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Account
        </button>
        <button 
          className={`tab ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Preferences
        </button>
        <button 
          className={`tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Security
        </button>
      </div>

      {/* Panel */}
      <div className="panel">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="panel-content">
            <div className="panel-section">
              <div className="panel-section-header">
                <h3>Profile Information</h3>
                <p>Update your personal information</p>
              </div>
              <div className="form-group">
                <label>Display Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={profile?.email || 'Not available'}
                  disabled
                  className="form-input disabled"
                />
                <span className="form-hint">Email cannot be changed</span>
              </div>
              <button 
                className="btn-primary"
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="panel-content">
            <div className="panel-section">
              <div className="panel-section-header">
                <h3>Subscription Plan</h3>
                <p>Manage your subscription</p>
              </div>
              <div className="plan-card">
                <div className="plan-info">
                  <div className="plan-name">
                    <span>{profile?.tier || 'Free'}</span>
                    <span className="plan-badge">Current</span>
                  </div>
                  <div className="plan-details">Unlimited analyses on all features</div>
                </div>
                <button className="btn-secondary">Upgrade Plan</button>
              </div>
            </div>

            <div className="panel-section">
              <div className="panel-section-header">
                <h3>Connected Wallet</h3>
                <p>Manage your connected wallet</p>
              </div>
              {profile?.walletAddress ? (
                <div className="wallet-info">
                  <div className="wallet-address">{profile.walletAddress}</div>
                  <div className="wallet-status">Connected</div>
                  <button className="btn-secondary" onClick={signOut} style={{ marginTop: '12px' }}>
                    Sign Out Wallet
                  </button>
                </div>
              ) : (
                <button className="btn-primary" onClick={signOut}>
                  Connect Wallet
                </button>
              )}
              <button className="btn-secondary" onClick={signOutAccount} style={{ marginTop: '12px' }}>
                Sign Out Account
              </button>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="panel-content">
            <div className="panel-section">
              <div className="panel-section-header">
                <h3>Appearance</h3>
                <p>Customize how the app looks</p>
              </div>
              <div className="preference-row">
                <div className="preference-info">
                  <span className="preference-label">Dark Mode</span>
                  <span className="preference-desc">Use dark theme</span>
                </div>
                <button 
                  className={`toggle-switch ${theme === 'dark' ? 'active' : ''}`}
                  onClick={toggleTheme}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            </div>

            <div className="panel-section">
              <div className="panel-section-header">
                <h3>Notifications</h3>
                <p>Manage notification preferences</p>
              </div>
              <div className="preference-row">
                <div className="preference-info">
                  <span className="preference-label">Email Notifications</span>
                  <span className="preference-desc">Receive updates via email</span>
                </div>
                <button className="toggle-switch active">
                  <span className="toggle-knob" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="panel-content">
            {/* 2FA Section */}
            {securityAction === 'none' && !twoFactorEnabled && (
              <div className="panel-section">
                <div className="panel-section-header">
                  <h3>Two-Factor Authentication</h3>
                  <p>Add an extra layer of security to your account</p>
                </div>
                <p className="twofa-desc">
                  Protect your account with an authenticator app like Google Authenticator, Authy, or 1Password.
                </p>
                <button 
                  className="btn-primary" 
                  onClick={handleStart2FA}
                  disabled={twoFactorLoading}
                >
                  {twoFactorLoading ? 'Loading...' : 'Enable 2FA'}
                </button>
              </div>
            )}

            {/* 2FA Setup - Show QR Code */}
            {securityAction === 'verify' && twoFactorSetup && !showBackupCodes && (
              <div className="panel-section">
                <div className="panel-section-header">
                  <h3>Setup Authenticator App</h3>
                  <p>Scan the QR code with your authenticator app</p>
                </div>
                
                <div className="twofa-qr-section">
                  <div className="twofa-qr-code">
                    <img src={twoFactorSetup.qrCode} alt="2FA QR Code" />
                  </div>
                  
                  <div className="twofa-manual">
                    <p className="twofa-manual-label">Can't scan? Enter this code manually:</p>
                    <code className="twofa-secret">{twoFactorSetup.manualEntry}</code>
                    <button 
                      className="btn-copy"
                      onClick={() => {
                        navigator.clipboard.writeText(twoFactorSetup.manualEntry);
                        notifySuccess('Copied to clipboard');
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="twofa-verify-section">
                  <label className="form-label">Enter 6-digit code</label>
                  <input 
                    type="text" 
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="form-input twofa-input"
                    maxLength={6}
                  />
                  <div className="twofa-actions">
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        setSecurityAction('none');
                        setTwoFactorSetup(null);
                        setVerificationCode('');
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn-primary"
                      onClick={handleVerify2FA}
                      disabled={twoFactorLoading || verificationCode.length !== 6}
                    >
                      {twoFactorLoading ? 'Verifying...' : 'Verify & Enable'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Show Backup Codes */}
            {showBackupCodes && backupCodes.length > 0 && (
              <div className="panel-section">
                <div className="panel-section-header">
                  <h3>Backup Codes</h3>
                  <p>Save these codes in a safe place. You can use them to access your account if you lose your authenticator.</p>
                </div>
                
                <div className="backup-codes-grid">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="backup-code">{code}</code>
                  ))}
                </div>
                
                <button 
                  className="btn-primary"
                  onClick={() => {
                    const text = backupCodes.join('\n');
                    navigator.clipboard.writeText(text);
                    notifySuccess('Backup codes copied');
                  }}
                >
                  Copy All Codes
                </button>
                
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setShowBackupCodes(false);
                    setBackupCodes([]);
                  }}
                  style={{ marginTop: '12px' }}
                >
                  I've Saved My Codes
                </button>
              </div>
            )}

            {/* 2FA Already Enabled - Show Disable Option */}
            {securityAction === 'none' && twoFactorEnabled && (
              <div className="panel-section">
                <div className="panel-section-header">
                  <h3>Two-Factor Authentication</h3>
                  <p>Your account is protected with 2FA</p>
                </div>
                <div className="twofa-status">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>2FA is enabled</span>
                </div>
                <button 
                  className="btn-danger"
                  onClick={() => setSecurityAction('disable')}
                >
                  Disable 2FA
                </button>
              </div>
            )}

            {/* Disable 2FA */}
            {securityAction === 'disable' && (
              <div className="panel-section">
                <div className="panel-section-header">
                  <h3>Disable 2FA</h3>
                  <p>Enter your 2FA code or a backup code to disable</p>
                </div>
                
                <div className="form-group">
                  <label className="form-label">2FA Code or Backup Code</label>
                  <input 
                    type="text" 
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.toUpperCase().slice(0, 8))}
                    placeholder="000000 or ABC123"
                    className="form-input"
                  />
                </div>
                
                <div className="twofa-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      setSecurityAction('none');
                      setVerificationCode('');
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-danger"
                    onClick={handleDisable2FA}
                    disabled={twoFactorLoading}
                  >
                    {twoFactorLoading ? 'Processing...' : 'Disable 2FA'}
                  </button>
                </div>
              </div>
            )}



            {/* Danger Zone */}
            {!showDeleteConfirm ? (
              <div className="panel-section danger">
                <div className="panel-section-header">
                  <h3>Danger Zone</h3>
                  <p>Irreversible account actions</p>
                </div>
                <button 
                  className="btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Account
                </button>
              </div>
            ) : (
              <div className="panel-section danger">
                <div className="panel-section-header">
                  <h3>Delete Account</h3>
                  <p>This action cannot be undone. All your data will be permanently deleted.</p>
                </div>
                
                <div className="delete-confirm-warning">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>This is a permanent action</span>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Type <code>fundtracer</code> to confirm deletion
                  </label>
                  <input 
                    type="text" 
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="fundtracer"
                    className="form-input"
                  />
                </div>

                {twoFactorEnabled && (
                  <div className="form-group">
                    <label className="form-label">
                      Enter 2FA code (required)
                    </label>
                    <input 
                      type="text" 
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="form-input"
                      maxLength={6}
                    />
                  </div>
                )}

                <div className="twofa-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                      setVerificationCode('');
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-danger"
                    onClick={handleDeleteAccount}
                    disabled={
                      deleteConfirmText.toLowerCase() !== 'fundtracer' || 
                      isDeleting ||
                      (twoFactorEnabled && (!verificationCode || verificationCode.length !== 6))
                    }
                  >
                    {isDeleting ? 'Deleting...' : 'Delete My Account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsView;
