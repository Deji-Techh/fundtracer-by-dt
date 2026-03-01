import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { trackVisit } from './api';

import TopNav from './components/CoinGecko/TopNav';
import HomePage from './components/CoinGecko/HomePage';
import SybilPage from './components/CoinGecko/SybilPage';

const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));

import ComingSoonModal from './components/ComingSoonModal';
import OnboardingModal from './components/OnboardingModal';
import FeedbackModal from './components/FeedbackModal';
import PaymentModal from './components/PaymentModal';
import FirstTimeModal from './components/FirstTimeModal';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import { PoHVerificationModal } from './components/PoHVerificationModal';

import './global.css';

const PortfolioAnalytics = lazy(() => import('./components/PortfolioAnalytics').then(m => ({ default: m.PortfolioAnalytics })));

import SettingsPage from './components/SettingsPage';
import HistoryPage from './components/HistoryPage';
import { PageLoading } from './components/common/PageLoading';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';

type TabType = 'home' | 'portfolio' | 'sybil' | 'history' | 'settings';

export default function EVMTabs() {
  const location = useLocation();
  const pathname = location.pathname;
  
  // Static pages for /app-evm
  if (pathname === '/app-evm/terms' || pathname === '/terms') {
    return <TermsPage />;
  }
  if (pathname === '/app-evm/privacy' || pathname === '/app-evm/privacypolicy' || pathname === '/privacy' || pathname === '/privacypolicy') {
    return pathname === '/app-evm/privacypolicy' || pathname === '/privacypolicy' ? <PrivacyPolicyPage /> : <PrivacyPage />;
  }
  
  // EVM tabs
  return <EVMMainApp />;
}

function EVMMainApp() {
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const appKit = useAppKit();
  const { open } = appKit;
  const { address, isConnected } = useAppKitAccount();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('sybil');
  
  const [prefillAddress, setPrefillAddress] = useState<string>('');
  const [prefillChain, setPrefillChain] = useState<string>('');
  const [prefillType, setPrefillType] = useState<string>('');
  
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key === 'k') {
        e.preventDefault();
        if (activeTab !== 'home') setActiveTab('sybil');
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
      if (e.key === 'Escape') setShowKeyboardShortcuts(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  useEffect(() => {
    try { (appKit as any).setThemeMode(theme); } catch {}
  }, [theme, appKit]);

  useEffect(() => {
    if (isConnected && address) {
      setIsWalletConnected(true);
      setWalletAddress(address);
    } else {
      setIsWalletConnected(false);
      setWalletAddress('');
    }
  }, [isConnected, address]);
  
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showFirstTime, setShowFirstTime] = useState(false);
  const [showPoHModal, setShowPoHModal] = useState(false);
  const pohCheckDone = useRef(false);
  const wasJustConnected = useRef(false);

  useEffect(() => { trackVisit(); }, []);
  useEffect(() => {
    if (user && !localStorage.getItem('fundtracer_onboarding_complete')) setShowOnboarding(true);
  }, [user]);
  useEffect(() => {
    if (isAuthenticated && profile && profile.isVerified === false && !pohCheckDone.current && wasJustConnected.current) {
      pohCheckDone.current = true;
      const timer = setTimeout(() => { if (!showOnboarding) setShowPoHModal(true); }, 500);
      return () => clearTimeout(timer);
    }
    if (!isAuthenticated) { pohCheckDone.current = false; wasJustConnected.current = false; }
  }, [isAuthenticated, profile, showOnboarding]);

  const isMobileDevice = useCallback(() => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent), []);
  const isWalletBrowser = useCallback(() => {
    const w = window as any;
    return !!(w.ethereum?.isMetaMask && w.ethereum?.isConnected?.()) || !!(w.ethereum?.isTrust) || !!(w.ethereum?.isCoinbaseWallet) || !!(w.ethereum?.isRabby);
  }, []);

  const handleConnectWallet = useCallback(() => {
    if (!isWalletConnected) {
      wasJustConnected.current = true;
      open();
    }
  }, [isWalletConnected, open]);

  const renderMainContent = () => {
    if (authLoading) {
      return <div className="main-content"><div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}><div className="loading-spinner" /></div></div>;
    }

    return (
      <>
        <div style={{ display: activeTab === 'home' ? 'block' : 'none', backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
          <HomePage />
        </div>
        <div style={{ display: activeTab === 'portfolio' ? 'block' : 'none' }} className="main-content">
          <Suspense fallback={<PageLoading />}><PortfolioAnalytics walletAddress={walletAddress} /></Suspense>
        </div>
        <div style={{ display: activeTab === 'history' ? 'block' : 'none' }} className="main-content">
          <HistoryPage onSelectScan={(address, chain, type) => { setPrefillAddress(address); setPrefillChain(chain); setPrefillType(type || ''); setActiveTab('sybil'); }} />
        </div>
        <div style={{ display: activeTab === 'sybil' ? 'block' : 'none' }} className="main-content">
          <SybilPage user={user} profile={profile} onConnectWallet={handleConnectWallet} isWalletConnected={isWalletConnected} walletAddress={walletAddress} prefillAddress={prefillAddress} prefillChain={prefillChain} prefillType={prefillType} onPrefillConsumed={() => { setPrefillAddress(''); setPrefillChain(''); setPrefillType(''); }} />
        </div>
        <div style={{ display: activeTab === 'settings' ? 'block' : 'none' }} className="main-content">
          <SettingsPage onConnectWallet={handleConnectWallet} isWalletConnected={isWalletConnected} walletAddress={walletAddress} onUpgrade={() => setShowPayment(true)} />
        </div>
      </>
    );
  };

  const mainContent = (
    <>
      {renderMainContent()}
      {activeTab !== 'home' && activeTab !== 'sybil' && (
        <footer style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', fontSize: '0.875rem', display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' as const }}>
          <span>&copy; {new Date().getFullYear()} FundTracer by DT</span>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <a href="/app-evm/privacypolicy" style={{ color: 'var(--color-text-muted)', textDecoration: 'underline' }}>Privacy Policy</a>
        </footer>
      )}
    </>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {activeTab !== 'home' && <TopNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as TabType)} />}
      {activeTab !== 'home' ? (
        <div style={{ paddingTop: '56px', paddingBottom: '80px' }}>
          {mainContent}
        </div>
      ) : mainContent}
      {showComingSoon && <ComingSoonModal onClose={() => setShowComingSoon(false)} />}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      {showFirstTime && <FirstTimeModal onClose={() => setShowFirstTime(false)} />}
      <PoHVerificationModal isOpen={showPoHModal} onClose={() => setShowPoHModal(false)} walletAddress={walletAddress} />
      <KeyboardShortcuts isOpen={showKeyboardShortcuts} onClose={() => setShowKeyboardShortcuts(false)} />
    </div>
  );
}
