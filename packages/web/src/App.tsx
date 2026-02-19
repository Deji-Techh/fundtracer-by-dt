import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { ChainId, AnalysisResult, MultiWalletResult, getEnabledChains, CHAINS } from '@fundtracer/core';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { analyzeWallet, compareWallets, analyzeContract, loadMoreTransactions, trackVisit } from './api';

// Import new CoinGecko-style components
import TopNav from './components/CoinGecko/TopNav';
import HomePage from './components/CoinGecko/HomePage';
import SybilPage from './components/CoinGecko/SybilPage';

// Import Landing Page
import LandingPage from './pages/LandingPage';

// Import AppLayout for desktop sidebar
import { AppLayout } from './components/common/AppLayout';

// Static Pages
import { AboutPage } from './pages/AboutPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { PricingPage } from './pages/PricingPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { FaqPage } from './pages/FaqPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';

// Existing components
import ComingSoonModal from './components/ComingSoonModal';
import OnboardingModal from './components/OnboardingModal';
import FeedbackModal from './components/FeedbackModal';
import PaymentModal from './components/PaymentModal';
import FirstTimeModal from './components/FirstTimeModal';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import { PoHVerificationModal } from './components/PoHVerificationModal';

// Import global styles
import './global.css';

// Lazy loaded components
const GasTracker = lazy(() => import('./components/GasTracker').then(m => ({ default: m.GasTracker })));
const PortfolioViewer = lazy(() => import('./components/PortfolioViewer').then(m => ({ default: m.PortfolioViewer })));
const PortfolioAnalytics = lazy(() => import('./components/PortfolioAnalytics').then(m => ({ default: m.PortfolioAnalytics })));

// Import SettingsPage
import SettingsPage from './components/SettingsPage';

// Import HistoryPage
import HistoryPage from './components/HistoryPage';
import { PageLoading } from './components/common/PageLoading';

type TabType = 'home' | 'portfolio' | 'sybil' | 'history' | 'settings';

