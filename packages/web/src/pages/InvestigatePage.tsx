/**
 * InvestigatePage - Main app dashboard (Arkham-style)
 * Replaces EVMTabs.tsx with new design system
 */

import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { trackVisit } from '../api';
import {
  IntelLayout,
  Badge,
  Panel,
  StatBlock,
  StatGrid,
  SearchResult
} from '../design-system';
import './InvestigatePage.css';

// Lazy load heavy components
const TermsPage = lazy(() => import('./TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./PrivacyPage').then(m => ({ default: m.PrivacyPage })));

// Modals
import OnboardingModal from '../components/OnboardingModal';
import FeedbackModal from '../components/FeedbackModal';
import PaymentModal from '../components/PaymentModal';
import { PoHVerificationModal } from '../components/PoHVerificationModal';
import { KeyboardShortcuts } from '../components/KeyboardShortcuts';
import { PageLoading } from '../components/common/PageLoading';
import PrivacyPolicyPage from '../components/PrivacyPolicyPage';

// Import the new design system feature views
import { 
  InvestigateView, 
  PortfolioView, 
  PolymarketView,
  HistoryView,
  SettingsView 
} from '../design-system/features';

type TabType = 'investigate' | 'portfolio' | 'polymarket' | 'history' | 'settings';

// Nav icons as inline SVG components
const InvestigateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="9" cy="9" r="6"/>
    <path d="M13.5 13.5L17 17"/>
    <path d="M9 6v6M6 9h6"/>
  </svg>
);

const PortfolioIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="4" width="16" height="12" rx="2"/>
    <path d="M2 8h16"/>
    <path d="M6 12h2"/>
  </svg>
);

const PolymarketIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 17V7l4-4 4 6 6-6v14"/>
    <circle cx="3" cy="17" r="1" fill="currentColor"/>
    <circle cx="7" cy="9" r="1" fill="currentColor"/>
    <circle cx="11" cy="15" r="1" fill="currentColor"/>
    <circle cx="17" cy="3" r="1" fill="currentColor"/>
  </svg>
);

const HistoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="10" r="7"/>
    <path d="M10 6v4l2.5 2.5"/>
    <path d="M3 10H1M10 3V1"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="10" r="2"/>
    <path d="M10 1v2M10 17v2M18.5 10h-2M3.5 10h-2M16.5 3.5l-1.5 1.5M5 15l-1.5 1.5M16.5 16.5l-1.5-1.5M5 5L3.5 3.5"/>
  </svg>
);

export default function InvestigatePage() {
  const location = useLocation();
  const pathname = location.pathname;
  
  // Static pages routing
  if (pathname === '/app-evm/terms' || pathname === '/terms') {
    return (
      <Suspense fallback={<PageLoading />}>
        <TermsPage />
      </Suspense>
    );
  }
  if (pathname === '/app-evm/privacy' || pathname === '/app-evm/privacypolicy' || pathname === '/privacy' || pathname === '/privacypolicy') {
    return pathname === '/app-evm/privacypolicy' || pathname === '/privacypolicy' ? <PrivacyPolicyPage /> : (
      <Suspense fallback={<PageLoading />}>
        <PrivacyPage />
      </Suspense>
    );
  }
  
  // Main app
  return <InvestigateMainApp />;
}

