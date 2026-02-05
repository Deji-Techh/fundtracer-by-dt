import React, { useState } from 'react';
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

interface SybilPageProps {
  user: any;
  profile: any;
  onConnectWallet: () => void;
  isWalletConnected: boolean;
  walletAddress: string;
}

type ViewMode = 'wallet' | 'contract' | 'compare' | 'sybil';

const SybilPage: React.FC<SybilPageProps> = ({
  user,
  profile,
  onConnectWallet,
  isWalletConnected,
  walletAddress
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('wallet');
  const [selectedChain, setSelectedChain] = useState<ChainId>('ethereum');
  const [walletAddresses, setWalletAddresses] = useState<string[]>(['']);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [showHowToUse, setShowHowToUse] = useState(false);
  
  // Analysis state
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletResult, setWalletResult] = useState<AnalysisResult | null>(null);
  const [multiWalletResult, setMultiWalletResult] = useState<MultiWalletResult | null>(null);
  const [contractResult, setContractResult] = useState<ContractAnalysisResult | null>(null);
  const [pagination, setPagination] = useState<{ total: number; offset: number; limit: number; hasMore: boolean } | null>(null);
  const [currentAnalysisAddress, setCurrentAnalysisAddress] = useState<string>('');
  const [resultsCache, setResultsCache] = useState<Record<string, any>>({});

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

  const _executeAnalyzeWallet = async () => {
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
      addToHistory(address, selectedChain);
      const response = await analyzeWallet(address, selectedChain, { limit: 100, offset: 0 });
      if (response.result) {
        setWalletResult(response.result);
        setResultsCache(prev => ({ ...prev, [cacheKey]: response.result }));

        if (response.result.pagination) {
          setPagination(response.result.pagination);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeWallet = () => {
    if (!isWalletConnected) {
      onConnectWallet();
      return;
    }
    const address = walletAddresses[0]?.trim();
    if (!address) return;
    _executeAnalyzeWallet();
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
    if (!isWalletConnected) {
      onConnectWallet();
      return;
    }
    const addresses = walletAddresses.filter(a => a.trim());
    if (addresses.length < 2) return;
    _executeCompareWallets();
  };

  const _executeAnalyzeContract = async () => {
    if (!contractAddress.trim()) return;

    setLoading(true);
    setError(null);

    try {
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
    if (!isWalletConnected) {
      onConnectWallet();
      return;
    }
    if (!contractAddress.trim()) return;
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
      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>
            Wallet & Contract Analysis
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
            Analyze wallets, contracts, and detect Sybil patterns across multiple chains
          </p>
        </div>

        {/* Auth Panel - Only show if not connected */}
        {!isWalletConnected && (
          <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 32 }}>
            <HugeiconsIcon icon={Wallet01Icon} size={48} strokeWidth={1.5} color="#3b82f6" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginTop: 16, marginBottom: 8 }}>
              Connect Your Wallet
            </h3>
            <p style={{ color: '#9ca3af', marginBottom: 24 }}>
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
            border: '1px solid #2a2a2a',
            background: 'transparent',
            color: '#9ca3af',
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
            <SybilDetector />
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
              padding: 12, 
              background: '#ef4444', 
              color: '#fff', 
              borderRadius: 8,
              fontSize: '0.875rem'
            }}>
              {error}
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
          <MultiWalletView result={multiWalletResult} />
        )}
      </div>
    </div>
  );
};

export default SybilPage;
