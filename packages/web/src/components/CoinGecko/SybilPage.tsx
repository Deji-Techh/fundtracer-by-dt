import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Wallet01Icon, 
  File02Icon, 
  GitCompareIcon, 
  Shield01Icon,
  ArrowDown01Icon
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
import ContractScanner from '../ContractScanner';
import { addToHistory } from '../../utils/history';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useGasPayment } from '../../hooks/useGasPayment';
import { PoHVerificationModal } from '../PoHVerificationModal';
import { PoHGuard } from '../PoHGuard';
import { PaymentGate } from '../sybil/PaymentGate.jsx';
import { UpgradeModal } from '../sybil/UpgradeModal.jsx';
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

const modeButtons = [
  { id: 'wallet', label: 'Wallet', icon: Wallet01Icon },
  { id: 'contract', label: 'Scanner', icon: File02Icon },
  { id: 'compare', label: 'Compare', icon: GitCompareIcon },
  { id: 'sybil', label: 'Sybil', icon: Shield01Icon },
];

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

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
  
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [walletResult, setWalletResult] = useState<AnalysisResult | null>(null);
  const [multiWalletResult, setMultiWalletResult] = useState<MultiWalletResult | null>(null);
  const [contractResult, setContractResult] = useState<ContractAnalysisResult | null>(null);
  const [pagination, setPagination] = useState<{ total: number; offset: number; limit: number; hasMore: boolean } | null>(null);
  const [currentAnalysisAddress, setCurrentAnalysisAddress] = useState<string>('');
  const [resultsCache, setResultsCache] = useState<Record<string, any>>({});

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

  const [showPoHModal, setShowPoHModal] = useState(false);
  const isPoHVerified = profile?.isVerified || false;

  useEffect(() => {
    if (prefillAddress) {
      if (prefillChain) {
        setSelectedChain(prefillChain as ChainId);
      }
      
      const targetMode = (prefillType === 'sybil' || prefillType === 'contract' || prefillType === 'compare')
        ? prefillType as ViewMode
        : 'wallet';
      setViewMode(targetMode);
      
      if (prefillType === 'compare') {
        const addresses = prefillAddress.split(',').map(a => a.trim()).filter(a => a);
        setWalletAddresses(addresses);
      } else if (prefillType === 'contract') {
        setContractAddress(prefillAddress);
        setWalletAddresses(['']);
      } else {
        setWalletAddresses([prefillAddress]);
      }
      
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

        addToHistory(address, selectedChain, undefined, {
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

    if (!gateOperation()) return;
    _executeAnalyzeWallet();
  };

  const handleGasPaymentSuccessWithAnalysis = (txHash: string) => {
    closeGasModal();

    if (pendingAnalysis.type === 'wallet') {
      _executeAnalyzeWallet(txHash);
    } else if (pendingAnalysis.type === 'compare') {
      _executeCompareWallets(txHash);
    } else if (pendingAnalysis.type === 'contract') {
      _executeAnalyzeContract(txHash);
    }

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

        const compareLabel = `Compare: ${addresses.length} wallets`;
        addToHistory(addresses.join(','), selectedChain, compareLabel, {
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

        const contractLabel = response.result.contractName ? `Contract: ${response.result.contractName}` : 'Contract Analysis';
        addToHistory(contractAddress.trim(), selectedChain, contractLabel, {
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

    if (!gateOperation()) return;
    _executeAnalyzeContract();
  };

  return (
    <motion.div 
      className="page-container page-animate-enter"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Page Header */}
      <motion.div 
        className="page-header-flat"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1>Wallet & Contract Analysis</h1>
        <p>Analyze wallets, contracts, and detect Sybil patterns across multiple chains</p>
      </motion.div>

      {/* Auth Panel */}
      <AnimatePresence>
        {!isWalletConnected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="section-flat"
            style={{ textAlign: 'center', padding: isMobile ? '32px 16px' : '48px 32px' }}
          >
            <HugeiconsIcon icon={Wallet01Icon} size={48} strokeWidth={1.5} color="var(--color-accent)" />
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 600, 
              color: 'var(--color-text-primary)', 
              marginTop: 20, 
              marginBottom: 8 
            }}>
              Connect Your Wallet
            </h3>
            <p style={{ 
              color: 'var(--color-text-secondary)', 
              marginBottom: 24,
              maxWidth: 360,
              margin: '0 auto 24px',
              lineHeight: 1.6,
            }}>
              Connect your wallet to analyze addresses, contracts, and detect Sybil patterns
            </p>
            <motion.button 
              className="btn-flat btn-flat-primary" 
              onClick={onConnectWallet}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <HugeiconsIcon icon={Wallet01Icon} size={18} strokeWidth={2} />
              Connect Wallet
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Bar */}
      <motion.div 
        className="tab-bar-flat"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {modeButtons.map((mode, index) => (
          <motion.button
            key={mode.id}
            className={`tab-item ${viewMode === mode.id ? 'active' : ''}`}
            onClick={() => setViewMode(mode.id as ViewMode)}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ backgroundColor: 'var(--color-bg-hover)' }}
            whileTap={{ scale: 0.98 }}
          >
            <HugeiconsIcon icon={mode.icon} size={20} strokeWidth={1.5} />
            <span>{mode.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Guide Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ 
          padding: isMobile ? '12px 16px' : '12px 32px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <motion.button
          onClick={() => setShowHowToUse(!showHowToUse)}
          whileHover={{ backgroundColor: 'var(--color-bg-hover)' }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {showHowToUse ? 'Hide' : 'Show'} Guide
          <motion.div
            animate={{ rotate: showHowToUse ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} />
          </motion.div>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showHowToUse && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <HowToUse isOpen={true} onToggle={() => setShowHowToUse(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Section */}
      <motion.div 
        className="section-flat"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-muted)',
            marginBottom: 10,
          }}>
            Select Chain
          </label>
          <ChainSelector
            selectedChain={selectedChain}
            onSelect={handleChainSelect}
            onUpgrade={() => {}}
          />
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'wallet' && (
            <motion.div
              key="wallet-input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-muted)',
                marginBottom: 10,
              }}>
                Wallet Address
              </label>
              <WalletInput
                value={walletAddresses[0] || ''}
                onChange={(value) => handleWalletChange(0, value)}
                placeholder="Enter wallet address (0x...)"
              />
            </motion.div>
          )}

          {viewMode === 'contract' && (
            <motion.div
              key="contract-input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <ContractScanner prefilledAddress={contractAddress} />
            </motion.div>
          )}

          {viewMode === 'compare' && (
            <motion.div
              key="compare-input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-muted)',
                marginBottom: 10,
              }}>
                Wallet Addresses
              </label>
              {walletAddresses.map((address, index) => (
                <motion.div 
                  key={index} 
                  style={{ marginBottom: 12 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <WalletInput
                    value={address}
                    onChange={(value) => handleWalletChange(index, value)}
                    placeholder={`Wallet #${index + 1} (0x...)`}
                    onRemove={walletAddresses.length > 1 ? () => handleRemoveWallet(index) : undefined}
                  />
                </motion.div>
              ))}
              <motion.button 
                className="btn-flat btn-flat-secondary"
                onClick={handleAddWallet}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                style={{ marginTop: 8 }}
              >
                + Add Wallet
              </motion.button>
            </motion.div>
          )}

          {viewMode === 'sybil' && (
            <motion.div
              key="sybil-input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <PoHGuard>
                <SybilDetector />
              </PoHGuard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analyze Buttons */}
        {(viewMode === 'wallet' || viewMode === 'compare') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ marginTop: 24 }}
          >
            <motion.button
              className="btn-flat btn-flat-primary"
              onClick={viewMode === 'wallet' ? handleAnalyzeWallet : handleCompareWallets}
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              style={{ 
                minWidth: 160,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <div className="loading-spinner" style={{ width: 16, height: 16 }} />
                  Analyzing...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={viewMode === 'wallet' ? Wallet01Icon : GitCompareIcon} size={18} strokeWidth={2} />
                  {viewMode === 'wallet' ? 'Analyze Wallet' : 'Compare Wallets'}
                </>
              )}
            </motion.button>
          </motion.div>
        )}

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{ 
                marginTop: 24, 
                padding: 20, 
                background: 'var(--color-bg-elevated)', 
                border: '1px solid var(--color-danger)',
                borderRadius: 12,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--color-danger)' }}>
                Analysis Error
              </div>
              <div style={{ color: 'var(--color-text-secondary)', marginBottom: error.hint ? 12 : 0 }}>
                {error.message}
              </div>
              {error.hint && (
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--color-bg)',
                  borderRadius: 8,
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                  borderLeft: '3px solid var(--color-text-muted)',
                }}>
                  {error.hint}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Recent History */}
      {viewMode === 'wallet' && !walletResult && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <SearchHistory
            onSelect={(addr, chain) => {
              setWalletAddresses([addr]);
              if (chain) setSelectedChain(chain as ChainId);
            }}
          />
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence mode="wait">
        {viewMode === 'wallet' && walletResult && (
          <motion.div
            key="wallet-result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AnalysisView
              result={walletResult}
              pagination={pagination}
              loadingMore={loadingMore}
              onLoadMore={handleLoadMoreTransactions}
            />
          </motion.div>
        )}

        {viewMode === 'contract' && contractResult && (
          <motion.div
            key="contract-result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ContractAnalysisView result={contractResult} />
          </motion.div>
        )}

        {viewMode === 'compare' && multiWalletResult && (
          <motion.div
            key="compare-result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MultiWalletView result={multiWalletResult} chain={selectedChain} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <PaymentGate
        isOpen={showGasPaymentModal}
        onClose={closeGasModal}
        onPaymentSuccess={handleGasPaymentSuccessWithAnalysis}
        onCancel={closeGasModal}
      />

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

      <PoHVerificationModal
        isOpen={showPoHModal}
        onClose={() => setShowPoHModal(false)}
        walletAddress={walletAddress}
      />
    </motion.div>
  );
};

export default SybilPage;