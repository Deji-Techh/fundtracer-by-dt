import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { useNavigate } from 'react-router-dom';
import '../global.css';
import {
  Clock01Icon,
  Delete01Icon,
  Wallet01Icon,
  Cancel01Icon,
  ArrowLeftIcon,
  ArrowRightIcon,
  UserIcon,
  File01Icon,
  GroupIcon,
  Exchange01Icon,
  Analytics01Icon,
  EyeIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { HistoryItem, getHistory, removeFromHistory, clearHistory, syncHistoryWithServer } from '../utils/history';
import { getLabel } from '../utils/addressBook';
import { CHAINS, ChainId } from '@fundtracer/core';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';
import { WalletButton } from './WalletButton';

interface HistoryPageProps {
  onSelectScan: (address: string, chain: string, type?: string) => void;
}

type PageType = 'wallet' | 'contract' | 'compare' | 'sybil' | 'polymarket';

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627eea',
  linea: '#61dfff',
  arbitrum: '#28a0f0',
  base: '#0052ff',
  optimism: '#ff0420',
  polygon: '#8247e5',
};

function getRiskColor(level?: string): string {
  if (!level) return 'var(--color-text-muted)';
  switch (level.toLowerCase()) {
    case 'low': return 'var(--color-positive)';
    case 'medium': return 'var(--color-warning)';
    case 'high': return 'var(--color-danger)';
    case 'critical': return '#ff4444';
    default: return 'var(--color-text-muted)';
  }
}

