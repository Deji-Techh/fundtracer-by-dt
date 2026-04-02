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
import { ChainId, CHAINS } from '@fundtracer/core';
import { useIsMobile } from '../hooks/useIsMobile';
import { getChainTokenSymbol } from '../config/chains';

interface SybilGridViewProps {
  chain?: ChainId;
}

type PageType = 'analyze' | 'clusters' | 'analysis';

export default function SybilGridView({ chain = 'linea' }: SybilGridViewProps) {
  const [currentPage, setCurrentPage] = useState<PageType>('analyze');
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
              <SybilDetector />
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
        }
      `}</style>
    </div>
  );
}
