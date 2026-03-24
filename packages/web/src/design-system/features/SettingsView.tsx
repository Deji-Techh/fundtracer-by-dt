/**
 * SettingsView - Account settings using new design system
 * Full redesign to match InvestigateView layout
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotify } from '../../contexts/ToastContext';
import './SettingsView.css';

type SettingsTab = 'profile' | 'account' | 'preferences' | 'security';

export function SettingsView() {
  const { user, profile, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { success: notifySuccess, error: notifyError } = useNotify();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [name, setName] = useState(profile?.username || '');
  const [isSaving, setIsSaving] = useState(false);

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
          <div className="stat-val">Active</div>
          <div className="stat-note">2FA enabled</div>
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
                </div>
              ) : (
                <button className="btn-primary">Connect Wallet</button>
              )}
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
            <div className="panel-section">
              <div className="panel-section-header">
                <h3>Password</h3>
                <p>Change your password</p>
              </div>
              <button className="btn-secondary">Change Password</button>
            </div>

            <div className="panel-section">
              <div className="panel-section-header">
                <h3>Two-Factor Authentication</h3>
                <p>Add an extra layer of security</p>
              </div>
              <button className="btn-secondary">Enable 2FA</button>
            </div>

            <div className="panel-section danger">
              <div className="panel-section-header">
                <h3>Danger Zone</h3>
                <p>Irreversible account actions</p>
              </div>
              <button className="btn-danger">Delete Account</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsView;
