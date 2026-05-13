import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import IntelPage from './pages/IntelPage';
import { SolanaWalletProvider } from './providers/SolanaWalletProvider';
import AppPage from './pages/AppPage';
import { useAuth } from './contexts/AuthContext';
import MaintenancePage from './pages/MaintenancePage';
import BanOverlay from './components/BanOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import './design-system/tokens.css';

// Map of route paths to page titles for dynamic SEO
const PAGE_TITLES: Record<string, string> = {
  '/': 'FundTracer | Professional Blockchain Wallet Analyzer',
  '/about': 'About | FundTracer',
  '/features': 'Features | FundTracer',
  '/pricing': 'Pricing | FundTracer',
  '/how-it-works': 'How It Works | FundTracer',
  '/faq': 'FAQ | FundTracer',
  '/terms': 'Terms of Service | FundTracer',
  '/privacy': 'Privacy Policy | FundTracer',
  '/ext-install': 'Chrome Extension | FundTracer',
  '/telegram': 'Telegram Bot | FundTracer',
  '/cli': 'CLI Tool | FundTracer',
  '/auth': 'Sign In | FundTracer',
  '/blog': 'Blog | FundTracer',
  '/docs': 'Documentation | FundTracer',
  '/docs/getting-started': 'Getting Started | FundTracer',
  '/docs/ethereum-wallet-tracker': 'Ethereum Wallet Tracker | FundTracer',
  '/docs/solana-wallet-tracker': 'Solana Wallet Tracker | FundTracer',
  '/docs/multi-chain-wallet-tracker': 'Multi-Chain Wallet Tracker | FundTracer',
  '/docs/contract-analytics': 'Contract Analytics | FundTracer',
  '/docs/sybil-detection': 'Sybil Detection | FundTracer',
  '/docs/funding-tree-analysis': 'Funding Tree Analysis | FundTracer',
  '/docs/wallet-risk-score': 'Wallet Risk Score | FundTracer',
  '/docs/api-reference': 'API Reference | FundTracer',
  '/docs/cli-guide': 'CLI Guide | FundTracer',
  '/share': 'Shared Analysis | FundTracer',
};

// SEO Manager - sets dynamic meta tags for each page
function SEOManager() {
  const location = useLocation();
  const canonicalUrl = `https://fundtracer.xyz${location.pathname}`;
  const title = PAGE_TITLES[location.pathname] || 'FundTracer | Professional Blockchain Wallet Analyzer';

  useEffect(() => {
    // Update canonical URL
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    // Update title
    document.title = title;

    // Update og:url
    let ogUrlEl = document.querySelector('meta[property="og:url"]');
    if (ogUrlEl) {
      ogUrlEl.setAttribute('content', canonicalUrl);
    }

    // Update twitter:url
    let twitterUrlEl = document.querySelector('meta[property="twitter:url"]');
    if (twitterUrlEl) {
      twitterUrlEl.setAttribute('content', canonicalUrl);
    }
  }, [location.pathname, canonicalUrl, title]);

  return null;
}

