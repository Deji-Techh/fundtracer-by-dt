import React, { useState, useEffect } from 'react';
import '../styles/AppShell.css';

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
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
}

export function AppShell({
  children,
  activeNav,
  onNavChange,
  navItems,
  walletConnected = false,
  walletAddress = '',
  onConnectWallet,
  onSearch
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery);
    }
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
        <div className="ft-wordmark">
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

          <div className="ft-topbar-wordmark">
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

          <form className="ft-search" onSubmit={handleSearch}>
            <div className="ft-search-ico">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="5" cy="5" r="3.5"/><path d="M8 8l2.5 2.5"/>
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="Search wallets, contracts, transactions, ENS…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="ft-search-shortcut">⌘K</span>
          </form>

          <div className="ft-topbar-gap"></div>

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

        {/* Content */}
        <main className="ft-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