function InvestigateMainApp() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const appKit = useAppKit();
  const { open } = appKit;
  const { address, isConnected } = useAppKitAccount();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('investigate');
  
  // Prefill state for navigating from history
  const [prefillAddress, setPrefillAddress] = useState<string>('');
  const [prefillChain, setPrefillChain] = useState<string>('');
  const [prefillType, setPrefillType] = useState<string>('');
  
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (modKey && e.key === 'k') {
        e.preventDefault();
        // Focus command bar - handled by CommandBar component
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
      if (e.key === 'Escape') {
        setShowKeyboardShortcuts(false);
      }
      
      // Tab shortcuts
      if (modKey && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const tabs: TabType[] = ['investigate', 'portfolio', 'polymarket', 'history', 'settings'];
        setActiveTab(tabs[parseInt(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync theme with AppKit
  useEffect(() => {
    try { (appKit as any).setThemeMode(theme); } catch {}
  }, [theme, appKit]);

  // Track wallet connection
  useEffect(() => {
    if (isConnected && address) {
      setIsWalletConnected(true);
      setWalletAddress(address);
    } else {
      setIsWalletConnected(false);
      setWalletAddress('');
    }
  }, [isConnected, address]);
  
  // Modal states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showPoHModal, setShowPoHModal] = useState(false);
  const pohCheckDone = useRef(false);
  const wasJustConnected = useRef(false);

  // Track visit
  useEffect(() => { trackVisit(); }, []);
  
  // Onboarding check
  useEffect(() => {
    if (user && !localStorage.getItem('fundtracer_onboarding_complete')) {
      setShowOnboarding(true);
    }
  }, [user]);
  
  // PoH verification check
  useEffect(() => {
    if (isAuthenticated && profile && profile.isVerified === false && !pohCheckDone.current && wasJustConnected.current) {
      pohCheckDone.current = true;
      const timer = setTimeout(() => {
        if (!showOnboarding) setShowPoHModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    if (!isAuthenticated) {
      pohCheckDone.current = false;
      wasJustConnected.current = false;
    }
  }, [isAuthenticated, profile, showOnboarding]);

  const handleConnectWallet = useCallback(() => {
    if (!isWalletConnected) {
      wasJustConnected.current = true;
      open();
    }
  }, [isWalletConnected, open]);

  // Search handler
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    
    // Simulate search - in production this would call an API
    setTimeout(() => {
      const isAddress = query.startsWith('0x') && query.length >= 10;
      const results: SearchResult[] = [];
      
      if (isAddress) {
        results.push({
          id: query,
          type: 'wallet',
          title: `${query.slice(0, 6)}...${query.slice(-4)}`,
          subtitle: 'Wallet Address',
          meta: 'Click to investigate'
        });
      }
      
      // Add some sample results
      if (query.toLowerCase().includes('uniswap')) {
        results.push({
          id: 'uniswap-v3',
          type: 'contract',
          title: 'Uniswap V3',
          subtitle: 'DEX Protocol',
          meta: 'DeFi'
        });
      }
      
      setSearchResults(results);
      setSearchLoading(false);
    }, 300);
  }, []);

  const handleSearchSelect = useCallback((result: SearchResult) => {
    if (result.type === 'wallet') {
      setPrefillAddress(result.id);
      setActiveTab('investigate');
    }
    setSearchResults([]);
  }, []);

  // Nav items for sidebar
  const navItems = [
    { id: 'investigate', label: 'Investigate', icon: <InvestigateIcon /> },
    { id: 'portfolio', label: 'Portfolio', icon: <PortfolioIcon /> },
    { id: 'polymarket', label: 'Polymarket', icon: <PolymarketIcon /> },
    { id: 'history', label: 'History', icon: <HistoryIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  // Render content based on active tab
  const renderContent = () => {
    if (authLoading) {
      return (
        <div className="investigate-loading">
          <div className="loading-spinner" />
          <span>Loading...</span>
        </div>
      );
    }

    return (
      <div className="investigate-content">
        {/* Investigate Tab */}
        <div className={`investigate-tab ${activeTab === 'investigate' ? 'investigate-tab--active' : ''}`}>
          <InvestigateView
            prefillAddress={prefillAddress}
            prefillChain={prefillChain}
            prefillType={prefillType}
            onPrefillConsumed={() => {
              setPrefillAddress('');
              setPrefillChain('');
              setPrefillType('');
            }}
          />
        </div>

        {/* Portfolio Tab */}
        <div className={`investigate-tab ${activeTab === 'portfolio' ? 'investigate-tab--active' : ''}`}>
          <PortfolioView />
        </div>

        {/* Polymarket Tab */}
        <div className={`investigate-tab ${activeTab === 'polymarket' ? 'investigate-tab--active' : ''}`}>
          <PolymarketView />
        </div>

        {/* History Tab */}
        <div className={`investigate-tab ${activeTab === 'history' ? 'investigate-tab--active' : ''}`}>
          <HistoryView
            onSelectScan={(address: string, chain: string, type?: string) => {
              setPrefillAddress(address);
              setPrefillChain(chain);
              setPrefillType(type || '');
              setActiveTab('investigate');
            }}
          />
        </div>

        {/* Settings Tab */}
        <div className={`investigate-tab ${activeTab === 'settings' ? 'investigate-tab--active' : ''}`}>
          <SettingsView
            onConnectWallet={handleConnectWallet}
            isWalletConnected={isWalletConnected}
            walletAddress={walletAddress}
            onUpgrade={() => setShowPayment(true)}
          />
        </div>
      </div>
    );
  };

  // Header right section
  const headerRight = (
    <div className="investigate-header-actions">
      {isWalletConnected ? (
        <button className="investigate-wallet-btn" onClick={() => open()}>
          <span className="investigate-wallet-addr">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
          <Badge variant="success" size="sm">Connected</Badge>
        </button>
      ) : (
        <button className="investigate-connect-btn" onClick={handleConnectWallet}>
          Connect Wallet
        </button>
      )}
    </div>
  );

  return (
    <>
      <IntelLayout
        activeNav={activeTab}
        onNavChange={(id) => setActiveTab(id as TabType)}
        navItems={navItems}
        headerRight={headerRight}
        onSearch={handleSearch}
        onSearchSelect={handleSearchSelect}
        searchResults={searchResults}
        searchLoading={searchLoading}
        showSearch={true}
      >
        {renderContent()}
      </IntelLayout>

      {/* Modals */}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      <PoHVerificationModal isOpen={showPoHModal} onClose={() => setShowPoHModal(false)} walletAddress={walletAddress} />
      <KeyboardShortcuts isOpen={showKeyboardShortcuts} onClose={() => setShowKeyboardShortcuts(false)} />
    </>
  );
}
