import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Wallet01Icon, 
  File02Icon, 
  GitCompareIcon, 
  Shield01Icon,
  ArrowLeft01Icon
} from '@hugeicons/core-free-icons';
import AuthPanel from '../AuthPanel';
import HowToUse from '../HowToUse';
import WalletInput from '../WalletInput';
import ChainSelector from '../ChainSelector';
import AnalysisView from '../AnalysisView';
import MultiWalletView from '../MultiWalletView';
import ContractAnalysisView, { ContractAnalysisResult } from '../ContractAnalysisView';
import SybilDetector from '../SybilDetector';
import ContractSearch from '../ContractSearch';
import SearchHistory from '../SearchHistory';
import { ChainId, AnalysisResult, MultiWalletResult } from '@fundtracer/core';
import { analyzeWallet, compareWallets, analyzeContract, loadMoreTransactions } from '../../api';
import { addToHistory } from '../../utils/history';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useGasPayment } from '../../hooks/useGasPayment';
import { PoHVerificationModal } from '../PoHVerificationModal';
import { PoHGuard } from '../PoHGuard';
// @ts-ignore - JSX modules without type declarations
import { PaymentGate } from '../sybil/PaymentGate.jsx';
// @ts-ignore - JSX modules without type declarations
import { UpgradeModal } from '../sybil/UpgradeModal.jsx';
// @ts-ignore - JS modules without type declarations
import { SYBIL_TIERS } from '../../lib/sybilTier.js';

interface SybilPageProps {
  user: any;
  profile: any;
  onConnectWallet: () => void;
  isWalletConnected: boolean;
  walletAddress: string;
  prefillAddress?: string;
  prefillChain?: string;
  prefillType?: string;
  onPrefillConsumed?: () => void;
}

type ViewMode = 'wallet' | 'contract' | 'compare' | 'sybil';

