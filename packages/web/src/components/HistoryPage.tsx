import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Clock01Icon,
  Delete01Icon,
  Wallet01Icon,
  Cancel01Icon,
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

function getTypeLabel(type?: string): { label: string; color: string; bg: string } {
  switch (type) {
    case 'contract': return { label: 'Contract', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' };
    case 'compare': return { label: 'Compare', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
    case 'sybil': return { label: 'Sybil', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.12)' };
    default: return { label: 'Wallet', color: 'var(--color-text-muted)', bg: 'var(--color-bg-elevated)' };
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
  const [confirmClear, setConfirmClear] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const isMobile = useIsMobile();
  const { isAuthenticated } = useAuth();
  const hasSynced = useRef(false);

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

  if (history.length === 0) {
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
            <HugeiconsIcon icon={Clock01Icon} size={28} strokeWidth={1.5} color="var(--color-text-muted)" />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            No scan history yet
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', maxWidth: 360, margin: '0 auto' }}>
            Analyze a wallet address on the Sybil tab to start building your scan history.
          </p>
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

      <div className="card-list-flat">
        <AnimatePresence>
          {history.map((item, index) => {
            const label = getLabel(item.address);
            const hasSummary = item.riskScore !== undefined;
            const typeInfo = getTypeLabel(item.type);

            return (
              <motion.div
                key={`${item.address}-${item.timestamp}`}
                className="card-list-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => onSelectScan(item.address, item.chain || 'ethereum', item.type)}
                whileHover={{ backgroundColor: 'var(--color-bg-hover)' }}
              >
                <div className="card-list-item-icon">
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: getChainColor(item.chain),
                    boxShadow: `0 0 8px ${getChainColor(item.chain)}40`,
                  }} />
                </div>

                <div className="card-list-item-content">
                  <div className="card-list-item-title">
                    {label || (isMobile 
                      ? `${item.address.slice(0, 8)}...${item.address.slice(-6)}`
                      : item.type === 'compare'
                        ? `${item.address.split(',').length} wallets`
                        : item.address
                    )}
                  </div>
                  <div className="card-list-item-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>{getChainName(item.chain)}</span>
                    <span style={{ opacity: 0.4 }}>•</span>
                    <span>{formatRelativeTime(item.timestamp)}</span>
                    {item.type && item.type !== 'wallet' && (
                      <>
                        <span style={{ opacity: 0.4 }}>•</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: typeInfo.bg,
                          color: typeInfo.color,
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                        }}>
                          {typeInfo.label}
                        </span>
                      </>
                    )}
                  </div>

                  {hasSummary && (
                    <div style={{
                      display: 'flex',
                      gap: isMobile ? 12 : 24,
                      marginTop: 12,
                      flexWrap: 'wrap',
                    }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>TXs: </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {item.totalTransactions?.toLocaleString() ?? '--'}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Sent: </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {formatEth(item.totalValueSentEth)} ETH
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Recv: </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {formatEth(item.totalValueReceivedEth)} ETH
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="card-list-item-meta">
                  {hasSummary && item.riskLevel && (
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      background: getRiskBg(item.riskLevel),
                      color: getRiskColor(item.riskLevel),
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}>
                      {item.riskLevel} {item.riskScore !== undefined ? `(${item.riskScore})` : ''}
                    </span>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleDelete(e, item.address)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      color: 'var(--color-text-muted)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default HistoryPage;