function App() {
  // Simple routing for standalone pages
  const pathname = window.location.pathname;
  
  if (pathname === '/about') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <AboutPage />
      </div>
    );
  }
  
  if (pathname === '/features') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <FeaturesPage />
      </div>
    );
  }
  
  if (pathname === '/pricing') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <PricingPage />
      </div>
    );
  }
  
  if (pathname === '/how-it-works') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <HowItWorksPage />
      </div>
    );
  }
  
  if (pathname === '/faq') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <FaqPage />
      </div>
    );
  }
  
  if (pathname === '/terms') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <TermsPage />
      </div>
    );
  }
  
  if (pathname === '/privacy' || pathname === '/privacypolicy') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        {pathname === '/privacypolicy' ? <PrivacyPolicyPage /> : <PrivacyPage />}
      </div>
    );
  }

  const { user, profile, isAuthenticated, loading: authLoading, getSigner } = useAuth();
  const appKit = useAppKit();
  const { open } = appKit;
  const { address, isConnected } = useAppKitAccount();
  const { theme } = useTheme();

  // Navigation state
  const [activeTab, setActiveTab] = useState<TabType>('home');
  
  // Prefill state for navigating from history → sybil tab
  const [prefillAddress, setPrefillAddress] = useState<string>('');
  const [prefillChain, setPrefillChain] = useState<string>('');
  const [prefillType, setPrefillType] = useState<string>('');
  
  // Wallet state - synced with AppKit
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');

  // Sync AppKit modal theme with app theme
  useEffect(() => {
    try {
      (appKit as any).setThemeMode(theme);
    } catch {
      // Older AppKit versions may not support this
    }
  }, [theme, appKit]);

  // Sync wallet state with AppKit
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
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showFirstTime, setShowFirstTime] = useState(false);
  const [showPoHModal, setShowPoHModal] = useState(false);
  const pohCheckDone = useRef(false);
  const wasJustConnected = useRef(false);

  // Track visit on mount
  React.useEffect(() => {
    trackVisit();
  }, []);

  // Show onboarding for first-time users after login
  React.useEffect(() => {
    if (user && !localStorage.getItem('fundtracer_onboarding_complete')) {
      setShowOnboarding(true);
    }
  }, [user]);

  // Show PoH verification modal after fresh wallet connect if not verified
  useEffect(() => {
    if (isAuthenticated && profile && profile.isVerified === false && !pohCheckDone.current && wasJustConnected.current) {
      pohCheckDone.current = true;
      // Small delay to not overlap with onboarding modal
      const timer = setTimeout(() => {
        if (!showOnboarding) {
          setShowPoHModal(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    // Reset check flag when user disconnects
    if (!isAuthenticated) {
      pohCheckDone.current = false;
      wasJustConnected.current = false;
    }
  }, [isAuthenticated, profile, showOnboarding]);

  // Wallet state is synced from AppKit via the useEffect above (lines 129-137).
  // No additional wallet reset logic needed — AppKit is the single source of truth.

  // Mobile detection
  const isMobileDevice = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // Check if running inside a wallet browser (MetaMask, Trust, etc.)
  const isWalletBrowser = useCallback(() => {
    const w = window as any;
    return !!(w.ethereum?.isMetaMask && w.ethereum?.isConnected?.()) ||
           !!(w.ethereum?.isTrust) ||
           !!(w.ethereum?.isCoinbaseWallet) ||
           !!(w.ethereum?.isRabby);
  }, []);

  const handleConnectWallet = useCallback(() => {
    if (!isWalletConnected) {
      // Mark that user is actively connecting (not a session restore)
      wasJustConnected.current = true;
      // Open AppKit wallet connection modal
      // IMPORTANT: Must be synchronous for mobile deep links to work
      open();

      // On mobile regular browsers (not wallet browsers), AppKit modal
      // may spin indefinitely. The AppKit v1.8+ modal handles mobile
      // deep links natively, so we just ensure it opens properly.
      if (isMobileDevice() && !isWalletBrowser()) {
        console.log('[App] Mobile regular browser detected - AppKit modal opened with deep-link support');
      }
    }
    // Disconnect is handled by WalletButton component directly
  }, [isWalletConnected, open, isMobileDevice, isWalletBrowser]);

  // Render main content based on active tab
  const renderMainContent = () => {
    if (authLoading) {
      return (
        <div className="main-content">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <div className="loading-spinner" />
          </div>
        </div>
      );
    }

    // Render all tabs but hide inactive ones with CSS
    // This prevents remounting and re-fetching data when switching tabs
    return (
      <>
        {/* Home Tab */}
        <div style={{ 
          display: activeTab === 'home' ? 'block' : 'none',
          backgroundColor: 'var(--color-bg)', 
          minHeight: '100vh' 
        }}>
          <LandingPage onLaunchApp={() => setActiveTab('sybil')} />
        </div>
        
        {/* Portfolio Tab */}
        <div style={{ 
          display: activeTab === 'portfolio' ? 'block' : 'none' 
        }} className="main-content">
          <Suspense fallback={<PageLoading />}>
            <PortfolioAnalytics walletAddress={walletAddress} />
          </Suspense>
        </div>
        
        {/* History Tab */}
        <div style={{ 
          display: activeTab === 'history' ? 'block' : 'none' 
        }} className="main-content">
          <HistoryPage
            onSelectScan={(address, chain, type) => {
              setPrefillAddress(address);
              setPrefillChain(chain);
              setPrefillType(type || '');
              setActiveTab('sybil');
            }}
          />
        </div>
        
        {/* Sybil Tab */}
        <div style={{ 
          display: activeTab === 'sybil' ? 'block' : 'none' 
        }} className="main-content">
          <SybilPage
            user={user}
            profile={profile}
            onConnectWallet={handleConnectWallet}
            isWalletConnected={isWalletConnected}
            walletAddress={walletAddress}
            prefillAddress={prefillAddress}
            prefillChain={prefillChain}
            prefillType={prefillType}
            onPrefillConsumed={() => { setPrefillAddress(''); setPrefillChain(''); setPrefillType(''); }}
          />
        </div>
        
        {/* Settings Tab */}
        <div style={{ 
          display: activeTab === 'settings' ? 'block' : 'none' 
        }} className="main-content">
          <SettingsPage onConnectWallet={handleConnectWallet} isWalletConnected={isWalletConnected} walletAddress={walletAddress} onUpgrade={() => setShowPayment(true)} />
        </div>
      </>
    );
  };

  const mainContent = (
    <>
      {renderMainContent()}

      {/* Footer - Hidden on landing page and sybil page */}
      {activeTab !== 'home' && activeTab !== 'sybil' && (
        <footer style={{
          padding: 24,
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          borderTop: '1px solid var(--color-border)',
          fontSize: '0.875rem',
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          flexWrap: 'wrap' as const
        }}>
          <span>&copy; {new Date().getFullYear()} FundTracer by DT</span>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <a
            href="/privacypolicy"
            style={{ color: 'var(--color-text-muted)', textDecoration: 'underline' }}
          >
            Privacy Policy
          </a>
        </footer>
      )}
    </>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Show TopNav except on landing page (home tab) */}
      {activeTab !== 'home' && (
        <TopNav
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabType)}
        />
      )}

      {/* Wrap content in AppLayout for desktop sidebar (not on landing page) */}
      {activeTab !== 'home' ? (
        <AppLayout activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as TabType)}>
          {mainContent}
        </AppLayout>
      ) : (
        mainContent
      )}

      {/* Modals */}
      {showComingSoon && (
        <ComingSoonModal onClose={() => setShowComingSoon(false)} />
      )}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      {showFirstTime && <FirstTimeModal onClose={() => setShowFirstTime(false)} />}
      <PoHVerificationModal
        isOpen={showPoHModal}
        onClose={() => setShowPoHModal(false)}
        walletAddress={walletAddress}
      />
    </div>
  );
}

export default App;
