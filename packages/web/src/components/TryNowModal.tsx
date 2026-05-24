import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Coins } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/ToastContext';
import { Skeleton } from './common/Skeleton';

interface TryNowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewState = 'initial' | 'loading' | 'results' | 'error';

interface PreviewData {
  wallet: { address: string; balanceInEth: number; txCount: number };
  overallRiskScore: number;
  riskLevel: string;
  summary: {
    totalTransactions: number;
    totalValueSentEth: number;
    totalValueReceivedEth: number;
    uniqueInteractedAddresses: number;
    activityPeriodDays: number;
  };
  suspiciousIndicators: { type: string; severity: string; description: string }[];
  projectsInteracted: { projectName: string | null; category: string; interactionCount: number }[];
}

const EXAMPLE_ADDRESS = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503';

const CHAINS = [
  { id: 'linea', name: 'Linea', color: '#61dfff' },
  { id: 'ethereum', name: 'Ethereum', color: '#627eea' },
  { id: 'bsc', name: 'BSC', color: '#f0b90b' },
  { id: 'arbitrum', name: 'Arbitrum', color: '#28a0f0' },
  { id: 'polygon', name: 'Polygon', color: '#8247E5' },
];

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
  return num.toFixed(2);
}

function getRiskColor(level: string): string {
  switch (level) {
    case 'critical': return 'var(--intel-red, #ff3366)';
    case 'high': return 'var(--intel-orange, #ff9900)';
    case 'medium': return 'var(--intel-yellow, #ffcc00)';
    default: return 'var(--intel-green, #00ff88)';
  }
}

function getRiskLabel(level: string): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'critical':
    case 'high':
      return <AlertTriangle size={14} />;
    default:
      return <AlertTriangle size={14} />;
  }
}

