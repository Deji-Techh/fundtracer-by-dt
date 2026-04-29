import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppShell from '../components/AppShell';
import Loader from '../components/Loader';
import './AppSolanaPage.css';

type TabType = 'portfolio' | 'transactions' | 'nfts' | 'defi' | 'risk' | 'identity' | 'analytics' | 'tax' | 'compare' | 'history';

const SolanaPortfolioView = lazy(() => import('../design-system/features/SolanaPortfolioView'));
const SolanaTransactionsView = lazy(() => import('../design-system/features/SolanaTransactionsView'));
const SolanaNftsView = lazy(() => import('../design-system/features/SolanaNftsView'));
const SolanaDefiView = lazy(() => import('../design-system/features/SolanaDefiView'));
const SolanaRiskView = lazy(() => import('../design-system/features/SolanaRiskView'));
const SolanaIdentityView = lazy(() => import('../design-system/features/SolanaIdentityView'));
const SolanaAnalyticsView = lazy(() => import('../design-system/features/SolanaAnalyticsView'));
const SolanaTaxView = lazy(() => import('../design-system/features/SolanaTaxView'));
const SolanaCompareView = lazy(() => import('../design-system/features/SolanaCompareView'));
const SolanaHistoryView = lazy(() => import('../design-system/features/SolanaHistoryView'));

function PageSkeleton() {
  return (
    <div className="page-skeleton">
      <div className="skeleton-header">
        <div className="skeleton-title" />
        <div className="skeleton-subtitle" />
      </div>
      <div className="skeleton-content">
        <div className="skeleton-block tall" />
        <div className="skeleton-grid">
          <div className="skeleton-block" />
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </div>
      </div>
    </div>
  );
}