const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })));
const FaqPage = lazy(() => import('./pages/FaqPage').then(m => ({ default: m.FaqPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const InstallPage = lazy(() => import('./pages/InstallPage').then(m => ({ default: m.InstallPage })));
const TelegramPage = lazy(() => import('./pages/TelegramPage').then(m => ({ default: m.TelegramPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const CliPage = lazy(() => import('./pages/CliPage').then(m => ({ default: m.CliPage })));
const ApiPage = lazy(() => import('./pages/ApiPage').then(m => ({ default: m.ApiPage })));
const ApiDocsPage = lazy(() => import('./pages/ApiDocsPage').then(m => ({ default: m.ApiDocsPage })));
const ApiKeysPage = lazy(() => import('./pages/ApiKeysPage').then(m => ({ default: m.ApiKeysPage })));
const ApiKeysAuthPage = lazy(() => import('./pages/ApiKeysAuthPage').then(m => ({ default: m.ApiKeysAuthPage })));
const BlogPage = lazy(() => import('./pages/BlogPage').then(m => ({ default: m.BlogPage })));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage').then(m => ({ default: m.BlogPostPage })));
const GettingStartedPage = lazy(() => import('./pages/DocsGettingStartedPage').then(m => ({ default: m.GettingStartedPage })));
const EthereumWalletTrackerPage = lazy(() => import('./pages/DocsEthereumPage').then(m => ({ default: m.EthereumWalletTrackerPage })));
const SolanaWalletTrackerPage = lazy(() => import('./pages/DocsSolanaPage').then(m => ({ default: m.SolanaWalletTrackerPage })));
const MultiChainWalletTrackerPage = lazy(() => import('./pages/DocsMultiChainPage').then(m => ({ default: m.MultiChainWalletTrackerPage })));
const ContractAnalyticsPage = lazy(() => import('./pages/DocsContractAnalyticsPage').then(m => ({ default: m.ContractAnalyticsPage })));
const SybilDetectionPage = lazy(() => import('./pages/DocsSybilDetectionPage').then(m => ({ default: m.SybilDetectionPage })));
const FundingTreeAnalysisPage = lazy(() => import('./pages/DocsFundingTreePage').then(m => ({ default: m.FundingTreeAnalysisPage })));
const WalletRiskScorePage = lazy(() => import('./pages/DocsRiskScorePage').then(m => ({ default: m.WalletRiskScorePage })));
const CliGuidePage = lazy(() => import('./pages/DocsCliGuidePage').then(m => ({ default: m.CliGuidePage })));
const RewardsPage = lazy(() => import('./pages/RewardsPage').then(m => ({ default: m.default })));
const SharePage = lazy(() => import('./pages/SharePage').then(m => ({ default: m.default })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#0a0a0a',
        color: '#fff'
      }}>
        Loading...
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#0a0a0a',
        color: '#fff',
        gap: '16px'
      }}>
        <h2 style={{ margin: 0 }}>Sign in to continue</h2>
        <p style={{ color: '#888', margin: 0 }}>You need to be signed in to access FundTracer</p>
        <button 
          onClick={() => window.location.href = '/auth'}
          style={{
            padding: '12px 24px',
            background: '#fff',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Sign In
        </button>
      </div>
    );
  }
  
  return <>{children}</>;
}

function ApiKeysRoute() {
  const { isAuthenticated, loading, setTokenFromExternal } = useAuth();
  const [searchParams] = useSearchParams();
  const [tokenProcessed, setTokenProcessed] = useState(false);
  
  useEffect(() => {
    const token = searchParams.get('token');
    const authError = searchParams.get('error');
    const refParam = searchParams.get('ref');
    
    // Store ref param for referral tracking
    if (refParam) {
      localStorage.setItem('referral_ref', refParam);
    }
    
    if (token && !tokenProcessed) {
      setTokenProcessed(true);
      setTokenFromExternal(token);
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (authError) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, tokenProcessed, setTokenFromExternal]);
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: 'var(--color-bg)',
        color: '#fff'
      }}>
        Loading...
      </div>
    );
  }
  
  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('postLoginRedirect', '/api/keys');
    }
    return (
      <Suspense fallback={null}>
        <ApiKeysAuthPage />
      </Suspense>
    );
  }
  
  return (
    <Suspense fallback={null}>
      <ApiKeysPage />
    </Suspense>
  );
}

const IS_MAINTENANCE_MODE = false;

