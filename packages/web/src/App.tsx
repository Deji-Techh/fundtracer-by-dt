import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import IntelPage from './pages/IntelPage';
import SolanaPage from './components/SolanaPage';
import { SolanaWalletProvider } from './providers/SolanaWalletProvider';
import AppPage from './pages/AppPage';
import { useAuth } from './contexts/AuthContext';
import './design-system/tokens.css';

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
const ApiKeysPage = lazy(() => import('./pages/ApiKeysPage').then(m => ({ default: m.ApiKeysPage })));
const ApiKeysAuthPage = lazy(() => import('./pages/ApiKeysAuthPage').then(m => ({ default: m.ApiKeysAuthPage })));

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
  const { isAuthenticated, loading } = useAuth();
  
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

function App() {
  return (
    <Routes>
      <Route path="/" element={<IntelPage />} />
      <Route path="/about" element={<Suspense fallback={null}><AboutPage /></Suspense>} />
      <Route path="/features" element={<Suspense fallback={null}><FeaturesPage /></Suspense>} />
      <Route path="/pricing" element={<Suspense fallback={null}><PricingPage /></Suspense>} />
      <Route path="/how-it-works" element={<Suspense fallback={null}><HowItWorksPage /></Suspense>} />
      <Route path="/faq" element={<Suspense fallback={null}><FaqPage /></Suspense>} />
      <Route path="/terms" element={<Suspense fallback={null}><TermsPage /></Suspense>} />
      <Route path="/privacy" element={<Suspense fallback={null}><PrivacyPage /></Suspense>} />
      <Route path="/ext-install" element={<Suspense fallback={null}><InstallPage /></Suspense>} />
      <Route path="/telegram" element={<Suspense fallback={null}><TelegramPage /></Suspense>} />
      <Route path="/cli" element={<Suspense fallback={null}><CliPage /></Suspense>} />
      <Route path="/api-docs" element={<Suspense fallback={null}><ApiPage /></Suspense>} />
      <Route path="/api/keys" element={<ApiKeysRoute />} />
      <Route path="/auth" element={<Suspense fallback={null}><AuthPage /></Suspense>} />
      <Route path="/app-evm/*" element={
        <ProtectedRoute>
          <Suspense fallback={<div>Loading...</div>}>
            <AppPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/app-solana/*" element={
        <ProtectedRoute>
          <SolanaWalletProvider>
            <SolanaPage />
          </SolanaWalletProvider>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
