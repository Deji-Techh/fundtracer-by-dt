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

// Import global styles
import './global.css';

// Lazy loaded components
const GasTracker = lazy(() => import('./components/GasTracker').then(m => ({ default: m.GasTracker })));
const PortfolioViewer = lazy(() => import('./components/PortfolioViewer').then(m => ({ default: m.PortfolioViewer })));
const PortfolioAnalytics = lazy(() => import('./components/PortfolioAnalytics').then(m => ({ default: m.PortfolioAnalytics })));

// Import SettingsPage
import SettingsPage from './components/SettingsPage';

type TabType = 'home' | 'portfolio' | 'history' | 'sybil' | 'settings';

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

  // Check if wallet is already connected
  React.useEffect(() => {
    if (user?.uid) {
      // Wallet address would come from a separate wallet context/provider
      setIsWalletConnected(false);
    }
  }, [user]);

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
    if (isWalletConnected) {
      // Disconnect wallet logic
      setIsWalletConnected(false);
      setWalletAddress('');
    } else {
      // Open AppKit wallet connection modal
      // IMPORTANT: Must be synchronous for mobile deep links to work
      open();

      // On mobile regular browsers (not wallet browsers), AppKit modal
      // may spin indefinitely. Set a timeout to detect this and show
      // the native AppKit modal which has its own wallet deep-link buttons.
      // The AppKit v1.8+ modal already handles mobile deep links natively,
      // so we just need to ensure it opens properly.
      if (isMobileDevice() && !isWalletBrowser()) {
        console.log('[App] Mobile regular browser detected - AppKit modal opened with deep-link support');
      }
    }
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
          <Suspense fallback={<div className="loading-spinner" style={{ width: 24, height: 24 }} />}>
            <PortfolioAnalytics walletAddress={walletAddress} />
          </Suspense>
        </div>
        
        {/* History Tab */}
        <div style={{ 
          display: activeTab === 'history' ? 'block' : 'none' 
        }} className="main-content">
          <div style={{ padding: 24 }}>
            <h2 style={{ color: 'var(--color-text-primary)', marginBottom: 24, marginTop: 16 }}>Transaction History</h2>
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Connect your wallet and analyze an address to view transaction history
              </p>
            </div>
          </div>
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
          />
        </div>
        
        {/* Settings Tab */}
        <div style={{ 
          display: activeTab === 'settings' ? 'block' : 'none' 
        }} className="main-content">
          <SettingsPage onConnectWallet={handleConnectWallet} isWalletConnected={isWalletConnected} walletAddress={walletAddress} />
        </div>
      </>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Show TopNav except on landing page (home tab) */}
      {activeTab !== 'home' && (
        <TopNav
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabType)}
          onConnectWallet={handleConnectWallet}
          isWalletConnected={isWalletConnected}
          walletAddress={walletAddress}
        />
      )}

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

      {/* Modals */}
      {showComingSoon && (
        <ComingSoonModal onClose={() => setShowComingSoon(false)} />
      )}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      {showFirstTime && <FirstTimeModal onClose={() => setShowFirstTime(false)} />}
    </div>
  );
}

export default App;
