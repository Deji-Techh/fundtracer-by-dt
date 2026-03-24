/**
 * SettingsView - Account settings using new design system
 * Wraps existing SettingsPage with design system integration
 */

import React from 'react';
import './SettingsView.css';

// Import the existing component directly
import SettingsPage from '../../components/SettingsPage';

interface SettingsViewProps {
  onConnectWallet: () => void;
  isWalletConnected: boolean;
  walletAddress: string;
  onUpgrade?: () => void;
}

export function SettingsView({ 
  onConnectWallet, 
  isWalletConnected, 
  walletAddress, 
  onUpgrade 
}: SettingsViewProps) {
  return (
    <div className="settings-view">
      {/* Header */}
      <div className="page-head">
        <h1 className="page-title">Settings</h1>
        <p className="page-desc">
          Manage your account, preferences, and connected services
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Account Status</div>
          <div className="stat-val">Active</div>
        </div>
        <div className="stat">
          <div className="stat-label">API Keys</div>
          <div className="stat-val">2</div>
        </div>
        <div className="stat">
          <div className="stat-label">Daily Queries</div>
          <div className="stat-val">0</div>
        </div>
        <div className="stat">
          <div className="stat-label">Member Since</div>
          <div className="stat-val">Today</div>
        </div>
      </div>

      {/* Content */}
      <div className="settings-view__content">
        <SettingsPage
          onConnectWallet={onConnectWallet}
          isWalletConnected={isWalletConnected}
          walletAddress={walletAddress}
          onUpgrade={onUpgrade}
        />
      </div>
    </div>
  );
}

export default SettingsView;
