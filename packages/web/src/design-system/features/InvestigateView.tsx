/**
 * InvestigateView - Full investigation page using new design system
 * Integrates InvestigateSection with existing API and results display
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from '../../contexts/AuthContext';
import { ChainId, CHAINS, AnalysisResult, MultiWalletResult } from '@fundtracer/core';
import { analyzeWallet, compareWallets, analyzeContract, loadMoreTransactions } from '../../api';
import { addToHistory } from '../../utils/history';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useGasPayment } from '../../hooks/useGasPayment';
import { InvestigateSection, InvestigateMode, ChainOption } from './InvestigateSection';
import { Panel, Badge, StatGrid, StatBlock, DataGrid, Column, EntityCard } from '../primitives';
import './InvestigateView.css';

// Lazy load result views
import AnalysisView from '../../components/AnalysisView';
import MultiWalletView from '../../components/MultiWalletView';
import ContractAnalysisView, { ContractAnalysisResult } from '../../components/ContractAnalysisView';
import SybilDetector from '../../components/SybilDetector';
import SearchHistory from '../../components/SearchHistory';
import { PoHVerificationModal } from '../../components/PoHVerificationModal';
import { PoHGuard } from '../../components/PoHGuard';

interface InvestigateViewProps {
  prefillAddress?: string;
  prefillChain?: string;
  prefillType?: string;
  onPrefillConsumed?: () => void;
}

export function InvestigateView({
  prefillAddress,
  prefillChain,
  prefillType,
  onPrefillConsumed
}: InvestigateViewProps) {
  const { user, profile, isAuthenticated } = useAuth();
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const isMobile = useIsMobile();

  // State
  const [mode, setMode] = useState<InvestigateMode>('wallet');
  const [selectedChain, setSelectedChain] = useState<ChainId>('linea');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);

  // Results
  const [walletResult, setWalletResult] = useState<AnalysisResult | null>(null);
  const [multiWalletResult, setMultiWalletResult] = useState<MultiWalletResult | null>(null);
  const [contractResult, setContractResult] = useState<ContractAnalysisResult | null>(null);
  const [pagination, setPagination] = useState<{ total: number; offset: number; limit: number; hasMore: boolean } | null>(null);
  const [currentAnalysisAddress, setCurrentAnalysisAddress] = useState<string>('');
  const [resultsCache, setResultsCache] = useState<Record<string, any>>({});

  // Modals
  const [showPoHModal, setShowPoHModal] = useState(false);
  const isPoHVerified = profile?.isVerified || false;

  // Gas payment hook
  const {
    showGasPaymentModal,
    showUpgradeModal,
    currentTier,
    openGasModal,
    closeGasModal,
    closeUpgradeModal,
    setCurrentTier,
    gateOperation,
    recordUsage,
  } = useGasPayment();

  // Handle prefill from history or external navigation
  const prefillAddresses = prefillType === 'compare' && prefillAddress 
    ? prefillAddress.split(',').filter(a => a.trim())
    : [];

  useEffect(() => {
    if (prefillAddress) {
      if (prefillChain) {
        setSelectedChain(prefillChain as ChainId);
      }
      
      const targetMode = (prefillType === 'sybil' || prefillType === 'contract' || prefillType === 'compare')
        ? prefillType as InvestigateMode
        : 'wallet';
      setMode(targetMode);
      
      // Clear previous results
      setWalletResult(null);
      setContractResult(null);
      setMultiWalletResult(null);
      setError(null);
      onPrefillConsumed?.();
    }
  }, [prefillAddress, prefillChain, prefillType, onPrefillConsumed]);

  // Build chain options with tier restrictions
  const tier = (profile?.tier || 'free').toLowerCase();
  const chains: ChainOption[] = Object.values(CHAINS).map((chain) => {
    let locked = false;
    let requiredTier = '';
    
    if (tier === 'free' && chain.id !== 'linea') {
      locked = true;
      requiredTier = ['arbitrum', 'base'].includes(chain.id) ? 'PRO' : 'MAX';
    } else if (tier === 'pro' && !['linea', 'arbitrum', 'base'].includes(chain.id)) {
      locked = true;
      requiredTier = 'MAX';
    }
    
    return {
      id: chain.id,
      name: chain.name,
      locked,
      requiredTier
    };
  });

  // Connect wallet handler
  const handleConnectWallet = useCallback(() => {
    if (!isConnected) {
      open();
    }
  }, [isConnected, open]);

  // Analyze wallet
  const handleAnalyzeWallet = async (addresses: string[]) => {
    const addr = addresses[0]?.trim();
    if (!addr) return;

    if (!isConnected) {
      handleConnectWallet();
      return;
    }
    if (!isPoHVerified) {
      setShowPoHModal(true);
      return;
    }
    if (!gateOperation()) return;

    setLoading(true);
    setError(null);
    setPagination(null);
    setCurrentAnalysisAddress(addr);

    const cacheKey = `${addr.toLowerCase()}-${selectedChain}`;
    if (resultsCache[cacheKey]) {
      setWalletResult(resultsCache[cacheKey]);
      if (resultsCache[cacheKey].pagination) {
        setPagination(resultsCache[cacheKey].pagination!);
      }
      addToHistory(addr, selectedChain);
      setLoading(false);
      return;
    }

    try {
      const response = await analyzeWallet(addr, selectedChain, { limit: 100, offset: 0 });
      if (response.result) {
        setWalletResult(response.result);
        setResultsCache(prev => ({ ...prev, [cacheKey]: response.result }));

        if (response.result.pagination) {
          setPagination(response.result.pagination);
        }

        addToHistory(addr, selectedChain, undefined, {
          riskScore: response.result.overallRiskScore,
          riskLevel: response.result.riskLevel,
          totalTransactions: response.result.summary?.totalTransactions,
          totalValueSentEth: response.result.summary?.totalValueSentEth,
          totalValueReceivedEth: response.result.summary?.totalValueReceivedEth,
          activityPeriodDays: response.result.summary?.activityPeriodDays,
          balanceInEth: response.result.wallet?.balanceInEth,
        });

        await recordUsage();
      }
    } catch (err: any) {
      setError({ message: err.message, hint: err.hint });
    } finally {
      setLoading(false);
    }
  };

  // Compare wallets
  const handleCompareWallets = async (addresses: string[]) => {
    const validAddresses = addresses.filter(a => a.trim());
    if (validAddresses.length < 2) return;

    if (!isConnected) {
      handleConnectWallet();
      return;
    }
    if (!isPoHVerified) {
      setShowPoHModal(true);
      return;
    }
    if (!gateOperation()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await compareWallets(validAddresses, selectedChain);
      if (response.result) {
        setMultiWalletResult(response.result);

        const compareLabel = `Compare: ${validAddresses.length} wallets`;
        addToHistory(validAddresses.join(','), selectedChain, compareLabel, {
          riskScore: response.result.correlationScore,
          riskLevel: response.result.isSybilLikely ? 'high' : response.result.correlationScore > 60 ? 'high' : response.result.correlationScore > 30 ? 'medium' : 'low',
          totalTransactions: response.result.directTransfers?.length,
        }, 'compare');

        await recordUsage();
      }
    } catch (err: any) {
      setError({ message: err.message, hint: err.hint });
    } finally {
      setLoading(false);
    }
  };

  // Analyze contract
  const handleAnalyzeContract = async (addresses: string[]) => {
    const contractAddress = addresses[0]?.trim();
    if (!contractAddress) return;

    if (!isConnected) {
      handleConnectWallet();
      return;
    }
    if (!isPoHVerified) {
      setShowPoHModal(true);
      return;
    }
    if (!gateOperation()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await analyzeContract(contractAddress, selectedChain);
      if (response.result) {
        setContractResult(response.result);

        const contractLabel = response.result.contractName ? `Contract: ${response.result.contractName}` : 'Contract Analysis';
        addToHistory(contractAddress, selectedChain, contractLabel, {
          totalTransactions: response.result.interactors?.length,
        }, 'contract');

        await recordUsage();
      }
    } catch (err: any) {
      setError({ message: err.message, hint: err.hint });
    } finally {
      setLoading(false);
    }
  };

  // Main analyze handler
  const handleAnalyze = (addresses: string[], analysisMode: InvestigateMode) => {
    // Clear previous results
    setWalletResult(null);
    setMultiWalletResult(null);
    setContractResult(null);
    setError(null);

    switch (analysisMode) {
      case 'wallet':
        handleAnalyzeWallet(addresses);
        break;
      case 'contract':
        handleAnalyzeContract(addresses);
        break;
      case 'compare':
        handleCompareWallets(addresses);
        break;
      case 'sybil':
        // Sybil mode is handled by the SybilDetector component
        break;
    }
  };

  // Load more transactions
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

  // Select from history
  const handleSelectFromHistory = (addr: string, chain?: string) => {
    if (chain) setSelectedChain(chain as ChainId);
    handleAnalyze([addr], mode);
  };

  // Render results based on mode
  const renderResults = () => {
    if (error) {
      return (
        <Panel className="investigate-error">
          <div className="investigate-error__title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            Analysis Error
          </div>
          <p className="investigate-error__message">{error.message}</p>
          {error.hint && (
            <div className="investigate-error__hint">{error.hint}</div>
          )}
        </Panel>
      );
    }

    if (mode === 'sybil') {
      return (
        <PoHGuard>
          <SybilDetector />
        </PoHGuard>
      );
    }

    if (mode === 'wallet' && walletResult) {
      return (
        <AnalysisView
          result={walletResult}
          pagination={pagination}
          loadingMore={loadingMore}
          onLoadMore={handleLoadMoreTransactions}
        />
      );
    }

    if (mode === 'contract' && contractResult) {
      return <ContractAnalysisView result={contractResult} />;
    }

    if (mode === 'compare' && multiWalletResult) {
      return <MultiWalletView result={multiWalletResult} chain={selectedChain} />;
    }

    // Show history when no results
    if (mode === 'wallet' && !loading) {
      return (
        <SearchHistory
          onSelect={handleSelectFromHistory}
        />
      );
    }

    return null;
  };

  return (
    <div className="investigate-view">
      {/* Header */}
      <div className="investigate-view__header">
        <h1 className="investigate-view__title">Investigate</h1>
        <p className="investigate-view__subtitle">
          Analyze wallets, contracts, and detect Sybil patterns across multiple chains
        </p>
      </div>

      {/* Connect Wallet Prompt */}
      {!isConnected && (
        <Panel className="investigate-view__connect">
          <div className="investigate-view__connect-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <path d="M2 10h20"/>
              <path d="M6 15h4"/>
            </svg>
            <h3>Connect Your Wallet</h3>
            <p>Connect your wallet to analyze addresses, contracts, and detect Sybil patterns</p>
            <button className="investigate-view__connect-btn" onClick={handleConnectWallet}>
              Connect Wallet
            </button>
          </div>
        </Panel>
      )}

      {/* Main Investigation Section */}
      <InvestigateSection
        mode={mode}
        onModeChange={setMode}
        chains={chains}
        selectedChain={selectedChain}
        onChainChange={(id) => setSelectedChain(id as ChainId)}
        onAnalyze={handleAnalyze}
        loading={loading}
        disabled={!isConnected}
        prefillAddresses={prefillAddresses}
      />

      {/* Results */}
      <div className="investigate-view__results">
        {renderResults()}
      </div>

      {/* PoH Modal */}
      <PoHVerificationModal
        isOpen={showPoHModal}
        onClose={() => setShowPoHModal(false)}
        walletAddress={address || ''}
      />
    </div>
  );
}

export default InvestigateView;
