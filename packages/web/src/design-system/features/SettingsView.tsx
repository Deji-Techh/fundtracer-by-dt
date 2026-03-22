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
      <div className="view-watermark">
        <svg className="watermark-logo" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2"/>
          <circle cx="20" cy="20" r="8" fill="currentColor"/>
          <circle cx="12" cy="12" r="4" fill="currentColor"/>
          <circle cx="28" cy="12" r="4" fill="currentColor"/>
          <circle cx="12" cy="28" r="4" fill="currentColor"/>
          <circle cx="28" cy="28" r="4" fill="currentColor"/>
          <line x1="12" y1="12" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="28" y1="12" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="12" y1="28" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="28" y1="28" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <span className="watermark-text">FundTracer</span>
      </div>
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
