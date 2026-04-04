import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { useNavigate } from 'react-router-dom';
import '../global.css';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  UserIcon,
  GroupIcon,
  Analytics01Icon,
  Shield01Icon,
  EyeIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import SybilDetector from './SybilDetector';
import { ChainId, CHAINS, SybilCluster } from '@fundtracer/core';
import { useIsMobile } from '../hooks/useIsMobile';
import { getChainTokenSymbol } from '../config/chains';

interface SybilGridViewProps {
  chain?: ChainId;
}

type PageType = 'analyze' | 'clusters' | 'analysis';

interface SybilResult {
  clusters: SybilCluster[];
  totalAnalyzed: number;
  flaggedCount: number;
}

export default function SybilGridView({ chain = 'linea' }: SybilGridViewProps) {
  const [currentPage, setCurrentPage] = useState<PageType>('analyze');
  const [sybilResult, setSybilResult] = useState<SybilResult | null>(null);
  const [hoveredAddress, setHoveredAddress] = useState<{ address: string; x: number; y: number } | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const chainConfig = CHAINS[chain] || { explorer: 'https://etherscan.io' };
  const tokenSymbol = getChainTokenSymbol(chain);

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const pages: PageType[] = ['analyze', 'clusters', 'analysis'];
  const currentIndex = pages.indexOf(currentPage);
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < pages.length - 1;

  const handleAnalysisComplete = (result: { clusters: SybilCluster[]; totalAnalyzed: number; flaggedCount: number }) => {
    setSybilResult(result);
    localStorage.setItem('sybil_last_result', JSON.stringify(result));
    setCurrentPage('clusters');
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('sybil_last_result');
    if (saved) {
      try {
        setSybilResult(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved sybil result', e);
      }
    }
  }, []);

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
            className={`sidebar-icon ${currentPage === 'analyze' ? 'active' : ''}`}
            onClick={() => setCurrentPage('analyze')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Analyze"
          >
            <HugeiconsIcon icon={Analytics01Icon} size={20} strokeWidth={2} />
          </motion.button>
          <motion.button 
            className={`sidebar-icon ${currentPage === 'clusters' ? 'active' : ''}`}
            onClick={() => setCurrentPage('clusters')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Clusters"
          >
            <HugeiconsIcon icon={GroupIcon} size={20} strokeWidth={2} />
          </motion.button>
          <motion.button 
            className={`sidebar-icon ${currentPage === 'analysis' ? 'active' : ''}`}
            onClick={() => setCurrentPage('analysis')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Analysis"
          >
            <HugeiconsIcon icon={Shield01Icon} size={20} strokeWidth={2} />
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

        {/* Page Content */}
        <AnimatePresence mode="wait">
          {currentPage === 'analyze' && (
            <motion.div
              key="analyze"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="sybil-analyze-page"
            >
              <SybilDetector onAnalysisComplete={handleAnalysisComplete} />
            </motion.div>
          )}

          {currentPage === 'clusters' && (
            <motion.div
              key="clusters"
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ duration: 0.3 }}
              className="sybil-clusters-page"
            >
              <div className="page-header">
                <h2>Sybil Clusters</h2>
                <p>View detected Sybil clusters from your analysis</p>
              </div>
              
              {!sybilResult ? (
                <div className="empty-state">
                  <HugeiconsIcon icon={GroupIcon} size={48} strokeWidth={1.5} />
                  <p>Run a Sybil analysis to see clusters</p>
                  <button 
                    className="btn-primary"
                    onClick={() => setCurrentPage('analyze')}
                  >
                    Go to Analysis
                  </button>
                </div>
              ) : sybilResult.clusters.length === 0 ? (
                <div className="empty-state">
                  <HugeiconsIcon icon={GroupIcon} size={48} strokeWidth={1.5} />
                  <p>No sybil clusters detected</p>
                  <button 
                    className="btn-primary"
                    onClick={() => setCurrentPage('analyze')}
                  >
                    Run New Analysis
                  </button>
                </div>
              ) : (
                <div className="clusters-list">
                  {sybilResult.clusters.map((cluster, i) => (
                    <motion.div
                      key={i}
                      className="cluster-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="cluster-header">
                        <span className="cluster-id">Cluster #{i + 1}</span>
                        <span className={`cluster-score ${cluster.sybilScore >= 80 ? 'critical' : cluster.sybilScore >= 60 ? 'high' : cluster.sybilScore >= 40 ? 'medium' : 'low'}`}>
                          {cluster.sybilScore}% score
                        </span>
                      </div>
                      <div className="cluster-info">
                        <span className="cluster-wallets">{Array.isArray(cluster.wallets) ? cluster.wallets.length : 0} wallets</span>
                        <span className="cluster-common">{cluster.fundingSourceLabel || cluster.fundingSource || 'No common funding'}</span>
                      </div>
                      <div className="cluster-wallets-list">
                        {(Array.isArray(cluster.wallets) ? cluster.wallets.slice(0, 5) : []).map((wallet, j) => (
                          <span 
                            key={j} 
                            className="wallet-tag"
                            onMouseEnter={(e) => setHoveredAddress({ address: wallet.address || wallet, x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setHoveredAddress(null)}
                          >
                            {formatAddress(wallet.address || wallet)}
                          </span>
                        ))}
                        {Array.isArray(cluster.wallets) && cluster.wallets.length > 5 && (
                          <span className="wallet-tag more">+{cluster.wallets.length - 5} more</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {currentPage === 'analysis' && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ duration: 0.3 }}
              className="sybil-analysis-page"
            >
              <div className="page-header">
                <h2>Detailed Analysis</h2>
                <p>Deep dive into Sybil patterns and findings</p>
              </div>
              
              {!sybilResult ? (
                <div className="empty-state">
                  <HugeiconsIcon icon={Shield01Icon} size={48} strokeWidth={1.5} />
                  <p>Complete a Sybil analysis to view detailed findings</p>
                  <button 
                    className="btn-primary"
                    onClick={() => setCurrentPage('analyze')}
                  >
                    Go to Analysis
                  </button>
                </div>
              ) : (
                <div className="analysis-stats">
                  <div className="stat-card">
                    <span className="stat-label">Total Analyzed</span>
                    <span className="stat-value">{sybilResult.totalAnalyzed}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Clusters Found</span>
                    <span className="stat-value">{sybilResult.clusters.length}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Flagged Wallets</span>
                    <span className="stat-value">{sybilResult.flaggedCount}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Clean Wallets</span>
                    <span className="stat-value">{sybilResult.totalAnalyzed - sybilResult.flaggedCount}</span>
                  </div>
                  
                  {sybilResult.clusters.length > 0 && (
                    <div className="analysis-details">
                      <h3>Top Risk Clusters</h3>
                      {sybilResult.clusters
                        .sort((a, b) => b.sybilScore - a.sybilScore)
                        .slice(0, 5)
                        .map((cluster, i) => (
                          <div key={i} className="risk-item">
                            <span className="risk-rank">#{i + 1}</span>
                            <span className="risk-wallets">{Array.isArray(cluster.wallets) ? cluster.wallets.length : 0} wallets</span>
                            <span className={`risk-score ${cluster.sybilScore >= 80 ? 'critical' : cluster.sybilScore >= 60 ? 'high' : 'medium'}`}>
                              {cluster.sybilScore}%
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
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

        .sybil-analyze-page,
        .sybil-clusters-page,
        .sybil-analysis-page {
          flex: 1;
          overflow: auto;
        }

        .page-header {
          margin-bottom: var(--space-6);
        }

        .page-header h2 {
          font-size: var(--text-xl);
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 var(--space-2) 0;
        }

        .page-header p {
          color: var(--color-text-muted);
          margin: 0;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-12);
          color: var(--color-text-muted);
          gap: var(--space-4);
          text-align: center;
        }

        .empty-state p {
          font-size: var(--text-sm);
          max-width: 300px;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          background: var(--color-primary);
          color: var(--color-primary-text);
          border: none;
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .clusters-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .cluster-card {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-surface-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
        }

        .cluster-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-3);
        }

        .cluster-id {
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .cluster-score {
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .cluster-score.critical {
          background: var(--color-danger-bg);
          color: var(--color-danger-text);
        }

        .cluster-score.high {
          background: rgba(234, 88, 12, 0.15);
          color: #ea580c;
        }

        .cluster-score.medium {
          background: var(--color-warning-bg);
          color: var(--color-warning-text);
        }

        .cluster-score.low {
          background: var(--color-success-bg);
          color: var(--color-success-text);
        }

        .cluster-info {
          display: flex;
          gap: var(--space-4);
          font-size: var(--text-sm);
          color: var(--color-text-muted);
          margin-bottom: var(--space-3);
        }

        .cluster-wallets-list {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }

        .wallet-tag {
          padding: var(--space-1) var(--space-2);
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-family: var(--font-mono);
          cursor: pointer;
        }

        .wallet-tag:hover {
          background: var(--color-bg-elevated);
        }

        .wallet-tag.more {
          color: var(--color-text-muted);
        }

        .analysis-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-4);
        }

        .stat-card {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-surface-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .stat-label {
          font-size: var(--text-sm);
          color: var(--color-text-muted);
        }

        .stat-value {
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .analysis-details {
          grid-column: span 2;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-surface-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
        }

        .analysis-details h3 {
          margin: 0 0 var(--space-4) 0;
          font-size: var(--text-lg);
        }

        .risk-item {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-2) 0;
          border-bottom: 1px solid var(--color-surface-border);
        }

        .risk-rank {
          font-weight: 600;
          color: var(--color-text-muted);
          width: 40px;
        }

        .risk-wallets {
          flex: 1;
          color: var(--color-text-muted);
        }

        .risk-score {
          font-weight: 700;
          font-family: var(--font-mono);
        }

        .risk-score.critical { color: var(--color-danger-text); }
        .risk-score.high { color: #ea580c; }
        .risk-score.medium { color: var(--color-warning-text); }

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
          .analysis-stats {
            grid-template-columns: 1fr;
          }
          .analysis-details {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}