function getRiskBg(level?: string): string {
  if (!level) return 'var(--color-bg-elevated)';
  switch (level.toLowerCase()) {
    case 'low': return 'rgba(16, 185, 129, 0.12)';
    case 'medium': return 'rgba(245, 158, 11, 0.12)';
    case 'high': return 'rgba(239, 68, 68, 0.12)';
    case 'critical': return 'rgba(255, 68, 68, 0.15)';
    default: return 'var(--color-bg-elevated)';
  }
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function formatEth(value?: number): string {
  if (value === undefined || value === null) return '--';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(3);
  return value.toFixed(4);
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onSelectScan }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState<PageType>('wallet');
  const [confirmClear, setConfirmClear] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [hoveredAddress, setHoveredAddress] = useState<{ address: string; x: number; y: number } | null>(null);
  const isMobile = useIsMobile();
  const { isAuthenticated } = useAuth();
  const hasSynced = useRef(false);
  const navigate = useNavigate();

  const refreshHistory = useCallback(() => {
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    refreshHistory();

    const handleChange = () => refreshHistory();
    window.addEventListener('historyChanged', handleChange);
    window.addEventListener('storage', handleChange);

    return () => {
      window.removeEventListener('historyChanged', handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, [refreshHistory]);

  useEffect(() => {
    if (isAuthenticated && !hasSynced.current) {
      hasSynced.current = true;
      setSyncing(true);
      syncHistoryWithServer()
        .then((changed) => {
          if (changed) {
            refreshHistory();
          }
        })
        .finally(() => setSyncing(false));
    }
  }, [isAuthenticated, refreshHistory]);

  const handleDelete = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    removeFromHistory(address);
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    clearHistory();
    setConfirmClear(false);
  };

  const getChainName = (chainId?: string): string => {
    if (!chainId) return 'Unknown';
    const chain = CHAINS[chainId as ChainId];
    return chain?.name || chainId.charAt(0).toUpperCase() + chainId.slice(1);
  };

  const getChainColor = (chainId?: string): string => {
    return CHAIN_COLORS[chainId || ''] || 'var(--color-text-muted)';
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const pages: PageType[] = ['wallet', 'contract', 'compare', 'sybil', 'polymarket'];
  const currentIndex = pages.indexOf(currentPage);
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < pages.length - 1;

  const filteredHistory = history.filter(item => {
    if (currentPage === 'wallet') return !item.type || item.type === 'wallet';
    if (currentPage === 'contract') return item.type === 'contract';
    if (currentPage === 'compare') return item.type === 'compare';
    if (currentPage === 'sybil') return item.type === 'sybil';
    if (currentPage === 'polymarket') return item.type === 'polymarket';
    return true;
  });

  if (!isAuthenticated) {
    return (
      <motion.div 
        className="page-container page-animate-enter"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="page-header-flat">
          <h1>Scan History</h1>
          <p>Your recent wallet analysis scans</p>
        </div>

        <motion.div 
          className="section-flat"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ textAlign: 'center', padding: isMobile ? '48px 16px' : '80px 32px' }}
        >
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--color-bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <HugeiconsIcon icon={Wallet01Icon} size={28} strokeWidth={1.5} color="var(--color-text-muted)" />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            Connect Your Wallet
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', maxWidth: 360, margin: '0 auto 24px' }}>
            Connect your wallet to view and track your scan history across sessions.
          </p>
          <WalletButton />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="page-container page-animate-enter"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div 
        className="page-header-flat"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1>Scan History</h1>
          <p>
            {history.length} scan{history.length !== 1 ? 's' : ''} recorded
            {syncing && (
              <span style={{ marginLeft: 8, fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                Syncing...
              </span>
            )}
          </p>
        </div>
        <motion.button
          onClick={handleClearAll}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: `1px solid ${confirmClear ? 'var(--color-danger)' : 'var(--color-border)'}`,
            background: confirmClear ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
            color: confirmClear ? 'var(--color-danger)' : 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {confirmClear ? 'Confirm Clear All' : 'Clear All'}
        </motion.button>
      </motion.div>

      {/* Grid View Container */}
      <div className="history-grid-container">
        {/* Sidebar */}
        <motion.div 
          className="grid-sidebar"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="sidebar-icons">
            <motion.button 
              className={`sidebar-icon ${currentPage === 'wallet' ? 'active' : ''}`}
              onClick={() => setCurrentPage('wallet')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title="Wallet"
            >
              <HugeiconsIcon icon={UserIcon} size={20} strokeWidth={2} />
            </motion.button>
            <motion.button 
              className={`sidebar-icon ${currentPage === 'contract' ? 'active' : ''}`}
              onClick={() => setCurrentPage('contract')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title="Contract"
            >
              <HugeiconsIcon icon={File01Icon} size={20} strokeWidth={2} />
            </motion.button>
            <motion.button 
              className={`sidebar-icon ${currentPage === 'compare' ? 'active' : ''}`}
              onClick={() => setCurrentPage('compare')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title="Compare"
            >
              <HugeiconsIcon icon={Exchange01Icon} size={20} strokeWidth={2} />
            </motion.button>
            <motion.button 
              className={`sidebar-icon ${currentPage === 'sybil' ? 'active' : ''}`}
              onClick={() => setCurrentPage('sybil')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title="Sybil"
            >
              <HugeiconsIcon icon={GroupIcon} size={20} strokeWidth={2} />
            </motion.button>
            <motion.button 
              className={`sidebar-icon ${currentPage === 'polymarket' ? 'active' : ''}`}
              onClick={() => setCurrentPage('polymarket')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title="Polymarket"
            >
              <HugeiconsIcon icon={Analytics01Icon} size={20} strokeWidth={2} />
            </motion.button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid-main">
          {/* Navigation Arrows */}
          <div className="grid-nav-arrows">
            <motion.button 
              className={`nav-arrow left ${!canGoBack ? 'disabled' : ''}`}
              onClick={() => setCurrentPage(pages[currentIndex - 1])}
              disabled={!canGoBack}
              whileHover={canGoBack ? { scale: 1.1 } : {}}
              whileTap={canGoBack ? { scale: 0.9 } : {}}
            >
              <HugeiconsIcon icon={ArrowLeftIcon} size={24} strokeWidth={2} />
            </motion.button>
            <motion.button 
              className={`nav-arrow right ${!canGoForward ? 'disabled' : ''}`}
              onClick={() => setCurrentPage(pages[currentIndex + 1])}
              disabled={!canGoForward}
              whileHover={canGoForward ? { scale: 1.1 } : {}}
              whileTap={canGoForward ? { scale: 0.9 } : {}}
            >
              <HugeiconsIcon icon={ArrowRightIcon} size={24} strokeWidth={2} />
            </motion.button>
          </div>

          {/* Page Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              className="history-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Page Header */}
              <div className="history-page-header">
                <h2>{currentPage.charAt(0).toUpperCase() + currentPage.slice(1)} History</h2>
                <p>{filteredHistory.length} item{filteredHistory.length !== 1 ? 's' : ''}</p>
              </div>

              {/* History List */}
              {filteredHistory.length === 0 ? (
                <div className="empty-history">
                  <HugeiconsIcon icon={Clock01Icon} size={48} strokeWidth={1.5} />
                  <p>No {currentPage} history yet</p>
                </div>
              ) : (
                <div className="history-list">
                  <AnimatePresence>
                    {filteredHistory.map((item, index) => {
                      const label = getLabel(item.address);
                      const hasSummary = item.riskScore !== undefined;

                      return (
                        <motion.div
                          key={`${item.address}-${item.timestamp}`}
                          className="history-item"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => onSelectScan(item.address, item.chain || 'ethereum', item.type)}
                          whileHover={{ backgroundColor: 'var(--color-bg-hover)' }}
                          onMouseEnter={(e) => setHoveredAddress({ address: item.address, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setHoveredAddress(null)}
                        >
                          <div className="history-item-chain">
                            <div style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: getChainColor(item.chain),
                              boxShadow: `0 0 8px ${getChainColor(item.chain)}40`,
                            }} />
                          </div>
                          <div className="history-item-content">
                            <div className="history-item-title">
                              {label || (isMobile 
                                ? `${item.address.slice(0, 8)}...${item.address.slice(-6)}`
                                : item.type === 'compare'
                                  ? `${item.address.split(',').length} wallets`
                                  : item.address
                              )}
                            </div>
                            <div className="history-item-subtitle">
                              <span>{getChainName(item.chain)}</span>
                              <span style={{ opacity: 0.4 }}>•</span>
                              <span>{formatRelativeTime(item.timestamp)}</span>
                            </div>
                            {hasSummary && (
                              <div className="history-item-stats">
                                <span>TXs: {item.totalTransactions?.toLocaleString() ?? '--'}</span>
                                <span>Sent: {formatEth(item.totalValueSentEth)} ETH</span>
                                <span>Recv: {formatEth(item.totalValueReceivedEth)} ETH</span>
                              </div>
                            )}
                          </div>
                          <div className="history-item-meta">
                            {hasSummary && item.riskLevel && (
                              <span className={`risk-badge ${item.riskLevel}`}>
                                {item.riskLevel}
                              </span>
                            )}
                            <motion.button
                              whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => handleDelete(e, item.address)}
                              className="delete-btn"
                            >
                              <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Hover Tooltip */}
          <AnimatePresence>
            {hoveredAddress && (
              <motion.div
                className="hover-tooltip"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  position: 'fixed',
                  left: hoveredAddress.x + 10,
                  top: hoveredAddress.y + 10,
                  zIndex: 1000,
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-surface-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  maxWidth: 300,
                }}
              >
                <div style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: 'var(--text-xs)', 
                  marginBottom: 'var(--space-2)',
                  wordBreak: 'break-all' 
                }}>
                  {hoveredAddress.address}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <a
                    href={`https://defigrascan.com/address/${hoveredAddress.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                      padding: 'var(--space-1) var(--space-2)',
                      background: 'var(--color-primary)',
                      color: 'var(--color-primary-text)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-xs)',
                      textDecoration: 'none',
                    }}
                  >
                    <HugeiconsIcon icon={EyeIcon} size={12} strokeWidth={2} />
                    View
                  </a>
                  <button
                    onClick={() => navigate(`/app-evm?address=${hoveredAddress.address}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                      padding: 'var(--space-1) var(--space-2)',
                      background: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-primary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-xs)',
                      border: '1px solid var(--color-surface-border)',
                      cursor: 'pointer',
                    }}
                  >
                    <HugeiconsIcon icon={Search01Icon} size={12} strokeWidth={2} />
                    Scan
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <style>{`
          .history-grid-container {
            display: flex;
            height: calc(100vh - 250px);
            min-height: 500px;
            gap: var(--space-4);
            padding: var(--space-4);
          }

          .grid-sidebar {
            width: 60px;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: var(--space-3) var(--space-2);
            background: var(--color-bg-secondary);
            border-radius: var(--radius-lg);
            border: 1px solid var(--color-surface-border);
          }

          .sidebar-icons {
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
          }

          .sidebar-icon {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            border-radius: var(--radius-md);
            color: var(--color-text-muted);
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .sidebar-icon:hover,
          .sidebar-icon.active {
            background: var(--color-primary);
            color: var(--color-primary-text);
          }

          .grid-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
          }

          .grid-nav-arrows {
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            transform: translateY(-50%);
            display: flex;
            justify-content: space-between;
            z-index: 10;
            pointer-events: none;
          }

          .nav-arrow {
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--color-bg-elevated);
            border: 1px solid var(--color-surface-border);
            border-radius: 50%;
            color: var(--color-text-primary);
            cursor: pointer;
            pointer-events: auto;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }

          .nav-arrow:hover:not(.disabled) {
            background: var(--color-primary);
            color: var(--color-primary-text);
          }

          .nav-arrow.disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }

          .nav-arrow.left { margin-left: -22px; }
          .nav-arrow.right { margin-right: -22px; }

          .history-content {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          .history-page-header {
            margin-bottom: var(--space-4);
            padding-bottom: var(--space-3);
            border-bottom: 1px solid var(--color-surface-border);
          }

          .history-page-header h2 {
            font-size: var(--text-lg);
            font-weight: 600;
            color: var(--color-text-primary);
            margin: 0 0 var(--space-1) 0;
          }

          .history-page-header p {
            font-size: var(--text-sm);
            color: var(--color-text-muted);
            margin: 0;
          }

          .empty-history {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            color: var(--color-text-muted);
            gap: var(--space-4);
          }

          .history-list {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
          }

          .history-item {
            display: flex;
            align-items: flex-start;
            gap: var(--space-3);
            padding: var(--space-3) var(--space-4);
            background: var(--color-bg-secondary);
            border: 1px solid var(--color-surface-border);
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .history-item:hover {
            background: var(--color-bg-hover);
          }

          .history-item-chain {
            padding-top: var(--space-1);
          }

          .history-item-content {
            flex: 1;
            min-width: 0;
          }

          .history-item-title {
            font-family: var(--font-mono);
            font-size: var(--text-sm);
            font-weight: 500;
            color: var(--color-text-primary);
            word-break: break-all;
          }

          .history-item-subtitle {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            font-size: var(--text-xs);
            color: var(--color-text-muted);
            margin-top: var(--space-1);
          }

          .history-item-stats {
            display: flex;
            gap: var(--space-4);
            margin-top: var(--space-2);
            font-size: var(--text-xs);
            color: var(--color-text-muted);
          }

          .history-item-meta {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            flex-shrink: 0;
          }

          .risk-badge {
            padding: var(--space-1) var(--space-2);
            border-radius: var(--radius-sm);
            font-size: var(--text-xs);
            font-weight: 600;
            text-transform: uppercase;
          }

          .risk-badge.critical, .risk-badge.high {
            background: var(--color-danger-bg);
            color: var(--color-danger-text);
          }

          .risk-badge.medium {
            background: var(--color-warning-bg);
            color: var(--color-warning-text);
          }

          .risk-badge.low {
            background: var(--color-success-bg);
            color: var(--color-success-text);
          }

          .delete-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 8;
            color: var(--color-text-muted);
            background: transparent;
            border: none;
            cursor: pointer;
          }

          @media (max-width: 768px) {
            .history-grid-container {
              flex-direction: column;
              height: auto;
            }
            .grid-sidebar {
              width: 100%;
              flex-direction: row;
              justify-content: center;
            }
            .sidebar-icons {
              flex-direction: row;
            }
            .grid-nav-arrows {
              display: none;
            }
          }
        `}</style>
      </div>
    </motion.div>
  );
};

export default HistoryPage;
