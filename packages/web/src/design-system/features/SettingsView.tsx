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
      <div className="settings-view__header">
        <h1 className="settings-view__title">Settings</h1>
        <p className="settings-view__subtitle">
          Manage your account, preferences, and connected services
        </p>
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