function App() {
  if (IS_MAINTENANCE_MODE) {
    return <MaintenancePage />;
  }

  // Global token URL processing - handles OAuth redirects from any page
  const { setTokenFromExternal, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [globalTokenProcessed, setGlobalTokenProcessed] = useState(false);
  
  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const refParam = searchParams.get('ref');
    
    // Store ref param for referral tracking
    if (refParam) {
      localStorage.setItem('referral_ref', refParam);
    }
    
    // Process token from URL (from OAuth callbacks like Google, etc.)
    if (token && !globalTokenProcessed) {
      setGlobalTokenProcessed(true);
      setTokenFromExternal(token);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (error) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, globalTokenProcessed, setTokenFromExternal]);

  return (
    <ErrorBoundary>
      <SEOManager />
      {profile?.bannedAt && (
        <BanOverlay banReason={profile?.banReason} bannedAt={profile?.bannedAt} />
      )}
      {!profile?.bannedAt && (
      <Routes>
      <Route path="/" element={<IntelPage />} />
      <Route path="/about" element={<Suspense fallback={null}><AboutPage /></Suspense>} />
      <Route path="/features" element={<Suspense fallback={null}><FeaturesPage /></Suspense>} />
      <Route path="/pricing" element={<Suspense fallback={null}><PricingPage /></Suspense>} />
      <Route path="/rewards" element={<Suspense fallback={null}><RewardsPage /></Suspense>} />
      <Route path="/how-it-works" element={<Suspense fallback={null}><HowItWorksPage /></Suspense>} />
      <Route path="/faq" element={<Suspense fallback={null}><FaqPage /></Suspense>} />
      <Route path="/terms" element={<Suspense fallback={null}><TermsPage /></Suspense>} />
      <Route path="/privacy" element={<Suspense fallback={null}><PrivacyPage /></Suspense>} />
      <Route path="/ext-install" element={<Suspense fallback={null}><InstallPage /></Suspense>} />
      <Route path="/telegram" element={<Suspense fallback={null}><TelegramPage /></Suspense>} />
      <Route path="/cli" element={<Suspense fallback={null}><CliPage /></Suspense>} />
      <Route path="/api-docs" element={<Suspense fallback={null}><ApiPage /></Suspense>} />
      <Route path="/api/docs" element={<Suspense fallback={null}><ApiDocsPage /></Suspense>} />
      <Route path="/docs" element={<Navigate to="/docs/getting-started" replace />} />
      <Route path="/blog" element={<Suspense fallback={null}><BlogPage /></Suspense>} />
      <Route path="/blog/:slug" element={<Suspense fallback={null}><BlogPostPage /></Suspense>} />
      <Route path="/docs/getting-started" element={<Suspense fallback={null}><GettingStartedPage /></Suspense>} />
      <Route path="/docs/ethereum-wallet-tracker" element={<Suspense fallback={null}><EthereumWalletTrackerPage /></Suspense>} />
      <Route path="/docs/solana-wallet-tracker" element={<Suspense fallback={null}><SolanaWalletTrackerPage /></Suspense>} />
      <Route path="/docs/multi-chain-wallet-tracker" element={<Suspense fallback={null}><MultiChainWalletTrackerPage /></Suspense>} />
      <Route path="/docs/contract-analytics" element={<Suspense fallback={null}><ContractAnalyticsPage /></Suspense>} />
      <Route path="/docs/sybil-detection" element={<Suspense fallback={null}><SybilDetectionPage /></Suspense>} />
      <Route path="/docs/funding-tree-analysis" element={<Suspense fallback={null}><FundingTreeAnalysisPage /></Suspense>} />
      <Route path="/docs/wallet-risk-score" element={<Suspense fallback={null}><WalletRiskScorePage /></Suspense>} />
      <Route path="/docs/api-reference" element={<Suspense fallback={null}><ApiDocsPage /></Suspense>} />
      <Route path="/docs/cli-guide" element={<Suspense fallback={null}><CliGuidePage /></Suspense>} />
      <Route path="/api/keys" element={<ApiKeysRoute />} />
      <Route path="/auth" element={<Suspense fallback={null}><AuthPage /></Suspense>} />
      <Route path="/app-evm/*" element={
        <ProtectedRoute>
          <Suspense fallback={<div>Loading...</div>}>
            <AppPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/share/:id" element={
        <Suspense fallback={<div style={{background:'#0a0a0a',minHeight:'100vh'}}/>}>
          <SharePage />
        </Suspense>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      )}
    </ErrorBoundary>
  );
}

export default App;
