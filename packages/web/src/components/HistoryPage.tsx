import React, { useState, useEffect, useCallback } from 'react';
import { HistoryItem, getHistory, removeFromHistory, clearHistory } from '../utils/history';
import { getLabel } from '../utils/addressBook';
import { CHAINS, ChainId } from '@fundtracer/core';
import { useIsMobile } from '../hooks/useIsMobile';

interface HistoryPageProps {
  onSelectScan: (address: string, chain: string) => void;
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
    case 'low': return 'var(--color-success-text)';
    case 'medium': return 'var(--color-warning-text)';
    case 'high': return 'var(--color-danger-text)';
    case 'critical': return '#ff4444';
    default: return 'var(--color-text-muted)';
  }
}

function getRiskBg(level?: string): string {
  if (!level) return 'var(--color-bg-elevated)';
  switch (level.toLowerCase()) {
    case 'low': return 'var(--color-success-bg)';
    case 'medium': return 'var(--color-warning-bg)';
    case 'high': return 'var(--color-danger-bg)';
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
  const [confirmClear, setConfirmClear] = useState(false);
  const isMobile = useIsMobile();

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

  const handleDelete = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    removeFromHistory(address);
    // State updates via historyChanged event
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

  // Empty state
  if (history.length === 0) {
    return (
      <div style={{ padding: isMobile ? 16 : 24, maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: isMobile ? 20 : 32, marginTop: isMobile ? 8 : 16 }}>
          <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            Scan History
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
            Your recent wallet analysis scans
          </p>
        </div>

        <div style={{
          textAlign: 'center',
          padding: isMobile ? '48px 24px' : '80px 48px',
          background: 'var(--color-bg-tertiary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-surface-border)',
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--color-bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 24,
            color: 'var(--color-text-muted)',
          }}>
            {/* Clock icon as text */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            No scan history yet
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', maxWidth: 360, margin: '0 auto' }}>
            Analyze a wallet address on the Sybil tab to start building your scan history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 24, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 12 : 0,
        marginBottom: isMobile ? 20 : 32,
        marginTop: isMobile ? 8 : 16,
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Scan History
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: isMobile ? '0.8125rem' : '0.9375rem' }}>
            {history.length} scan{history.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <button
          onClick={handleClearAll}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${confirmClear ? 'var(--color-danger-text)' : 'var(--color-surface-border)'}`,
            background: confirmClear ? 'var(--color-danger-bg)' : 'transparent',
            color: confirmClear ? 'var(--color-danger-text)' : 'var(--color-text-secondary)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap' as const,
          }}
        >
          {confirmClear ? 'Confirm Clear All' : 'Clear All'}
        </button>
      </div>

      {/* History List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
        {history.map((item) => {
          const label = getLabel(item.address);
          const hasSummary = item.riskScore !== undefined;

          return (
            <div
              key={`${item.address}-${item.timestamp}`}
              onClick={() => onSelectScan(item.address, item.chain || 'ethereum')}
              className="animate-fade-in"
              style={{
                padding: isMobile ? 14 : 18,
                background: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-surface-border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent-highlight)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-surface-border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Top Row: Address + Risk + Delete */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: hasSummary ? 12 : 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  {/* Chain Indicator Dot */}
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: getChainColor(item.chain),
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${getChainColor(item.chain)}40`,
                  }} />

                  {/* Address + Label */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {label && (
                        <span style={{
                          fontWeight: 600,
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-text-primary)',
                        }}>
                          {label}
                        </span>
                      )}
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: label ? 'var(--text-xs)' : 'var(--text-sm)',
                        color: label ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' as const,
                      }}>
                        {isMobile
                          ? `${item.address.slice(0, 8)}...${item.address.slice(-6)}`
                          : item.address
                        }
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 3,
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-muted)',
                    }}>
                      <span>{getChainName(item.chain)}</span>
                      <span style={{ opacity: 0.4 }}>|</span>
                      <span>{formatRelativeTime(item.timestamp)}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Risk Badge + Delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {hasSummary && item.riskLevel && (
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: getRiskBg(item.riskLevel),
                      color: getRiskColor(item.riskLevel),
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase' as const,
                      whiteSpace: 'nowrap' as const,
                    }}>
                      {item.riskLevel} {item.riskScore !== undefined ? `(${item.riskScore})` : ''}
                    </span>
                  )}
                  <button
                    onClick={(e) => handleDelete(e, item.address)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-text-muted)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--color-danger-text)';
                      e.currentTarget.style.background = 'var(--color-danger-bg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--color-text-muted)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                    title="Remove from history"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Summary Stats Row */}
              {hasSummary && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                  gap: isMobile ? 8 : 12,
                  padding: '10px 12px',
                  background: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-surface-border)',
                }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>Transactions</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {item.totalTransactions?.toLocaleString() ?? '--'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>Sent</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {formatEth(item.totalValueSentEth)} ETH
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>Received</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {formatEth(item.totalValueReceivedEth)} ETH
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 2 }}>Active</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {item.activityPeriodDays !== undefined ? `${item.activityPeriodDays}d` : '--'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryPage;