const SybilPage: React.FC<SybilPageProps> = ({
  user,
  profile,
  onConnectWallet,
  isWalletConnected,
  walletAddress,
  prefillAddress,
  prefillChain,
  prefillType,
  onPrefillConsumed
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('wallet');
  const [selectedChain, setSelectedChain] = useState<ChainId>('ethereum');
  const [walletAddresses, setWalletAddresses] = useState<string[]>(['']);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [showHowToUse, setShowHowToUse] = useState(false);
  
  // Analysis state
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [walletResult, setWalletResult] = useState<AnalysisResult | null>(null);
  const [multiWalletResult, setMultiWalletResult] = useState<MultiWalletResult | null>(null);
  const [contractResult, setContractResult] = useState<ContractAnalysisResult | null>(null);
  const [pagination, setPagination] = useState<{ total: number; offset: number; limit: number; hasMore: boolean } | null>(null);
  const [currentAnalysisAddress, setCurrentAnalysisAddress] = useState<string>('');
  const [resultsCache, setResultsCache] = useState<Record<string, any>>({});

  // Pending analysis state for gas payment flow
  const [pendingAnalysis, setPendingAnalysis] = useState<{
    type: 'wallet' | 'compare' | 'contract' | null;
    txHash: string | null;
  }>({ type: null, txHash: null });

  const isMobile = useIsMobile();
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
    handleGasPaymentSuccess,
  } = useGasPayment();

  // PoH verification gate
  const [showPoHModal, setShowPoHModal] = useState(false);
  const isPoHVerified = profile?.isVerified || false;

  // Handle prefill from history page navigation
  useEffect(() => {
    if (prefillAddress) {
      if (prefillChain) {
        setSelectedChain(prefillChain as ChainId);
      }
      
      // Route to the correct sub-tab based on history item type
      const targetMode = (prefillType === 'sybil' || prefillType === 'contract' || prefillType === 'compare')
        ? prefillType as ViewMode
        : 'wallet';
      setViewMode(targetMode);
      
      // Handle different prefill types
      if (prefillType === 'compare') {
        // Split comma-separated addresses for compare type
        const addresses = prefillAddress.split(',').map(a => a.trim()).filter(a => a);
        setWalletAddresses(addresses);
      } else if (prefillType === 'contract') {
        setContractAddress(prefillAddress);
        setWalletAddresses(['']);
      } else {
        // For 'sybil' and 'wallet' types
        setWalletAddresses([prefillAddress]);
      }
      
      // Clear any previous results so user sees the input
      setWalletResult(null);
      setContractResult(null);
      setMultiWalletResult(null);
      setError(null);
      onPrefillConsumed?.();
    }
  }, [prefillAddress, prefillChain, prefillType]);

  const handleChainSelect = (chainId: ChainId) => {
    setSelectedChain(chainId);
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

  const _executeAnalyzeWallet = async (gasTxHash?: string) => {
    const address = walletAddresses[0]?.trim();
    if (!address) return;

    setLoading(true);
    setError(null);
    setPagination(null);
    setCurrentAnalysisAddress(address);

    const cacheKey = `${address.toLowerCase()}-${selectedChain}`;
    if (resultsCache[cacheKey]) {
      setWalletResult(resultsCache[cacheKey]);
      if (resultsCache[cacheKey].pagination) {
        setPagination(resultsCache[cacheKey].pagination!);
      }
      addToHistory(address, selectedChain);
      setLoading(false);
      return;
    }

    try {
      const response = await analyzeWallet(address, selectedChain, { limit: 100, offset: 0, txHash: gasTxHash });
      if (response.result) {
        setWalletResult(response.result);
        setResultsCache(prev => ({ ...prev, [cacheKey]: response.result }));

        if (response.result.pagination) {
          setPagination(response.result.pagination);
        }

        // Update history with analysis summary
        addToHistory(address, selectedChain, undefined, {
          riskScore: response.result.overallRiskScore,
          riskLevel: response.result.riskLevel,
          totalTransactions: response.result.summary?.totalTransactions,
          totalValueSentEth: response.result.summary?.totalValueSentEth,
          totalValueReceivedEth: response.result.summary?.totalValueReceivedEth,
          activityPeriodDays: response.result.summary?.activityPeriodDays,
          balanceInEth: response.result.wallet?.balanceInEth,
        });

        // Track usage
        recordUsage();
      }
    } catch (err: any) {
      setError({ message: err.message, hint: err.hint });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeWallet = () => {
    if (!isWalletConnected) {
      onConnectWallet();
      return;
    }
    if (!isPoHVerified) {
      setShowPoHModal(true);
      return;
    }

    const address = walletAddresses[0]?.trim();
    if (!address) return;

    // For free tier, skip gas payment (temporarily disabled)
    // if (currentTier === 'free') {
    //   setPendingAnalysis({ type: 'wallet', txHash: null });
    //   openGasModal();
    //   return;
    // }

    // For all tiers, use the gate operation
    if (!gateOperation()) return;

    _executeAnalyzeWallet();
  };

  const handleGasPaymentSuccessWithAnalysis = (txHash: string) => {
    // Close the gas modal
    closeGasModal();

    // Proceed with the pending analysis
    if (pendingAnalysis.type === 'wallet') {
      _executeAnalyzeWallet(txHash);
    } else if (pendingAnalysis.type === 'compare') {
      _executeCompareWallets(txHash);
    } else if (pendingAnalysis.type === 'contract') {
      _executeAnalyzeContract(txHash);
    }

    // Clear pending analysis
    setPendingAnalysis({ type: null, txHash: null });
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

  const _executeCompareWallets = async (gasTxHash?: string) => {
    const addresses = walletAddresses.filter(a => a.trim());
    if (addresses.length < 2) return;

    setLoading(true);
    setError(null);

    try {
      const response = await compareWallets(addresses, selectedChain, { txHash: gasTxHash });
      if (response.result) {
        setMultiWalletResult(response.result);

        // Save to history
        const compareLabel = `Compare: ${addresses.length} wallets`;
        addToHistory(addresses.join(','), selectedChain, compareLabel, {
          riskScore: response.result.correlationScore,
          riskLevel: response.result.isSybilLikely ? 'high' : response.result.correlationScore > 60 ? 'high' : response.result.correlationScore > 30 ? 'medium' : 'low',
          totalTransactions: response.result.directTransfers?.length,
        }, 'compare');

        // Track usage
        recordUsage();
      }
    } catch (err: any) {
      setError({ message: err.message, hint: err.hint });
    } finally {
      setLoading(false);
    }
  };

  const handleCompareWallets = () => {
    if (!isWalletConnected) {
      onConnectWallet();
      return;
    }
    if (!isPoHVerified) {
      setShowPoHModal(true);
      return;
    }

    const addresses = walletAddresses.filter(a => a.trim());
    if (addresses.length < 2) return;

    // For free tier, skip gas payment (temporarily disabled)
    // if (currentTier === 'free') {
    //   setPendingAnalysis({ type: 'compare', txHash: null });
    //   openGasModal();
    //   return;
    // }

    // For all tiers, use the gate operation
    if (!gateOperation()) return;

    _executeCompareWallets();
  };

  const _executeAnalyzeContract = async (gasTxHash?: string) => {
    if (!contractAddress.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await analyzeContract(contractAddress.trim(), selectedChain, { txHash: gasTxHash });
      if (response.result) {
        setContractResult(response.result);

        // Save to history
        const contractLabel = response.result.contractName ? `Contract: ${response.result.contractName}` : 'Contract Analysis';
        addToHistory(contractAddress.trim(), selectedChain, contractLabel, {
          totalTransactions: response.result.interactors?.length,
        }, 'contract');

        // Track usage
        recordUsage();
      }
    } catch (err: any) {
      setError({ message: err.message, hint: err.hint });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeContract = () => {
    if (!isWalletConnected) {
      onConnectWallet();
      return;
    }
    if (!isPoHVerified) {
      setShowPoHModal(true);
      return;
    }

    if (!contractAddress.trim()) return;

    // For free tier, skip gas payment (temporarily disabled)
    // if (currentTier === 'free') {
    //   setPendingAnalysis({ type: 'contract', txHash: null });
    //   openGasModal();
    //   return;
    // }

    // For all tiers, use the gate operation
    if (!gateOperation()) return;

    _executeAnalyzeContract();
  };

  const modeButtons = [
    { id: 'wallet', label: 'Wallet', icon: Wallet01Icon },
    { id: 'contract', label: 'Contract', icon: File02Icon },
    { id: 'compare', label: 'Compare', icon: GitCompareIcon },
    { id: 'sybil', label: 'Sybil', icon: Shield01Icon },
  ];

  return (
    <div className="main-content">
      <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: isMobile ? 'none' : 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: isMobile ? 20 : 32, marginTop: isMobile ? 8 : 16 }}>
          <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            Wallet & Contract Analysis
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
            Analyze wallets, contracts, and detect Sybil patterns across multiple chains
          </p>
        </div>

        {/* Auth Panel - Only show if not connected */}
        {!isWalletConnected && (
          <div className="card" style={{ marginBottom: isMobile ? 16 : 24, textAlign: 'center', padding: isMobile ? 16 : 32 }}>
            <HugeiconsIcon icon={Wallet01Icon} size={48} strokeWidth={1.5} color="var(--color-accent)" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 16, marginBottom: 8 }}>
              Connect Your Wallet
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
              Connect your wallet to analyze addresses, contracts, and detect Sybil patterns
            </p>
            <button className="btn btn-primary" onClick={onConnectWallet}>
              <HugeiconsIcon icon={Wallet01Icon} size={18} strokeWidth={1.5} />
              Connect Wallet
            </button>
          </div>
        )}

        {/* Mode Selector - Mobile Optimized */}
        <div className="mode-selector-container">
          <div className="mode-selector-tabs">
            {modeButtons.map((mode) => (
              <button
                key={mode.id}
                className={`mode-tab ${viewMode === mode.id ? 'active' : ''}`}
                onClick={() => setViewMode(mode.id as ViewMode)}
              >
                <HugeiconsIcon icon={mode.icon} size={16} strokeWidth={2} />
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* How To Use Toggle */}
        <button
          onClick={() => setShowHowToUse(!showHowToUse)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            marginBottom: 16,
            fontSize: '0.875rem'
          }}
        >
          {showHowToUse ? 'Hide' : 'Show'} Guide
          <HugeiconsIcon 
            icon={ArrowLeft01Icon} 
            size={16} 
            strokeWidth={1.5}
            style={{ transform: showHowToUse ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }}
          />
        </button>

        {showHowToUse && <HowToUse isOpen={true} onToggle={() => setShowHowToUse(false)} />}

        {/* Analysis Panel - Mobile Optimized */}
        <div className="card analysis-card">
          {/* Chain Selector */}
          <div className="analysis-section">
            <div className="analysis-label">Chain</div>
            <ChainSelector
              selectedChain={selectedChain}
              onSelect={handleChainSelect}
              onUpgrade={() => {}}
            />
          </div>

          {/* Input Fields based on mode */}
          {viewMode === 'wallet' && (
            <div className="analysis-section">
              <div className="analysis-label">Wallet Address</div>
              <WalletInput
                value={walletAddresses[0] || ''}
                onChange={(value) => handleWalletChange(0, value)}
                placeholder="Enter wallet address (0x...)"
              />
            </div>
          )}

          {viewMode === 'contract' && (
            <div className="analysis-section">
              <div className="analysis-label">Contract Address</div>
              <ContractSearch
                onSelect={(address) => setContractAddress(address)}
                placeholder="Search by name or paste address"
              />
            </div>
          )}

          {viewMode === 'compare' && (
            <div className="analysis-section">
              <div className="analysis-label">Wallet Addresses</div>
              {walletAddresses.map((address, index) => (
                <div key={index} className="wallet-input-wrapper">
                  <WalletInput
                    value={address}
                    onChange={(value) => handleWalletChange(index, value)}
                    placeholder={`Wallet #${index + 1} (0x...)`}
                    onRemove={walletAddresses.length > 1 ? () => handleRemoveWallet(index) : undefined}
                  />
                </div>
              ))}
              <button className="btn btn-secondary btn-add-wallet" onClick={handleAddWallet}>
                + Add Wallet
              </button>
            </div>
          )}

          {viewMode === 'sybil' && (
            <PoHGuard>
              <SybilDetector />
            </PoHGuard>
          )}

          {/* Analyze Button - Full Width for Mobile */}
          {viewMode !== 'sybil' && (
            <button
              className="btn btn-primary btn-analyze"
              onClick={
                viewMode === 'wallet' ? handleAnalyzeWallet :
                  viewMode === 'contract' ? handleAnalyzeContract :
                    handleCompareWallets
              }
              disabled={loading}
            >
              {loading ? (
                <span className="btn-content">
                  <div className="loading-spinner" style={{ width: 16, height: 16 }} />
                  Analyzing...
                </span>
              ) : (
                <span className="btn-content">
                  <HugeiconsIcon icon={viewMode === 'wallet' ? Wallet01Icon : viewMode === 'contract' ? File02Icon : GitCompareIcon} size={18} strokeWidth={1.5} />
                  {viewMode === 'wallet' ? 'Analyze Wallet' :
                    viewMode === 'contract' ? 'Analyze Contract' :
                      'Compare Wallets'}
                </span>
              )}
            </button>
          )}

          {/* Error Display */}
          {error && (
            <div style={{ 
              marginTop: 16, 
              padding: 16, 
              background: 'var(--color-bg-elevated)', 
              border: '1px solid var(--color-danger, #ef4444)',
              color: 'var(--color-text-primary)', 
              borderRadius: 12,
              fontSize: '0.875rem'
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--color-danger, #ef4444)' }}>
                Analysis Error
              </div>
              <div style={{ color: 'var(--color-text-secondary)', marginBottom: error.hint ? 8 : 0 }}>
                {error.message}
              </div>
              {error.hint && (
                <div style={{
                  padding: '8px 12px',
                  background: 'var(--color-bg-tertiary)',
                  borderRadius: 8,
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-muted)',
                  borderLeft: '2px solid var(--color-text-muted)',
                }}>
                  {error.hint}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent History */}
        {viewMode === 'wallet' && !walletResult && !loading && (
          <SearchHistory
            onSelect={(addr, chain) => {
              setWalletAddresses([addr]);
              if (chain) setSelectedChain(chain as ChainId);
            }}
          />
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
          <MultiWalletView result={multiWalletResult} chain={selectedChain} />
        )}
      </div>

      {/* Gas Payment Modal */}
      <PaymentGate
        isOpen={showGasPaymentModal}
        onClose={closeGasModal}
        onPaymentSuccess={handleGasPaymentSuccessWithAnalysis}
        onCancel={closeGasModal}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={closeUpgradeModal}
        currentTier={currentTier}
        walletAddress={walletAddress || null}
        onUpgradeComplete={(newTier: 'free' | 'pro' | 'max') => {
          setCurrentTier(newTier);
          closeUpgradeModal();
        }}
      />

      {/* PoH Verification Modal */}
      <PoHVerificationModal
        isOpen={showPoHModal}
        onClose={() => setShowPoHModal(false)}
        walletAddress={walletAddress}
      />
    </div>
  );
};

export default SybilPage;