function AuthGate() {
  const { loginWithGoogle } = useAuth();
  
  return (
    <div className="auth-gate">
      <div className="auth-gate-content">
        <div className="auth-gate-icon">
          <svg viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2"/>
            <circle cx="20" cy="20" r="8" fill="currentColor"/>
          </svg>
        </div>
        <h2>Sign in to continue</h2>
        <p>You need to be signed in to access FundTracer Solana</p>
        <button className="auth-gate-btn" onClick={loginWithGoogle}>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export function AppSolanaPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabType>('portfolio');
  const [walletAddress, setWalletAddress] = useState(searchParams.get('address') || '');
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setShowLoader(true);
    } else if (!isAuthenticated) {
      setShowLoader(false);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    const addr = searchParams.get('address');
    if (addr) {
      setWalletAddress(addr);
    }
  }, [searchParams]);

  const handleAddressChange = useCallback((address: string) => {
    setWalletAddress(address);
    if (address) {
      setSearchParams({ address });
    } else {
      setSearchParams({});
    }
  }, [setSearchParams]);

  const handleAnalyze = useCallback((address: string) => {
    navigate(`/app-solana?address=${encodeURIComponent(address)}`);
  }, [navigate]);

  const navItems = [
    { id: 'section-analyze', label: 'Analyze', icon: null },
    { id: 'portfolio', label: 'Portfolio', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="2" width="12" height="10" rx="1"/>
        <path d="M4 6h6M4 8.5h4"/>
      </svg>
    )},
    { id: 'transactions', label: 'Transactions', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 10L4 6l3 3 2.5-4.5L13 7"/>
      </svg>
    )},
    { id: 'nfts', label: 'NFTs', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="10" height="10" rx="1"/>
        <circle cx="7" cy="7" r="3"/>
      </svg>
    )},
    { id: 'defi', label: 'DeFi', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 7h10M7 2l4 5-4 5-4-5z"/>
        <path d="M7 5v4"/>
      </svg>
    )},
    { id: 'risk', label: 'Risk', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 1l6 11H1L7 1z"/>
        <path d="M7 5v3M7 10v1"/>
      </svg>
    )},
    { id: 'identity', label: 'Identity', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="5" r="3"/>
        <path d="M2 12c0-2.5 2-4 5-4s5 1.5 5 4"/>
      </svg>
    ), disabled: true },
    { id: 'section-financial', label: 'Financial', icon: null },
    { id: 'analytics', label: 'Analytics', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 12V6M6 12V3M10 12V8M14 12V2"/>
      </svg>
    )},
    { id: 'tax', label: 'Tax', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="2" width="12" height="10" rx="1"/>
        <path d="M4 5h6M4 8h6"/>
      </svg>
    )},
    { id: 'section-tools', label: 'Tools', icon: null },
    { id: 'compare', label: 'Compare', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="5" height="5" rx="1"/>
        <rect x="8" y="1" width="5" height="5" rx="1"/>
        <rect x="1" y="8" width="5" height="5" rx="1"/>
        <rect x="8" y="8" width="5" height="5" rx="1"/>
      </svg>
    )},
    { id: 'history', label: 'History', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="7" r="5"/>
        <path d="M7 4v3l2 1"/>
      </svg>
    )},
    { id: 'section-links', label: 'Links', icon: null },
    { id: 'evm', label: 'EVM', icon: (
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="6" cy="6" r="4"/>
        <circle cx="6" cy="6" r="1"/>
        <circle cx="10" cy="10" r="1"/>
      </svg>
    ), onClick: () => navigate('/app-evm' + (walletAddress ? `?address=${walletAddress}` : '')) },
  ];

  const renderContent = () => {
    if (!isAuthenticated) {
      return <AuthGate />;
    }

    if (!walletAddress) {
      return (
        <div className="solana-empty-state">
          <div className="empty-icon">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="24" cy="24" r="20"/>
              <path d="M24 14v10M24 30v2"/>
            </svg>
          </div>
          <h3>Enter a Solana Address</h3>
          <p>Enter a Solana wallet address above to analyze</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'portfolio':
        return <Suspense fallback={<PageSkeleton />}><SolanaPortfolioView address={walletAddress} /></Suspense>;
      case 'transactions':
        return <Suspense fallback={<PageSkeleton />}><SolanaTransactionsView address={walletAddress} /></Suspense>;
      case 'nfts':
        return <Suspense fallback={<PageSkeleton />}><SolanaNftsView address={walletAddress} /></Suspense>;
      case 'defi':
        return <Suspense fallback={<PageSkeleton />}><SolanaDefiView address={walletAddress} /></Suspense>;
      case 'risk':
        return <Suspense fallback={<PageSkeleton />}><SolanaRiskView address={walletAddress} /></Suspense>;
      case 'identity':
        return <Suspense fallback={<PageSkeleton />}><SolanaIdentityView address={walletAddress} /></Suspense>;
      case 'analytics':
        return <Suspense fallback={<PageSkeleton />}><SolanaAnalyticsView address={walletAddress} /></Suspense>;
      case 'tax':
        return <Suspense fallback={<PageSkeleton />}><SolanaTaxView address={walletAddress} /></Suspense>;
      case 'compare':
        return <Suspense fallback={<PageSkeleton />}><SolanaCompareView address={walletAddress} /></Suspense>;
      case 'history':
        return <Suspense fallback={<PageSkeleton />}><SolanaHistoryView address={walletAddress} /></Suspense>;
      default:
        return <Suspense fallback={<PageSkeleton />}><SolanaPortfolioView address={walletAddress} /></Suspense>;
    }
  };

  return (
    <>
      {showLoader && isAuthenticated && <Loader onComplete={() => setShowLoader(false)} />}
      <AppShell
        activeNav={activeTab}
        onNavChange={(id) => {
          const item = navItems.find(n => n.id === id);
          if (item && (item as any).disabled) return;
          if (item && (item as any).onClick) {
            (item as any).onClick();
          } else {
            setActiveTab(id as TabType);
          }
        }}
        navItems={navItems}
        walletConnected={false}
        walletAddress={walletAddress}
        onConnectWallet={() => {}}
        searchPlaceholder="Enter Solana address..."
        searchValue={walletAddress}
        onSearchChange={handleAddressChange}
        onSearchEnter={() => handleAnalyze(walletAddress)}
        chainBadge="SOL"
      >
        {renderContent()}
      </AppShell>
    </>
  );
}

export default AppSolanaPage;