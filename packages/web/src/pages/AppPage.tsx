import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from '../contexts/AuthContext';
import AppShell from '../components/AppShell';
import Loader from '../components/Loader';
import InvestigateView from '../design-system/features/InvestigateView';

type TabType = 'investigate' | 'portfolio' | 'polymarket' | 'solana' | 'history' | 'settings';

const PortfolioView = lazy(() => import('../design-system/features/PortfolioView'));
const PolymarketView = lazy(() => import('../design-system/features/PolymarketView'));
const HistoryView = lazy(() => import('../design-system/features/HistoryView'));
const SettingsView = lazy(() => import('../design-system/features/SettingsView'));

export function AppPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const appKit = useAppKit();
  const { open } = appKit;
  const { address, isConnected } = useAppKitAccount();

  const [activeTab, setActiveTab] = useState<TabType>('investigate');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    if (isConnected && address) {
      setIsWalletConnected(true);
      setWalletAddress(address);
    } else {
      setIsWalletConnected(false);
      setWalletAddress('');
    }
  }, [isConnected, address]);

  const handleConnectWallet = useCallback(() => {
    if (!isWalletConnected) {
      open();
    }
  }, [isWalletConnected, open]);

  const handleAnalyze = useCallback((address: string, chain: string) => {
    console.log('Analyzing:', address, 'on chain:', chain);
    // Navigate to the analyze view with the address
    navigate(`/app-evm?address=${address}&chain=${chain}`);
  }, [navigate]);

  const handleSearch = useCallback((query: string) => {
    console.log('Searching:', query);
    // Handle search - could navigate or trigger analysis
  }, []);

  const navItems = [
    { id: 'section-analyze', label: 'Analyze', icon: null },
    { id: 'investigate', label: 'Investigate', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="6" cy="6" r="4"/><path d="M9.5 9.5l3 3"/>
      </svg>
    )},
    { id: 'portfolio', label: 'Portfolio', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="2" width="12" height="10" rx="1"/>
        <path d="M4 6h6M4 8.5h4"/>
      </svg>
    )},
    { id: 'polymarket', label: 'Polymarket', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="4" cy="7" r="2.5"/><circle cx="10" cy="7" r="2.5"/>
        <path d="M6.5 7h1"/>
      </svg>
    )},
    { id: 'solana', label: 'Solana', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 7h10M7 2l4 5-4 5-4-5z"/>
      </svg>
    ), onClick: () => navigate('/app-solana') },
    { id: 'section-activity', label: 'Activity', icon: null },
    { id: 'history', label: 'History', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 10L4 6l3 3 2.5-4.5L13 7"/>
      </svg>
    ), badge: 3 },
    { id: 'section-system', label: 'System', icon: null },
    { id: 'settings', label: 'Settings', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="7" r="2"/>
        <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.9 2.9l1.4 1.4M9.7 9.7l1.4 1.4M2.9 11.1l1.4-1.4M9.7 4.3l1.4-1.4"/>
      </svg>
    )},
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'investigate':
        return <InvestigateView />;
      case 'portfolio':
        return <Suspense fallback={<div className="ft-page-head"><div className="ft-page-title">Loading...</div></div>}><PortfolioView /></Suspense>;
      case 'polymarket':
        return <Suspense fallback={<div className="ft-page-head"><div className="ft-page-title">Loading...</div></div>}><PolymarketView /></Suspense>;
      case 'history':
        return <Suspense fallback={<div className="ft-page-head"><div className="ft-page-title">Loading...</div></div>}><HistoryView onSelectScan={() => {}} /></Suspense>;
      case 'settings':
        return <Suspense fallback={<div className="ft-page-head"><div className="ft-page-title">Loading...</div></div>}><SettingsView onConnectWallet={handleConnectWallet} isWalletConnected={isWalletConnected} walletAddress={walletAddress} /></Suspense>;
      default:
        return <InvestigateView />;
    }
  };

  return (
    <>
      {showLoader && <Loader onComplete={() => setShowLoader(false)} />}
      <AppShell
        activeNav={activeTab}
        onNavChange={(id) => {
          const item = navItems.find(n => n.id === id);
          if (item && (item as any).onClick) {
            (item as any).onClick();
          } else {
            setActiveTab(id as TabType);
          }
        }}
        navItems={navItems}
        walletConnected={isWalletConnected}
        walletAddress={walletAddress}
        onConnectWallet={handleConnectWallet}
        onSearch={handleSearch}
      >
        {renderContent()}
      </AppShell>
    </>
  );
}

export default AppPage;
