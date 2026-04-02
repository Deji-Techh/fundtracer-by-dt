import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { useNavigate } from 'react-router-dom';
import '../global.css';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  UserIcon,
  Wallet01Icon,
  Exchange01Icon,
  Analytics01Icon,
  EyeIcon,
  Search01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons';
import { analyzeCEXFlow, type CEXFlowResult } from '../api';
import { ChainId, CHAINS } from '@fundtracer/core';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNotify } from '../contexts/ToastContext';
import { getChainTokenSymbol } from '../config/chains';

interface CEXFlowViewProps {
  chain?: ChainId;
  initialAddress?: string;
}

type PageType = 'overview' | 'connected' | 'graph';

const CEX_COLORS: Record<string, string> = {
  'Binance': '#f0b90b',
  'Coinbase': '#0052ff',
  'Kraken': '#5741d9',
  'Bybit': '#ff9c00',
  'OKX': '#000000',
  'KuCoin': '#23af91',
  'Bitget': '#cad500',
  'Gate.io': '#1f8cf0',
};

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatValue(value: number, symbol: string): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M ${symbol}`;
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K ${symbol}`;
  return `${value.toFixed(4)} ${symbol}`;
}

export default function CEXFlowView({ chain = 'ethereum', initialAddress }: CEXFlowViewProps) {
  const [currentPage, setCurrentPage] = useState<PageType>('overview');
  const [address, setAddress] = useState(initialAddress || '');
  const [result, setResult] = useState<CEXFlowResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredAddress, setHoveredAddress] = useState<{ address: string; x: number; y: number } | null>(null);
  const [selectedCEX, setSelectedCEX] = useState<string | null>(null);
  
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const notify = useNotify();
  
  const chainConfig = CHAINS[chain] || { explorer: 'https://etherscan.io' };
  const tokenSymbol = getChainTokenSymbol(chain);

  const handleAnalyze = async () => {
    if (!address.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await analyzeCEXFlow(address.trim(), chain);
      if (response.success && response.result) {
        setResult(response.result);
        setCurrentPage('overview');
      } else {
        setError(response.error || 'Failed to analyze CEX flow');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  };

  const pages: PageType[] = ['overview', 'connected', 'graph'];
  const currentIndex = pages.indexOf(currentPage);
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < pages.length - 1;

  // Auto-analyze if initial address provided
  useEffect(() => {
    if (initialAddress && !result) {
      setAddress(initialAddress);
      handleAnalyze();
    }
  }, [initialAddress]);

  return (
    <div className="wallet-grid-container">
      {/* Collapsed Sidebar */}
      <motion.div 
        className="grid-sidebar"
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="sidebar-icons">
          <motion.button 
            className={`sidebar-icon ${currentPage === 'overview' ? 'active' : ''}`}
            onClick={() => setCurrentPage('overview')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Overview"
          >
            <HugeiconsIcon icon={Analytics01Icon} size={20} strokeWidth={2} />
          </motion.button>
          <motion.button 
            className={`sidebar-icon ${currentPage === 'connected' ? 'active' : ''}`}
            onClick={() => setCurrentPage('connected')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Connected Wallets"
            disabled={!result}
          >
            <HugeiconsIcon icon={UserIcon} size={20} strokeWidth={2} />
          </motion.button>
          <motion.button 
            className={`sidebar-icon ${currentPage === 'graph' ? 'active' : ''}`}
            onClick={() => setCurrentPage('graph')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Graph"
            disabled={!result}
          >
            <HugeiconsIcon icon={Exchange01Icon} size={20} strokeWidth={2} />
          </motion.button>
        </div>
      </motion.div>

      {/* Main Content Area */}
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

        {/* Search Input - Always Visible */}
        <div className="cex-search-section">
          <div className="search-input-wrapper">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter wallet address to analyze CEX flow..."
              className="cex-search-input"
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <button 
              className="cex-search-btn"
              onClick={handleAnalyze}
              disabled={loading || !address.trim()}
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          {error && <div className="cex-error">{error}</div>}
        </div>

        {/* Page Content */}
        <AnimatePresence mode="wait">
          {currentPage === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="cex-overview-page"
            >
              {!result ? (
                <div className="empty-state">
                  <HugeiconsIcon icon={Wallet01Icon} size={48} strokeWidth={1.5} />
                  <h3>CEX Flow Analysis</h3>
                  <p>Enter a wallet address to see all CEX interactions and connected wallets</p>
                </div>
              ) : (
                <div className="cex-results">
                  {/* Stats Cards */}
                  <div className="cex-stats-grid">
                    <div className="stat-card">
                      <span className="stat-label">Total Interactors</span>
                      <span className="stat-value">{result.stats.totalInteractors}</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">CEX Deposits</span>
                      <span className="stat-value">{result.stats.uniqueCEX}</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">Total Volume</span>
                      <span className="stat-value">{formatValue(result.stats.totalVolume, tokenSymbol)}</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">CEX Volume</span>
                      <span className="stat-value">{formatValue(result.stats.cexVolume, tokenSymbol)}</span>
                    </div>
                  </div>

                  {/* Connected CEX */}
                  {result.connectedCEX.length > 0 && (
                    <div className="cex-section">
                      <h3>Connected CEX Wallets</h3>
                      <div className="cex-list">
                        {result.connectedCEX.map((cex, i) => (
                          <motion.div
                            key={i}
                            className="cex-item"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            style={{ borderLeftColor: CEX_COLORS[cex.cexName] || '#666' }}
                          >
                            <div className="cex-info">
                              <span className="cex-name" style={{ color: CEX_COLORS[cex.cexName] }}>
                                {cex.cexName}
                              </span>
                              <span className="cex-type">{cex.type}</span>
                            </div>
                            <div className="cex-address">
                              {formatAddress(cex.address)}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detected CEX */}
                  {result.detectedCEX.length > 0 && (
                    <div className="cex-section">
                      <h3>Auto-Detected CEX Patterns</h3>
                      <div className="cex-list detected">
                        {result.detectedCEX.map((cex, i) => (
                          <motion.div
                            key={i}
                            className="cex-item detected"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <div className="cex-info">
                              <span className="cex-name">{formatAddress(cex.address)}</span>
                              <span className="cex-score">{cex.score}% confidence</span>
                            </div>
                            <div className="cex-signals">
                              {cex.signals.map((signal, j) => (
                                <span key={j} className="signal-tag">{signal}</span>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Connected Wallets */}
                  {result.connectedWallets.length > 0 && (
                    <div className="cex-section">
                      <h3>Recent Interactions</h3>
                      <div className="wallet-list">
                        {result.connectedWallets.slice(0, 10).map((wallet, i) => (
                          <motion.div
                            key={i}
                            className="wallet-item"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onMouseEnter={(e) => setHoveredAddress({ address: wallet.address, x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setHoveredAddress(null)}
                          >
                            <div className="wallet-info">
                              <span className="wallet-address">{formatAddress(wallet.address)}</span>
                              {wallet.isCEX && (
                                <span className="wallet-cex-badge" style={{ background: CEX_COLORS[wallet.cexName || ''] }}>
                                  {wallet.cexName}
                                </span>
                              )}
                            </div>
                            <div className="wallet-stats">
                              <span>{wallet.txCount} txs</span>
                              <span>{formatValue(wallet.totalSent, tokenSymbol)}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {currentPage === 'connected' && (
            <motion.div
              key="connected"
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ duration: 0.3 }}
              className="cex-connected-page"
            >
              <div className="page-header">
                <h2>Connected Wallets</h2>
                <p>Wallets that sent to the same CEX as this wallet</p>
              </div>
              
              {!result ? (
                <div className="empty-state">
                  <p>Analyze a wallet first to see connected wallets</p>
                </div>
              ) : result.connectedWallets.length === 0 ? (
                <div className="empty-state">
                  <p>No connected wallets found</p>
                </div>
              ) : (
                <div className="wallet-list full">
                  {result.connectedWallets
                    .sort((a, b) => b.totalSent - a.totalSent)
                    .map((wallet, i) => (
                      <motion.div
                        key={i}
                        className="wallet-item detailed"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onMouseEnter={(e) => setHoveredAddress({ address: wallet.address, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setHoveredAddress(null)}
                      >
                        <div className="wallet-main">
                          <span className="wallet-address">{wallet.address}</span>
                          {wallet.isCEX && (
                            <span className="wallet-cex-badge" style={{ background: CEX_COLORS[wallet.cexName || ''] }}>
                              {wallet.cexName}
                            </span>
                          )}
                        </div>
                        <div className="wallet-details">
                          <div className="detail-item">
                            <span className="detail-label">Total Sent</span>
                            <span className="detail-value">{formatValue(wallet.totalSent, tokenSymbol)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Transactions</span>
                            <span className="detail-value">{wallet.txCount}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">First Activity</span>
                            <span className="detail-value">{new Date(wallet.firstTx * 1000).toLocaleDateString()}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Last Activity</span>
                            <span className="detail-value">{new Date(wallet.lastTx * 1000).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}
            </motion.div>
          )}

          {currentPage === 'graph' && (
            <motion.div
              key="graph"
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ duration: 0.3 }}
              className="cex-graph-page"
            >
              <div className="page-header">
                <h2>CEX Flow Graph</h2>
                <p>Visual representation of CEX connections</p>
              </div>
              
              {!result ? (
                <div className="empty-state">
                  <p>Analyze a wallet first to see the graph</p>
                </div>
              ) : (
                <div className="graph-placeholder">
                  <HugeiconsIcon icon={Exchange01Icon} size={64} strokeWidth={1.5} />
                  <h3>Graph Visualization</h3>
                  <p>This would show an interactive D3 graph of:</p>
                  <ul>
                    <li>Target wallet (center)</li>
                    <li>CEX wallets (colored nodes)</li>
                    <li>Connected wallets (grouped by CEX)</li>
                    <li>Transfer directions and amounts</li>
                  </ul>
                  <p className="note">Integration with Bubblez dev's graph coming soon</p>
                </div>
              )}
            </motion.div>
          )}
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
                  href={`${chainConfig.explorer}/address/${hoveredAddress.address}`}
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
                  onClick={() => navigate(`/app-evm?address=${hoveredAddress.address}&chain=${chain}`)}
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
        .wallet-grid-container {
          display: flex;
          height: 100%;
          min-height: 600px;
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

        .sidebar-icon:hover:not(:disabled),
        .sidebar-icon.active {
          background: var(--color-primary);
          color: var(--color-primary-text);
        }

        .sidebar-icon:disabled {
          opacity: 0.3;
          cursor: not-allowed;
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

        .cex-search-section {
          margin-bottom: var(--space-4);
        }

        .search-input-wrapper {
          display: flex;
          gap: var(--space-2);
        }

        .cex-search-input {
          flex: 1;
          padding: var(--space-3) var(--space-4);
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-surface-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          font-size: var(--text-sm);
        }

        .cex-search-input:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .cex-search-btn {
          padding: var(--space-3) var(--space-6);
          background: var(--color-primary);
          color: var(--color-primary-text);
          border: none;
          border-radius: var(--radius-md);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cex-search-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cex-error {
          margin-top: var(--space-2);
          padding: var(--space-2) var(--space-3);
          background: rgba(239, 68, 68, 0.1);
          border-radius: var(--radius-sm);
          color: var(--color-danger-text);
          font-size: var(--text-sm);
        }

        .cex-overview-page,
        .cex-connected-page,
        .cex-graph-page {
          flex: 1;
          overflow: auto;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--color-text-muted);
          gap: var(--space-4);
          text-align: center;
        }

        .empty-state h3 {
          margin: 0;
          color: var(--color-text-primary);
        }

        .empty-state p {
          margin: 0;
          font-size: var(--text-sm);
          max-width: 300px;
        }

        .cex-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        .stat-card {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-surface-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          margin-bottom: var(--space-1);
        }

        .stat-value {
          display: block;
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .cex-section {
          margin-bottom: var(--space-6);
        }

        .cex-section h3 {
          font-size: var(--text-lg);
          margin: 0 0 var(--space-3) 0;
        }

        .cex-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .cex-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-3) var(--space-4);
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-surface-border);
          border-left: 3px solid;
          border-radius: var(--radius-md);
        }

        .cex-info {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .cex-name {
          font-weight: 600;
        }

        .cex-type {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          text-transform: uppercase;
        }

        .cex-address {
          font-family: var(--font-mono);
          font-size: var(--text-sm);
        }

        .cex-score {
          font-size: var(--text-xs);
          color: var(--color-warning-text);
        }

        .cex-signals {
          display: flex;
          gap: var(--space-1);
          flex-wrap: wrap;
        }

        .signal-tag {
          padding: 2px 6px;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-sm);
          font-size: 10px;
          color: var(--color-text-muted);
        }

        .wallet-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .wallet-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-3) var(--space-4);
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-surface-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .wallet-item:hover {
          background: var(--color-bg-hover);
        }

        .wallet-item.detailed {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--space-3);
        }

        .wallet-info {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .wallet-address {
          font-family: var(--font-mono);
          font-size: var(--text-sm);
        }

        .wallet-cex-badge {
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 10px;
          font-weight: 600;
          color: white;
        }

        .wallet-stats {
          display: flex;
          gap: var(--space-4);
          font-size: var(--text-sm);
          color: var(--color-text-muted);
        }

        .wallet-main {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .wallet-details {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-4);
          width: 100%;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .detail-label {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
        }

        .detail-value {
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .page-header {
          margin-bottom: var(--space-4);
        }

        .page-header h2 {
          font-size: var(--text-xl);
          font-weight: 600;
          margin: 0 0 var(--space-1) 0;
        }

        .page-header p {
          font-size: var(--text-sm);
          color: var(--color-text-muted);
          margin: 0;
        }

        .graph-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: var(--space-4);
          color: var(--color-text-muted);
          text-align: center;
        }

        .graph-placeholder ul {
          text-align: left;
          font-size: var(--text-sm);
        }

        .graph-placeholder .note {
          font-size: var(--text-xs);
          color: var(--color-warning-text);
        }

        @media (max-width: 768px) {
          .wallet-grid-container {
            flex-direction: column;
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
          .cex-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .wallet-details {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
