/**
 * InvestigateView - Updated to match new design system
 * Uses simplified UI structure while maintaining API integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from '../../contexts/AuthContext';
import { ChainId, AnalysisResult, MultiWalletResult } from '@fundtracer/core';
import { analyzeWallet, compareWallets, analyzeContract, loadMoreTransactions } from '../../api';
import { addToHistory, getHistory, type HistoryItem } from '../../utils/history';
import { useGasPayment } from '../../hooks/useGasPayment';
import { CHAIN_CONFIG } from '../../config/chains';
import './InvestigateView.css';

// Lazy load result views
import AnalysisView from '../../components/AnalysisView';
import MultiWalletView from '../../components/MultiWalletView';
import ContractAnalysisView, { ContractAnalysisResult } from '../../components/ContractAnalysisView';
import SybilDetector from '../../components/SybilDetector';
import SearchHistory from '../../components/SearchHistory';

interface InvestigateViewProps {
  prefillAddress?: string;
  prefillChain?: string;
  prefillType?: string;
  onPrefillConsumed?: () => void;
}

// Tab types matching reference HTML
type TabType = 'wallet' | 'contract' | 'compare' | 'sybil';

interface Stats {
  chainsIndexed: number;
  walletsTraced: string;
  sybilClusters: string;
  avgResponse: string;
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

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('wallet');
  
  // Chain state
  const [selectedChain, setSelectedChain] = useState<ChainId>('linea');
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);

  // UI state for dropdowns
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Get user tier from profile
  const userTier = profile?.tier || 'free';

  // Define chain tiers - which chains require which tier
  const chainTiers: Record<string, 'free' | 'pro' | 'max'> = {
    linea: 'free',
    eth: 'max',
    ethereum: 'max',
    polygon_pos: 'max',
    polygon: 'max',
    optimism: 'max',
    base: 'pro',
    arbitrum: 'pro',
    bsc: 'free',
  };

  // Check if user can access a chain
  const canAccessChain = (chainId: string) => {
    const requiredTier = chainTiers[chainId];
    if (!requiredTier) return true;
    if (requiredTier === 'max') return userTier === 'max';
    if (requiredTier === 'pro') return userTier === 'pro' || userTier === 'max';
    return true;
  };

  // Stats for real-time display
  const [stats, setStats] = useState<Stats>({
    chainsIndexed: 6,
    walletsTraced: '2.4M',
    sybilClusters: '18.7K',
    avgResponse: '0.4s'
  });

  // Results
  const [walletResult, setWalletResult] = useState<AnalysisResult | null>(null);
  const [multiWalletResult, setMultiWalletResult] = useState<MultiWalletResult | null>(null);
  const [contractResult, setContractResult] = useState<ContractAnalysisResult | null>(null);
  const [pagination, setPagination] = useState<{ total: number; offset: number; limit: number; hasMore: boolean } | null>(null);
  const [currentAnalysisAddress, setCurrentAnalysisAddress] = useState<string>('');
  const [resultsCache, setResultsCache] = useState<Record<string, any>>({});

  // Gas payment hook (keep for now, just remove PoH requirement)
  const {
    recordUsage,
  } = useGasPayment();

  // Get recent scans from history
  const recentHistory = getHistory().slice(0, 4);

  // Handle prefill
  useEffect(() => {
    if (prefillAddress) {
      if (prefillChain) {
        setSelectedChain(prefillChain as ChainId);
      }
      
      const targetMode = (prefillType === 'sybil' || prefillType === 'contract' || prefillType === 'compare')
        ? prefillType as TabType
        : 'wallet';
      setActiveTab(targetMode);
      
      setWalletResult(null);
      setContractResult(null);
      setMultiWalletResult(null);
      setError(null);
      onPrefillConsumed?.();
    }
  }, [prefillAddress, prefillChain, prefillType, onPrefillConsumed]);

  // Build chain options from local CHAIN_CONFIG
  const chains = Object.values(CHAIN_CONFIG).map((chain) => ({
    id: chain.id,
    name: chain.name,
    color: chain.color,
    tier: undefined // tier not available in CHAIN_CONFIG
  }));

  // Connect wallet handler
  const handleConnectWallet = useCallback(() => {
    if (!isConnected) {
      open();
    }
  }, [isConnected, open]);

  // Analyze wallet (removed PoH verification)
  const handleAnalyzeWallet = async (address: string) => {
    if (!address.trim()) return;

    if (!isConnected) {
      handleConnectWallet();
      return;
    }

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
      const response = await analyzeWallet(address, selectedChain, { limit: 100, offset: 0 });
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

  // Handle analyze button click
  const handleAnalyze = () => {
    const input = document.querySelector('.ft-addr-input') as HTMLInputElement;
    if (!input || !input.value.trim()) return;

    const address = input.value.trim();

    switch (activeTab) {
      case 'wallet':
        handleAnalyzeWallet(address);
        break;
      case 'contract':
        // Handle contract analysis
        handleAnalyzeContract(address);
        break;
      case 'compare':
        // Handle compare (multiple addresses)
        const addresses = address.split(',').map(a => a.trim()).filter(a => a);
        if (addresses.length >= 2) {
          handleCompareWallets(addresses);
        }
        break;
      case 'sybil':
        // Sybil detection handled by SybilDetector
        break;
    }
  };

  // Handle contract analysis
  const handleAnalyzeContract = async (address: string) => {
    if (!address.trim()) return;

    if (!isConnected) {
      handleConnectWallet();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await analyzeContract(address, selectedChain);
      if (response.result) {
        setContractResult(response.result);
        addToHistory(address, selectedChain, 'Contract Analysis', {
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

  // Compare wallets
  const handleCompareWallets = async (addresses: string[]) => {
    if (addresses.length < 2) return;

    if (!isConnected) {
      handleConnectWallet();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await compareWallets(addresses, selectedChain);
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
    handleAnalyzeWallet(addr);
  };

  // Render results based on active tab
  const renderResults = () => {
    if (error) {
      return (
        <div className="investigate-error">
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
        </div>
      );
    }

    // Sybil tab - show only SybilDetector without PoH guard
    if (activeTab === 'sybil') {
      return <SybilDetector />;
    }

    // Wallet tab - show AnalysisView or SearchHistory
    if (activeTab === 'wallet') {
      if (walletResult) {
        return (
          <AnalysisView
            result={walletResult}
            pagination={pagination}
            loadingMore={loadingMore}
            onLoadMore={handleLoadMoreTransactions}
          />
        );
      }
      return (
        <SearchHistory
          onSelect={handleSelectFromHistory}
        />
      );
    }

    // Contract tab - show ContractAnalysisView
    if (activeTab === 'contract') {
      if (contractResult) {
        return <ContractAnalysisView result={contractResult} />;
      }
      return (
        <div className="investigate-empty">
          <div className="investigate-empty__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <h3>Enter Contract Address</h3>
          <p>Enter an EVM contract address to analyze its interactions and code.</p>
        </div>
      );
    }

    // Compare tab - show MultiWalletView
    if (activeTab === 'compare') {
      if (multiWalletResult) {
        return <MultiWalletView result={multiWalletResult} chain={selectedChain} />;
      }
      return (
        <div className="investigate-empty">
          <div className="investigate-empty__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <h3>Compare Multiple Wallets</h3>
          <p>Enter 2+ addresses separated by commas to compare their activity and connections.</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="investigate-view">
      {/* Page Header */}
      <div className="page-head">
        <div className="page-title">Investigate</div>
        <div className="page-desc">Analyze wallets, contracts, and detect Sybil patterns across multiple chains</div>
      </div>

      {/* Stats Grid */}
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Chains indexed</div>
          <div className="stat-val">{stats.chainsIndexed}</div>
          <div className="stat-note">+Linea recently</div>
        </div>
        <div className="stat">
          <div className="stat-label">Wallets traced</div>
          <div className="stat-val">{stats.walletsTraced}</div>
          <div className="stat-note">+12k this week</div>
        </div>
        <div className="stat">
          <div className="stat-label">Sybil clusters</div>
          <div className="stat-val">{stats.sybilClusters}</div>
          <div className="stat-note">3.2% flagged</div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg response</div>
          <div className="stat-val">{stats.avgResponse}</div>
          <div className="stat-note">Indexer healthy</div>
        </div>
      </div>

      {/* Panel with Tabs */}
      <div className="panel">
        {/* Tabs */}
        <div className="tabs">
          <div 
            className={`tab ${activeTab === 'wallet' ? 'active' : ''}`}
            onClick={() => setActiveTab('wallet')}
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="1" width="10" height="10" rx="1"/>
              <path d="M3 4h6M3 6h6M3 8h3"/>
            </svg>
            Wallet
          </div>
          <div 
            className={`tab ${activeTab === 'contract' ? 'active' : ''}`}
            onClick={() => setActiveTab('contract')}
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 11V4.5L6 1l5 3.5V11"/>
              <rect x="4" y="7" width="4" height="4"/>
            </svg>
            Contract
          </div>
          <div 
            className={`tab ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="3.5" cy="6" r="2"/><circle cx="8.5" cy="6" r="2"/>
              <path d="M5.5 6h1M3.5 4V2M8.5 4V2"/>
            </svg>
            Compare
          </div>
          <div 
            className={`tab ${activeTab === 'sybil' ? 'active' : ''}`}
            onClick={() => setActiveTab('sybil')}
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 1l1.3 3H11l-2.7 2 1 3.3L6 7.5 3.7 9.3l1-3.3L2 4h3.7z"/>
            </svg>
            Sybil Detector
          </div>
        </div>

        <div className="panel-body">
          {/* Network Selection - Only show for wallet/contract/compare tabs */}
          {activeTab !== 'sybil' && (
            <>
              <div className="field-label">Network</div>
              <div className="chains">
                {chains.map(chain => {
                  const requiredTier = chainTiers[chain.id];
                  const isAccessible = canAccessChain(chain.id);
                  return (
                    <div 
                      key={chain.id}
                      className={`chain ${selectedChain === chain.id ? 'active' : ''} ${!isAccessible ? 'chain-disabled' : ''}`}
                      onClick={() => {
                        if (isAccessible) {
                          setSelectedChain(chain.id as ChainId);
                        }
                      }}
                      style={{ opacity: isAccessible ? 1 : 0.5, cursor: isAccessible ? 'pointer' : 'not-allowed' }}
                    >
                      <div className="chain-pip" style={{ background: chain.color }}></div>
                      {chain.name}
                      {requiredTier && <span className="chain-tier">{requiredTier}</span>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Address Input - Only show for wallet/contract/compare tabs */}
          {activeTab !== 'sybil' && (
            <>
              <div className="field-label">
                {activeTab === 'wallet' && 'Wallet address'}
                {activeTab === 'contract' && 'Contract address'}
                {activeTab === 'compare' && 'Wallet addresses (comma separated)'}
              </div>
              <div className="addr-field">
                <div className="addr-bar">
                  <span className="addr-label">EVM</span>
                  <div className="addr-tools">
                    <button className="addr-tool" onClick={() => navigator.clipboard.readText().then(text => {
                      const input = document.querySelector('.ft-addr-input') as HTMLInputElement;
                      if (input) input.value = text;
                    })}>
                      <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <rect x="3" y="1" width="6" height="7" rx="0.5"/>
                        <path d="M1 3v6h6"/>
                      </svg>
                      Paste
                    </button>
                    <button className="addr-tool" onClick={() => setShowRecentDropdown(!showRecentDropdown)}>Recent</button>
                    <button className="addr-tool" onClick={() => setShowGuideModal(true)}>Guide ↗</button>
                  </div>
                </div>
                <input 
                  className="ft-addr-input" 
                  type="text" 
                  placeholder={
                    activeTab === 'wallet' 
                      ? '0x… wallet address or ENS name' 
                      : activeTab === 'contract'
                      ? '0x… contract address'
                      : '0x…, 0x… (comma separated)'
                  }
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleAnalyze();
                  }}
                />
              </div>
              
              <div className="hint">
                {activeTab === 'wallet' && 'Supports EVM addresses and ENS names.'}
                {activeTab === 'contract' && 'Enter a contract address to analyze its code and interactions.'}
                {activeTab === 'compare' && 'Enter 2 or more addresses separated by commas to compare.'}
              </div>

              {/* Actions */}
              <div className="actions">
                <button className="btn-analyze" onClick={handleAnalyze} disabled={loading}>
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5l3 3"/>
                  </svg>
                  {loading 
                    ? 'Analyzing...' 
                    : activeTab === 'wallet' 
                    ? 'Analyze Wallet'
                    : activeTab === 'contract'
                    ? 'Analyze Contract'
                    : 'Compare Wallets'}
                </button>
                <button className="btn-ghost">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1 6h10M7 2l4 4-4 4"/>
                  </svg>
                  Batch
                </button>
                <button className="btn-ghost">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 1v8M2 6l4 4 4-4M1 11h10"/>
                  </svg>
                  Export
                </button>
              </div>
            </>
          )}

          {/* Recent - Only show for wallet tab */}
          {activeTab === 'wallet' && (
            <div className="recent">
              <div className="recent-header">Recent</div>
              <div className="recent-list">
                {recentHistory.length > 0 ? (
                  recentHistory.map((item: HistoryItem, index: number) => {
                    const chainKey = item.chain as keyof typeof CHAIN_CONFIG;
                    const chainName = chainKey && CHAIN_CONFIG[chainKey] 
                      ? CHAIN_CONFIG[chainKey].name 
                      : (item.chain || 'ETH');
                    return (
                      <div 
                        key={index}
                        className="recent-item" 
                        onClick={() => handleAnalyzeWallet(item.address)}
                      >
                        <span className="recent-chain">{chainName.slice(0, 3).toUpperCase()}</span>
                        {item.address.length > 10 
                          ? `${item.address.slice(0, 6)}…${item.address.slice(-4)}`
                          : item.address}
                      </div>
                    );
                  })
                ) : (
                  <div className="recent-item">
                    <span className="recent-chain">NEW</span>No recent scans
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      <div className="investigate-results">
        {renderResults()}
      </div>

      {/* Guide Modal */}
      {showGuideModal && (
        <div className="modal-backdrop" onClick={() => setShowGuideModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>How to Use Fundtracer</h3>
              <button className="modal-close" onClick={() => setShowGuideModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="guide-section">
                <h4>1. Enter a Wallet Address</h4>
                <p>Paste any EVM wallet address (starts with 0x) or ENS name into the input field.</p>
              </div>
              <div className="guide-section">
                <h4>2. Select a Network</h4>
                <p>Choose which blockchain to analyze (Linea, Ethereum, Arbitrum, Base, etc.).</p>
              </div>
              <div className="guide-section">
                <h4>3. View Analysis</h4>
                <p>See the wallet's transaction history, risk score, funding sources, and more.</p>
              </div>
              <div className="guide-section">
                <h4>4. Detect Sybils</h4>
                <p>Use the Sybil Detector tab to find coordinated bot networks.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvestigateView;