export function TryNowModal({ isOpen, onClose }: TryNowModalProps) {
  const { loginWithGoogle } = useAuth();
  const notify = useNotify();

  const [viewState, setViewState] = useState<ViewState>('initial');
  const [selectedChain, setSelectedChain] = useState('linea');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setViewState('initial');
      setAddress('');
      setError(null);
      setPreview(null);
      setSelectedChain('linea');
    }
  }, [isOpen]);

  const handleAnalyze = useCallback(async () => {
    const trimmedAddress = address.trim();
    if (!trimmedAddress) return;
    if (!ETH_ADDRESS_REGEX.test(trimmedAddress)) {
      setError({ message: 'Invalid wallet address', hint: 'Please enter a valid EVM address starting with 0x.' });
      return;
    }

    setViewState('loading');
    setError(null);

    try {
      const res = await fetch(`/api/analyze/preview?address=${encodeURIComponent(trimmedAddress)}&chain=${encodeURIComponent(selectedChain)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setViewState('error');
        setError({ message: data.message || data.error || 'Analysis failed', hint: data.hint || 'Please try again.' });
        return;
      }

      setPreview(data.preview);
      setViewState('results');
    } catch (err: any) {
      setViewState('error');
      setError({ message: 'Network error', hint: 'Check your connection and try again.' });
    }
  }, [address, selectedChain]);

  const handleShare = useCallback(async () => {
    if (!preview) return;
    setShareLoading(true);
    try {
      const res = await fetch('/api/share/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: preview.wallet.address,
          chain: selectedChain,
          result: preview,
        }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        await navigator.clipboard.writeText(data.url);
        notify.success('Link copied to clipboard!');
      } else {
        notify.error('Failed to create share link');
      }
    } catch {
      notify.error('Failed to create share link');
    } finally {
      setShareLoading(false);
    }
  }, [preview, selectedChain, notify]);

  const handleViewFullAnalysis = useCallback(() => {
    if (!preview) return;
    sessionStorage.setItem('postLoginRedirect', `/app-evm?address=${encodeURIComponent(preview.wallet.address)}&chain=${encodeURIComponent(selectedChain)}`);
    loginWithGoogle();
  }, [preview, selectedChain, loginWithGoogle]);

  const handleUseExample = useCallback(() => {
    setAddress(EXAMPLE_ADDRESS);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }, [handleAnalyze, onClose]);

  const handleRetry = useCallback(() => {
    setViewState('initial');
    setError(null);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="trynow-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          <motion.div
            className="trynow-modal"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button className="trynow-close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>

            {/* Header */}
            <div className="trynow-header">
              <h2 className="trynow-title">Try FundTracer</h2>
              <p className="trynow-subtitle">Analyze any wallet address instantly. No sign-up needed.</p>
            </div>

            {/* Chain selector */}
            <div className="trynow-chain-pills">
              {CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  className={`trynow-chain-pill ${selectedChain === chain.id ? 'active' : ''}`}
                  style={{
                    '--chain-color': chain.color,
                    borderColor: selectedChain === chain.id ? chain.color : undefined,
                    backgroundColor: selectedChain === chain.id ? `${chain.color}15` : undefined,
                  } as React.CSSProperties}
                  onClick={() => setSelectedChain(chain.id)}
                >
                  <span className="trynow-chain-dot" style={{ backgroundColor: chain.color }} />
                  {chain.name}
                </button>
              ))}
            </div>

            {/* Input row */}
            <div className="trynow-input-row">
              <input
                className="trynow-input"
                type="text"
                placeholder="0x... wallet address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                autoComplete="off"
              />
              <button
                className="trynow-analyze-btn"
                onClick={handleAnalyze}
                disabled={viewState === 'loading' || !address.trim()}
              >
                Analyze
              </button>
            </div>

            {/* Example wallet link */}
            <button className="trynow-example-link" onClick={handleUseExample}>
              <Coins size={14} />
              Try with example wallet
            </button>

            {/* Loading state - skeletons */}
            {viewState === 'loading' && (
              <div className="trynow-loading">
                <div className="trynow-stats-grid">
                  <div className="trynow-stat-card"><Skeleton height={48} borderRadius={8} /></div>
                  <div className="trynow-stat-card"><Skeleton height={48} borderRadius={8} /></div>
                  <div className="trynow-stat-card"><Skeleton height={48} borderRadius={8} /></div>
                  <div className="trynow-stat-card"><Skeleton height={48} borderRadius={8} /></div>
                </div>
                <div className="trynow-skeleton-list">
                  <Skeleton height={14} width="60%" />
                  <Skeleton height={14} width="80%" />
                  <Skeleton height={14} width="50%" />
                </div>
                <div className="trynow-skeleton-list">
                  <Skeleton height={14} width="70%" />
                  <Skeleton height={14} width="55%" />
                  <Skeleton height={14} width="65%" />
                  <Skeleton height={14} width="45%" />
                  <Skeleton height={14} width="75%" />
                </div>
              </div>
            )}

            {/* Error state */}
            {viewState === 'error' && error && (
              <div className="trynow-error">
                <AlertTriangle size={20} className="trynow-error-icon" />
                <p className="trynow-error-message">{error.message}</p>
                {error.hint && <p className="trynow-error-hint">{error.hint}</p>}
                <button className="trynow-retry-btn" onClick={handleRetry}>
                  Try Again
                </button>
              </div>
            )}

            {/* Results state */}
            {viewState === 'results' && preview && (
              <div className="trynow-results">
                {/* Stats cards */}
                <div className="trynow-stats-grid">
                  <div className="trynow-stat-card">
                    <span className="trynow-stat-label">Risk Score</span>
                    <span className="trynow-stat-value" style={{ color: getRiskColor(preview.riskLevel) }}>
                      {getRiskLabel(preview.riskLevel)} ({preview.overallRiskScore})
                    </span>
                  </div>
                  <div className="trynow-stat-card">
                    <span className="trynow-stat-label">Transactions</span>
                    <span className="trynow-stat-value">{formatNumber(preview.summary.totalTransactions)}</span>
                  </div>
                  <div className="trynow-stat-card">
                    <span className="trynow-stat-label">Value Sent</span>
                    <span className="trynow-stat-value">{formatNumber(preview.summary.totalValueSentEth)} ETH</span>
                  </div>
                  <div className="trynow-stat-card">
                    <span className="trynow-stat-label">Value Received</span>
                    <span className="trynow-stat-value">{formatNumber(preview.summary.totalValueReceivedEth)} ETH</span>
                  </div>
                </div>

                {/* Suspicious indicators */}
                <div className="trynow-section">
                  <h3 className="trynow-section-title">Suspicious Indicators</h3>
                  {preview.suspiciousIndicators.length === 0 ? (
                    <div className="trynow-clean-badge">
                      <CheckCircle size={14} />
                      No suspicious patterns detected
                    </div>
                  ) : (
                    <div className="trynow-indicators-list">
                      {preview.suspiciousIndicators.map((indicator, i) => (
                        <div key={i} className="trynow-indicator-item">
                          <span className="trynow-indicator-severity" style={{ color: indicator.severity === 'critical' || indicator.severity === 'high' ? 'var(--intel-red, #ff3366)' : 'var(--intel-yellow, #ffcc00)' }}>
                            {getSeverityIcon(indicator.severity)}
                          </span>
                          <span className="trynow-indicator-desc">{indicator.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Projects interacted */}
                <div className="trynow-section">
                  <h3 className="trynow-section-title">Top Projects</h3>
                  <div className="trynow-projects-list">
                    {preview.projectsInteracted.map((project, i) => (
                      <div key={i} className="trynow-project-item">
                        <span className="trynow-project-name">{project.projectName || project.category}</span>
                        <span className="trynow-project-count">{project.interactionCount} interactions</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions row — only show when there are results */}
            {viewState === 'results' && (
              <div className="trynow-actions">
                <button
                  className="trynow-btn trynow-btn--secondary"
                  onClick={handleShare}
                  disabled={shareLoading}
                >
                  {shareLoading ? 'Creating link...' : 'Share Link'}
                </button>
                <button
                  className="trynow-btn trynow-btn--primary"
                  onClick={handleViewFullAnalysis}
                >
                  View Full Analysis
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
