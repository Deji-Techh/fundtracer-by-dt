import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { ChainId, AnalysisResult, MultiWalletResult, getEnabledChains, CHAINS } from '@fundtracer/core';
import { useAuth } from './contexts/AuthContext';
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
import ProfilePage from './components/ProfilePage';
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
const WalletAnalytics = lazy(() => import('./components/WalletAnalytics').then(m => ({ default: m.WalletAnalytics })));
const TokenExplorer = lazy(() => import('./components/TokenExplorer/TokenPage').then(m => ({ default: m.TokenPage })));

type TabType = 'home' | 'portfolio' | 'history' | 'explorer' | 'market' | 'sybil' | 'settings';

function App() {
  // Simple routing for standalone pages
  const pathname = window.location.pathname;
  
  if (pathname === '/about') {
    return (
      <div style={{ minHeight: '100vh', background: '#000000' }}>
        <AboutPage />
      </div>
    );
  }
  
  if (pathname === '/features') {
    return (
      <div style={{ minHeight: '100vh', background: '#000000' }}>
        <FeaturesPage />
      </div>
    );
  }
  
  if (pathname === '/pricing') {
    return (
      <div style={{ minHeight: '100vh', background: '#000000' }}>
        <PricingPage />
      </div>
    );
  }
  
  if (pathname === '/how-it-works') {
    return (
      <div style={{ minHeight: '100vh', background: '#000000' }}>
        <HowItWorksPage />
      </div>
    );
  }
  
  if (pathname === '/faq') {
    return (
      <div style={{ minHeight: '100vh', background: '#000000' }}>
        <FaqPage />
      </div>
    );
  }
  
  if (pathname === '/terms') {
    return (
      <div style={{ minHeight: '100vh', background: '#000000' }}>
        <TermsPage />
      </div>
    );
  }
  
  if (pathname === '/privacy' || pathname === '/privacypolicy') {
    return (
      <div style={{ minHeight: '100vh', background: '#000000' }}>
        {pathname === '/privacypolicy' ? <PrivacyPolicyPage /> : <PrivacyPage />}
      </div>
    );
  }

  const { user, profile, isAuthenticated, loading: authLoading, getSigner } = useAuth();
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  // Navigation state
  const [activeTab, setActiveTab] = useState<TabType>('home');
  
  // Wallet state - synced with AppKit
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');

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

  const handleConnectWallet = async () => {
    if (isWalletConnected) {
      // Disconnect wallet logic
      setIsWalletConnected(false);
      setWalletAddress('');
    } else {
      // Open AppKit wallet connection modal
      await open();
    }
  };

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

    // Switch between tabs
    switch (activeTab) {
      case 'home':
        // Landing page for new visitors - marketing focused
        console.log('[App] Rendering landing page');
        return (
          <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
            <LandingPage onLaunchApp={() => setActiveTab('sybil')} />
          </div>
        );
      
      case 'portfolio':
        return (
          <div className="main-content">
            <Suspense fallback={<div className="loading-spinner" style={{ width: 24, height: 24 }} />}>
              <PortfolioAnalytics walletAddress={walletAddress} />
            </Suspense>
          </div>
        );
      
      case 'history':
        return (
          <div className="main-content">
            <div style={{ padding: 24 }}>
              <h2 style={{ color: '#fff', marginBottom: 24 }}>Transaction History</h2>
              <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ color: '#9ca3af' }}>
                  Connect your wallet and analyze an address to view transaction history
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'explorer':
        return (
          <div className="main-content">
            <div style={{ padding: 24 }}>
              <h2 style={{ color: '#fff', marginBottom: 24 }}>Token Explorer</h2>
              <Suspense fallback={<div className="loading-spinner" style={{ width: 24, height: 24 }} />}>
                <TokenExplorer />
              </Suspense>
            </div>
          </div>
        );
      
      case 'market':
        return (
          <div className="main-content">
            <div style={{ padding: 24 }}>
              <Suspense fallback={<div className="loading-spinner" style={{ width: 24, height: 24 }} />}>
                <WalletAnalytics walletAddress={walletAddress} />
              </Suspense>
            </div>
          </div>
        );

      case 'sybil':
        // Sybil page requires wallet connection for wallet/contract analysis
        return (
          <SybilPage
            user={user}
            profile={profile}
            onConnectWallet={handleConnectWallet}
            isWalletConnected={isWalletConnected}
            walletAddress={walletAddress}
          />
        );
      
      case 'settings':
        return <ProfilePage onBack={() => setActiveTab('home')} />;
      
      default:
        return (
          <div className="main-content">
            <div style={{ padding: 24 }}>
              <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ color: '#9ca3af' }}>Coming soon...</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
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
          color: '#6b7280',
          borderTop: '1px solid #2a2a2a',
          fontSize: '0.875rem',
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          flexWrap: 'wrap'
        }}>
          <span>&copy; {new Date().getFullYear()} FundTracer by DT</span>
          <span style={{ color: '#2a2a2a' }}>|</span>
          <a
            href="/privacypolicy"
            style={{ color: '#6b7280', textDecoration: 'underline' }}
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
