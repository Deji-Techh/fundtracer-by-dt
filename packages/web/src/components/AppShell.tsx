import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import '../styles/AppShell.css';
import { NotificationBell, NotificationPanel } from './notifications';
import { CHAIN_CONFIG, type ChainKey } from '../config/chains';
import { useIsMobile } from '../hooks/useIsMobile';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface AppShellProps {
  children: React.ReactNode;
  activeNav: string;
  onNavChange: (id: string) => void;
  navItems: NavItem[];
  walletConnected?: boolean;
  walletAddress?: string;
  onConnectWallet?: () => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchEnter?: () => void;
  chainBadge?: string;
  showAiButton?: boolean;
  onOpenAi?: () => void;
  selectedChain?: string;
  onChainChange?: (chain: string) => void;
}

export function AppShell({
  children,
  activeNav,
  onNavChange,
  navItems,
  walletConnected = false,
  walletAddress = '',
  onConnectWallet,
  searchPlaceholder,
  searchValue = '',
  onSearchChange,
  onSearchEnter,
  chainBadge,
  showAiButton = true,
  onOpenAi,
  selectedChain = 'linea',
  onChainChange
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const goToLanding = () => {
    navigate('/');
    closeSidebar();
  };

  return (
    <div className="ft-app">
      {/* Overlay */}
      <div 
        className={`ft-overlay ${sidebarOpen ? 'visible' : ''}`} 
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`ft-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="ft-wordmark" onClick={goToLanding} style={{ cursor: 'pointer' }}>
          <img 
            src="/logo.png" 
            alt="FundTracer" 
            className="ft-wordmark-icon"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="ft-wordmark-text">FundTracer</span>
        </div>

        {/* Network Selector */}
        <div className="ft-network-selector">
          <button 
            className="ft-network-btn"
            onClick={() => setNetworkDropdownOpen(!networkDropdownOpen)}
          >
            <span 
              className="ft-network-dot" 
              style={{ background: CHAIN_CONFIG[selectedChain as ChainKey]?.color || '#61dfff' }}
            />
            <span className="ft-network-name">
              {CHAIN_CONFIG[selectedChain as ChainKey]?.name || 'Linea'}
            </span>
            <svg 
              className={`ft-network-arrow ${networkDropdownOpen ? 'open' : ''}`}
              viewBox="0 0 10 10" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
            >
              <path d="M2 4l3 3 3-3" />
            </svg>
          </button>
          
          {networkDropdownOpen && (
            <div className="ft-network-dropdown">
              {Object.entries(CHAIN_CONFIG)
                .filter(([_, config]) => config.enabled)
                .sort((a, b) => a[1].priority - b[1].priority)
                .map(([key, config]) => (
                  <button
                    key={key}
                    className={`ft-network-option ${selectedChain === key ? 'active' : ''}`}
                    onClick={() => {
                      onChainChange?.(key);
                      setNetworkDropdownOpen(false);
                    }}
                  >
                    <span className="ft-network-dot" style={{ background: config.color }} />
                    <span>{config.name}</span>
                  </button>
                ))
              }
            </div>
          )}
        </div>

        <nav className="ft-sidebar-nav">
          {navItems.map((item, index) => {
            const isSectionHeader = item.id === 'section-analyze' || item.id === 'section-activity' || item.id === 'section-system';
            
            if (isSectionHeader) {
              return (
                <div key={item.id} className="ft-nav-section">
                  {item.label}
                </div>
              );
            }
            
            return (
              <button
                key={item.id}
                className={`ft-nav-link ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => {
                  onNavChange(item.id);
                  closeSidebar();
                }}
              >
                {item.icon}
                {item.label}
                {item.badge && item.badge > 0 && (
                  <span className="ft-nav-count">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="ft-sidebar-bottom">
          <button 
            className="ft-btn-connect"
            onClick={onConnectWallet}
          >
            {walletConnected ? 'Wallet Connected' : 'Connect Wallet'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="ft-main">
        {/* Topbar */}
        <header className="ft-topbar">
          <button 
            className="ft-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4h10M2 7h10M2 10h10"/>
            </svg>
          </button>

          <div className="ft-topbar-wordmark" onClick={goToLanding} style={{ cursor: 'pointer' }}>
            <img 
              src="/logo.png" 
              alt="FundTracer"
              style={{ width: 20, height: 20, objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            FundTracer
          </div>

          {searchPlaceholder !== undefined && (
            <div className="ft-topbar-search">
              {chainBadge && (
                <span className="ft-chain-badge">{chainBadge}</span>
              )}
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearchEnter?.()}
                className="ft-search-input"
              />
            </div>
          )}

          <div className="ft-topbar-gap"></div>

          {showAiButton && onOpenAi && !isMobile && (
            <button 
              className="ft-ai-trigger-new"
              onClick={onOpenAi}
              title="Open FundTracer AI"
            >
              <Zap size={18} />
            </button>
          )}
          <NotificationBell />

          <div className="ft-node-status">
            <div className="ft-node-dot"></div>
            All nodes live
          </div>

          <div className="ft-topbar-divider"></div>

          {walletConnected ? (
            <div className="ft-wallet-connected">
              <div className="ft-wallet-dot"></div>
              <span className="ft-wallet-addr">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
          ) : (
            <button 
              className="ft-btn-topbar-connect"
              onClick={onConnectWallet}
            >
              Connect Wallet
            </button>
          )}
        </header>

        <NotificationPanel />

        {/* Content */}
        <main className="ft-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
