import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ethers } from 'ethers';
import { ChainId, AnalysisResult, MultiWalletResult, getEnabledChains, CHAINS } from '@fundtracer/core';
import { useAuth } from './contexts/AuthContext';
import { analyzeWallet, compareWallets, analyzeContract, loadMoreTransactions, trackVisit } from './api';
import { FullScreenLayout } from './components/Layout/FullScreenLayout';
import Header from './components/Header';
import AuthPanel from './components/AuthPanel';
import HowToUse from './components/HowToUse';
import WalletInput from './components/WalletInput';
import ChainSelector from './components/ChainSelector';
import EmptyState from './components/EmptyState';
import AnalysisView from './components/AnalysisView';
import MultiWalletView from './components/MultiWalletView';
import ContractAnalysisView, { ContractAnalysisResult } from './components/ContractAnalysisView';
import ComingSoonModal from './components/ComingSoonModal';
import SybilDetector from './components/SybilDetector';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import OnboardingModal from './components/OnboardingModal';
import FeedbackModal from './components/FeedbackModal';
import PaymentModal from './components/PaymentModal';
import FirstTimeModal from './components/FirstTimeModal';
import ContractSearch from './components/ContractSearch';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { WalletGuard } from './components/WalletGuard';
import { PoHGuard } from './components/PoHGuard';

import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import ProfilePage from './components/ProfilePage';
import SearchHistory from './components/SearchHistory';
import { addToHistory } from './utils/history';

// Import global styles
import './global.css';

// API Features - Lazy loaded for performance
const GasTracker = lazy(() => import('./components/GasTracker').then(m => ({ default: m.GasTracker })));
const ContractVerifier = lazy(() => import('./components/ContractVerifier').then(m => ({ default: m.ContractVerifier })));
const PortfolioViewer = lazy(() => import('./components/PortfolioViewer').then(m => ({ default: m.PortfolioViewer })));
const WalletAnalytics = lazy(() => import('./components/WalletAnalytics').then(m => ({ default: m.WalletAnalytics })));

// New Dashboard Components (to be created)
const PortfolioDashboard = lazy(() => import('./components/Dashboard/PortfolioDashboard'));
const TransactionHistory = lazy(() => import('./components/Dashboard/TransactionHistory'));
const DeFiPositions = lazy(() => import('./components/Dashboard/DeFiPositions'));
const TokenExplorer = lazy(() => import('./components/TokenExplorer/TokenPage'));

type TabType = 'home' | 'portfolio' | 'history' | 'defi' | 'safety' | 'explorer' | 'market' | 'settings';
type ViewMode = 'wallet' | 'contract' | 'compare' | 'sybil' | 'profile' | 'dashboard';

