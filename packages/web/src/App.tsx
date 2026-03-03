import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import EVMTabs from './EVMTabs';
import SolanaPage from './components/SolanaPage';
import { SolanaWalletProvider } from './providers/SolanaWalletProvider';
import './styles/ios-glass.css';

const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })));
const FaqPage = lazy(() => import('./pages/FaqPage').then(m => ({ default: m.FaqPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const InstallPage = lazy(() => import('./pages/InstallPage').then(m => ({ default: m.InstallPage })));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<Suspense fallback={null}><AboutPage /></Suspense>} />
        <Route path="/features" element={<Suspense fallback={null}><FeaturesPage /></Suspense>} />
        <Route path="/pricing" element={<Suspense fallback={null}><PricingPage /></Suspense>} />
        <Route path="/how-it-works" element={<Suspense fallback={null}><HowItWorksPage /></Suspense>} />
        <Route path="/faq" element={<Suspense fallback={null}><FaqPage /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={null}><TermsPage /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={null}><PrivacyPage /></Suspense>} />
        <Route path="/ext-install" element={<Suspense fallback={null}><InstallPage /></Suspense>} />
        <Route path="/app-evm/*" element={<EVMTabs />} />
        <Route path="/app-solana/*" element={
          <SolanaWalletProvider>
            <SolanaPage />
          </SolanaWalletProvider>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