function App() {
  // Simple routing for Privacy Policy standalone page
  if (window.location.pathname === '/privacypolicy' || window.location.pathname === '/privacy') {
    return <PrivacyPolicyPage />;
  }

  const { user, profile, isAuthenticated, loading: authLoading, getSigner } = useAuth();

  // Navigation state
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [viewMode, setViewMode] = useState<ViewMode>('wallet');
  
  // Analysis state
  const [selectedChain, setSelectedChain] = useState<ChainId>('ethereum');
  const [walletAddresses, setWalletAddresses] = useState<string[]>(['']);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showHowToUse, setShowHowToUse] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showFirstTime, setShowFirstTime] = useState(false);

  // Analysis results
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletResult, setWalletResult] = useState<AnalysisResult | null>(null);
  const [multiWalletResult, setMultiWalletResult] = useState<MultiWalletResult | null>(null);
  const [contractResult, setContractResult] = useState<ContractAnalysisResult | null>(null);
  const [pagination, setPagination] = useState<{ total: number; offset: number; limit: number; hasMore: boolean } | null>(null);
  const [currentAnalysisAddress, setCurrentAnalysisAddress] = useState<string>('');

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

  const handleChainSelect = (chainId: ChainId) => {
    const chain = CHAINS[chainId];
    if (!chain.enabled) {
      setShowComingSoon(true);
      return;
    }
    setSelectedChain(chainId);
  };

  // Free Tier Logic
  const TARGET_WALLET = '0x4436977aCe641EdfE5A83b0d974Bd48443a448fd';
  const LINEA_CHAIN_ID = '0xe708'; // 59144 in hex

  const checkFreeTierTx = async (): Promise<string | undefined> => {
    if (!profile || profile.tier !== 'free') return undefined;

    try {
      const signer = await getSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Provider not found");
      }

      const network = await provider.getNetwork();
      if (network.chainId !== 59144n) {
        try {
          await (provider as any).send('wallet_switchEthereumChain', [{ chainId: LINEA_CHAIN_ID }]);
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await (provider as any).send('wallet_addEthereumChain', [{
              chainId: LINEA_CHAIN_ID,
              chainName: 'Linea Mainnet',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://rpc.linea.build'],
              blockExplorerUrls: ['https://lineascan.build']
            }]);
          } else {
            throw new Error(`Please switch your wallet to Linea Mainnet manually. (Error: ${switchError.message})`);
          }
        }
      }

      const abi = ["function addTraceLog(string _msg) public"];
      const contract = new ethers.Contract(TARGET_WALLET, abi, signer);
      const tx = await contract.addTraceLog("Verify FundTracer Access");

      return tx.hash;
    } catch (error: any) {
      console.error('Free Tier Transaction Failed:', error);
      if (error.code === 4001 || error.message?.includes('user rejected')) {
        throw new Error('Transaction rejected. You must complete the Free Tier verification to proceed.');
      }
      throw new Error(`Payment verification failed: ${error.message || 'Unknown error'}. Please ensure you are on Linea.`);
    }
  };

  // Session Cache
  const [resultsCache, setResultsCache] = useState<Record<string, any>>({});

  const _executeAnalyzeWallet = async () => {
    const address = walletAddresses[0]?.trim();
    if (!address) return;

    setLoading(true);
    setError(null);
    setPagination(null);
    setCurrentAnalysisAddress(address);

    const cacheKey = `${address.toLowerCase()}-${selectedChain}`;
    if (resultsCache[cacheKey]) {
      console.log('Using session cache for:', cacheKey);
      setWalletResult(resultsCache[cacheKey]);
      if (resultsCache[cacheKey].pagination) {
        setPagination(resultsCache[cacheKey].pagination!);
      }
      addToHistory(address, selectedChain);
      setLoading(false);
      return;
    }

    try {
      let txHash;
      if (profile?.tier === 'free') {
        txHash = await checkFreeTierTx();
      }

      addToHistory(address, selectedChain);

      const response = await analyzeWallet(address, selectedChain, { txHash, limit: 100, offset: 0 });
      if (response.result) {
        setWalletResult(response.result);
        setResultsCache(prev => ({ ...prev, [cacheKey]: response.result }));

        if (response.result.pagination) {
          setPagination(response.result.pagination);
        }
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('Daily limit exceeded') || err.message.includes('Upgrade to increase') || err.message.includes('Chain restricted'))) {
        setShowPayment(true);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeWallet = () => {
    const address = walletAddresses[0]?.trim();
    if (!address) return;

    const hasSeenWelcome = localStorage.getItem('fundtracer_welcome_seen');
    if (!hasSeenWelcome) {
      localStorage.setItem('fundtracer_welcome_seen', 'true');
      setShowFirstTime(true);
      setTimeout(() => _executeAnalyzeWallet(), 300);
    } else {
      _executeAnalyzeWallet();
    }
  };

  const handleLoadMoreTransactions = async () => {
    if (!walletResult || !pagination?.hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const newOffset = pagination.offset + pagination.limit;
      const { transactions: newTxs, pagination: newPagination } = await loadMoreTransactions(
        currentAnalysisAddress,
        selectedChain,
        newOffset,
        100
      );

      setWalletResult(prev => prev ? {
        ...prev,
        transactions: [...prev.transactions, ...newTxs]
      } : prev);
      setPagination(newPagination);
    } catch (err: any) {
      console.error('Failed to load more transactions:', err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const _executeCompareWallets = async () => {
    const addresses = walletAddresses.filter(a => a.trim());
    if (addresses.length < 2) return;

    setLoading(true);
    setError(null);

    try {
      let txHash;
      if (profile?.tier === 'free') {
        txHash = await checkFreeTierTx();
      }

      const response = await compareWallets(addresses, selectedChain);
      if (response.result) {
        setMultiWalletResult(response.result);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompareWallets = () => {
    const addresses = walletAddresses.filter(a => a.trim());
    if (addresses.length < 2) return;
    _executeCompareWallets();
  };

  const _executeAnalyzeContract = async () => {
    if (!contractAddress.trim()) return;

    setLoading(true);
    setError(null);

    try {
      let txHash;
      if (profile?.tier === 'free') {
        txHash = await checkFreeTierTx();
      }

      const response = await analyzeContract(contractAddress.trim(), selectedChain);
      if (response.result) {
        setContractResult(response.result);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeContract = () => {
    if (!contractAddress.trim()) return;
    _executeAnalyzeContract();
  };

  const handleAddWallet = () => {
    setWalletAddresses([...walletAddresses, '']);
  };

  const handleRemoveWallet = (index: number) => {
    setWalletAddresses(walletAddresses.filter((_, i) => i !== index));
  };

  const handleWalletChange = (index: number, value: string) => {
    const updated = [...walletAddresses];
    updated[index] = value;
    setWalletAddresses(updated);
  };

  // Handle tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
    
    // Map tabs to view modes for backward compatibility
    if (tab === 'home') {
      setViewMode('wallet');
    } else if (tab === 'portfolio' || tab === 'history' || tab === 'defi' || tab === 'explorer' || tab === 'market') {
      setViewMode('dashboard');
    } else if (tab === 'settings') {
      setViewMode('profile');
    }
  };

  // Render main content based on active tab
  const renderMainContent = () => {
    if (authLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <div className="loading-spinner" />
        </div>
      );
    }

    // Show auth loading state
    if (!user) {
      return (
        <>
          <AuthPanel />
          <HowToUse isOpen={showHowToUse} onToggle={() => setShowHowToUse(!showHowToUse)} />
          <EmptyState />
        </>
      );
    }

    // Switch between tabs
    switch (activeTab) {
      case 'portfolio':
        return (
          <Suspense fallback={<div className="loading-spinner" style={{ width: '24px', height: '24px' }} />}>
            <PortfolioDashboard walletAddress={walletAddresses[0]} />
          </Suspense>
        );
      
      case 'history':
        return (
          <Suspense fallback={<div className="loading-spinner" style={{ width: '24px', height: '24px' }} />}>
            <TransactionHistory walletAddress={walletAddresses[0]} />
          </Suspense>
        );
      
      case 'defi':
        return (
          <Suspense fallback={<div className="loading-spinner" style={{ width: '24px', height: '24px' }} />}>
            <DeFiPositions walletAddress={walletAddresses[0]} />
          </Suspense>
        );
      
      case 'explorer':
        return (
          <Suspense fallback={<div className="loading-spinner" style={{ width: '24px', height: '24px' }} />}>
            <TokenExplorer />
          </Suspense>
        );
      
      case 'settings':
        return <ProfilePage onBack={() => setActiveTab('home')} />;
      
      case 'home':
      default:
        return renderHomeContent();
    }
  };

  // Original home content with analysis
  const renderHomeContent = () => {
    if (viewMode === 'profile') {
      return <ProfilePage onBack={() => setViewMode('wallet')} />;
    }

    return (
      <>
        <AuthPanel />
        <HowToUse isOpen={showHowToUse} onToggle={() => setShowHowToUse(!showHowToUse)} />
        
        {/* Sybil Mode - Full Screen Component */}
        {viewMode === 'sybil' ? (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div className="mode-selector" style={{ marginBottom: 'var(--space-4)' }}>
              <button
                className={`mode-btn ${(viewMode as ViewMode) === 'wallet' ? 'active' : ''}`}
                onClick={() => setViewMode('wallet')}
              >
                Wallet
              </button>
              <button
                className={`mode-btn ${(viewMode as ViewMode) === 'contract' ? 'active' : ''}`}
                onClick={() => setViewMode('contract')}
              >
                Contract
              </button>
              <button
                className={`mode-btn ${(viewMode as ViewMode) === 'compare' ? 'active' : ''}`}
                onClick={() => setViewMode('compare')}
              >
                Compare
              </button>
              <button
                className={`mode-btn ${viewMode === 'sybil' ? 'active' : ''}`}
                onClick={() => setViewMode('sybil')}
                style={{ background: 'linear-gradient(135deg, #3a3a3f 0%, #1a1a1f 100%)' }}
              >
                Sybil
              </button>
            </div>
            <SybilDetector />
          </div>
        ) : (
          <>
            {/* Analysis Panel */}
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
              {/* Mode Selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <div className="mode-selector">
                  <button
                    className={`mode-btn ${viewMode === 'wallet' ? 'active' : ''}`}
                    onClick={() => setViewMode('wallet')}
                  >
                    Wallet
                  </button>
                  <button
                    className={`mode-btn ${viewMode === 'contract' ? 'active' : ''}`}
                    onClick={() => setViewMode('contract')}
                  >
                    Contract
                  </button>
                  <button
                    className={`mode-btn ${viewMode === 'compare' ? 'active' : ''}`}
                    onClick={() => setViewMode('compare')}
                  >
                    Compare
                  </button>
                  <button
                    className={`mode-btn ${(viewMode as ViewMode) === 'sybil' ? 'active' : ''}`}
                    onClick={() => setViewMode('sybil')}
                    style={{ background: (viewMode as ViewMode) === 'sybil' ? 'linear-gradient(135deg, #3a3a3f 0%, #1a1a1f 100%)' : undefined }}
                  >
                    Sybil
                  </button>
                </div>
              </div>

              {/* Chain Selector */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                  Chain
                </div>
                <ChainSelector
                  selectedChain={selectedChain}
                  onSelect={handleChainSelect}
                  onUpgrade={() => setShowPayment(true)}
                />
              </div>

              {/* Input Fields */}
              {viewMode === 'wallet' && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                    Wallet Address
                  </div>
                  <WalletInput
                    value={walletAddresses[0] || ''}
                    onChange={(value) => handleWalletChange(0, value)}
                    placeholder="Enter wallet address (0x...)"
                  />
                </div>
              )}

              {viewMode === 'contract' && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                    Contract Address or Name
                  </div>
                  <ContractSearch
                    onSelect={(address) => setContractAddress(address)}
                    placeholder="Search by name (e.g. Uniswap) or paste address"
                  />
                </div>
              )}

              {viewMode === 'compare' && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                    Wallet Addresses
                  </div>
                  {walletAddresses.map((address, index) => (
                    <div key={index} style={{ marginBottom: 'var(--space-2)' }}>
                      <WalletInput
                        value={address}
                        onChange={(value) => handleWalletChange(index, value)}
                        placeholder={`Wallet #${index + 1} (0x...)`}
                        onRemove={walletAddresses.length > 1 ? () => handleRemoveWallet(index) : undefined}
                      />
                    </div>
                  ))}
                  <button className="btn btn-secondary" onClick={handleAddWallet}>
                    + Add Wallet
                  </button>
                </div>
              )}

              {/* Analyze Button */}
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={
                  viewMode === 'wallet' ? handleAnalyzeWallet :
                    viewMode === 'contract' ? handleAnalyzeContract :
                      handleCompareWallets
                }
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div className="loading-spinner" style={{ width: 16, height: 16 }} />
                    Analyzing...
                  </span>
                ) : (
                  viewMode === 'wallet' ? 'Analyze Wallet' :
                    viewMode === 'contract' ? 'Analyze Contract' :
                      'Compare Wallets'
                )}
              </button>

              {/* Error Display */}
              {error && (
                <div className="alert danger" style={{ marginTop: 'var(--space-4)' }}>
                  {error}
                </div>
              )}
            </div>

            {/* Recent History (Only when no result) */}
            {viewMode === 'wallet' && !walletResult && !loading && (
              <div className="animate-fade-in">
                <SearchHistory
                  onSelect={(addr, chain) => {
                    setWalletAddresses([addr]);
                    if (chain) setSelectedChain(chain as ChainId);
                  }}
                />
              </div>
            )}

            {/* Results */}
            {viewMode === 'wallet' && walletResult && (
              <AnalysisView
                result={walletResult}
                pagination={pagination}
                loadingMore={loadingMore}
                onLoadMore={handleLoadMoreTransactions}
              />
            )}

            {viewMode === 'contract' && contractResult && (
              <ContractAnalysisView result={contractResult} />
            )}

            {viewMode === 'compare' && multiWalletResult && (
              <MultiWalletView result={multiWalletResult} />
            )}

            {/* Empty State */}
            {!walletResult && !multiWalletResult && !contractResult && !loading && (
              <EmptyState />
            )}
          </>
        )}
      </>
    );
  };

  // Header content for the top bar
  const headerContent = (
    <Header
      onProfileClick={() => {
        setActiveTab('settings');
        setViewMode('profile');
      }}
      onUpgradeClick={() => setShowPayment(true)}
      onFeedbackClick={() => setShowFeedback(true)}
      isUpgradeActive={showPayment}
    />
  );

  return (
    <FullScreenLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      header={headerContent}
    >
      {renderMainContent()}

      {/* Footer */}
      <footer style={{
        padding: 'var(--space-4)',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        borderTop: '1px solid var(--color-border)',
        marginTop: 'auto',
        fontSize: 'var(--text-sm)',
        display: 'flex',
        justifyContent: 'center',
        gap: 'var(--space-4)'
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

      {/* Modals */}
      {showComingSoon && (
        <ComingSoonModal onClose={() => setShowComingSoon(false)} />
      )}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      {showFirstTime && <FirstTimeModal onClose={() => setShowFirstTime(false)} />}
    </FullScreenLayout>
  );
}

export default App;
