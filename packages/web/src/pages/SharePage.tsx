import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE } from '../api';
import type { AnalysisResult, ChainId, SuspiciousIndicator, FundingNode, ProjectInteraction, AnalysisSummary } from '@fundtracer/core';
import './SharePage.css';

interface ShareData {
  id: string;
  address: string;
  chain: string;
  analysis: AnalysisResult;
  createdAt: number;
}

const CHAIN_LABELS: Record<string, string> = {
  ethereum: 'Ethereum', linea: 'Linea', arbitrum: 'Arbitrum',
  base: 'Base', optimism: 'Optimism', polygon: 'Polygon',
  bsc: 'BNB Chain', solana: 'Solana', sui: 'Sui',
};

const RISK_COLORS: Record<string, string> = {
  critical: '#ff4444', high: '#ff8800', medium: '#ffcc00', low: '#00cc88',
};

function FundingSummary({ node, depth = 0 }: { node?: FundingNode | null; depth?: number }) {
  if (!node?.children?.length) return null;
  const top = node.children.slice(0, 5);
  return (
    <div className="share-funding-list" style={{ marginLeft: depth * 16 }}>
      {top.map((child, i) => (
        <div key={i} className="share-funding-item">
          <span className="share-funding-addr">
            {child.address.slice(0, 6)}...{child.address.slice(-4)}
          </span>
          <span className="share-funding-value">{child.totalValueInEth?.toFixed(4)} ETH</span>
          {child.children?.length > 0 && <FundingSummary node={child} depth={depth + 1} />}
        </div>
      ))}
      {node.children.length > 5 && (
        <div className="share-funding-more">+{node.children.length - 5} more</div>
      )}
    </div>
  );
}

function SuspicionsList({ indicators }: { indicators: SuspiciousIndicator[] }) {
  if (!indicators?.length) return <p className="share-clean">No suspicious indicators detected</p>;
  return (
    <div className="share-suspicions">
      {indicators.slice(0, 5).map((s, i) => (
        <div key={i} className={`share-suspicion share-severity-${s.severity}`}>
          <span className="share-suspicion-label">{s.type.replace(/_/g, ' ')}</span>
          <span className="share-suspicion-desc">{s.description}</span>
        </div>
      ))}
    </div>
  );
}

export function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/api/share/${id}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.result) {
          setData(res.result);
        } else {
          setError(res.error || 'Failed to load shared analysis');
        }
      })
      .catch(() => setError('Could not load shared analysis. It may have expired.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="share-page">
        <div className="share-container">
          <div className="share-loading">
            <div className="share-spinner" />
            <p>Loading analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="share-page">
        <div className="share-container">
          <div className="share-error">
            <h1>Analysis Not Found</h1>
            <p>{error || 'This shared analysis does not exist or has expired.'}</p>
            <Link to="/" className="share-cta">Go to FundTracer</Link>
          </div>
        </div>
      </div>
    );
  }

  const { address, chain, analysis } = data;
  const riskLevel = analysis?.riskLevel || 'low';
  const riskScore = analysis?.overallRiskScore ?? 0;
  const summary: AnalysisSummary | undefined = analysis?.summary;

  return (
    <div className="share-page">
      <div className="share-container">
        <header className="share-header">
          <Link to="/" className="share-logo">FundTracer</Link>
          <span className="share-badge">Shared Analysis</span>
        </header>

        <div className="share-hero">
          <div className="share-risk-section">
            <div
              className="share-risk-badge"
              style={{ borderColor: RISK_COLORS[riskLevel] || '#888', color: RISK_COLORS[riskLevel] || '#888' }}
            >
              <div className="share-risk-score">{riskScore}</div>
              <div className="share-risk-label">{riskLevel.toUpperCase()}</div>
            </div>
          </div>

          <div className="share-address-section">
            <h1 className="share-wallet-title">Wallet Analysis</h1>
            <div className="share-address">
              <span className="share-addr-value">
                {address.slice(0, 8)}...{address.slice(-6)}
              </span>
              <span className="share-chain-tag">{CHAIN_LABELS[chain] || chain}</span>
            </div>
          </div>
        </div>

        <div className="share-stats">
          <div className="share-stat">
            <span className="share-stat-value">{summary?.totalTransactions ?? '-'}</span>
            <span className="share-stat-label">Transactions</span>
          </div>
          <div className="share-stat">
            <span className="share-stat-value">{summary?.uniqueInteractedAddresses ?? '-'}</span>
            <span className="share-stat-label">Interactions</span>
          </div>
          <div className="share-stat">
            <span className="share-stat-value">{summary?.activityPeriodDays ?? '-'}d</span>
            <span className="share-stat-label">Activity Span</span>
          </div>
          <div className="share-stat">
            <span className="share-stat-value">
              {summary?.totalValueSentEth ? `${summary.totalValueSentEth.toFixed(1)}` : '-'}
            </span>
            <span className="share-stat-label">ETH Sent</span>
          </div>
        </div>

        <div className="share-grid">
          <div className="share-card">
            <h3>Funding Sources</h3>
            {analysis?.fundingSources ? (
              <FundingSummary node={analysis.fundingSources} />
            ) : (
              <p className="share-empty">No funding data available</p>
            )}
          </div>

          <div className="share-card">
            <h3>Suspicious Indicators</h3>
            <SuspicionsList indicators={analysis?.suspiciousIndicators} />
          </div>
        </div>

        {analysis?.projectsInteracted?.length > 0 && (
          <div className="share-card share-full">
            <h3>Projects Interacted</h3>
            <div className="share-projects">
              {analysis.projectsInteracted.slice(0, 8).map((p, i) => (
                <div key={i} className="share-project">
                  <span className="share-project-name">{p.projectName || p.contractAddress.slice(0, 10)}</span>
                  <span className="share-project-detail">{p.interactionCount} txs · {(p.totalValueInEth).toFixed(2)} ETH</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="share-cta-section">
          <p className="share-cta-text">Run your own deep analysis with FundTracer</p>
          <Link to={`/app-evm?address=${address}&chain=${chain}`} className="share-cta-button">
            Analyze This Wallet
          </Link>
        </div>

        <footer className="share-footer">
          <p>FundTracer — Multi-Chain Blockchain Forensics</p>
          <p className="share-footer-links">
            <a href="https://fundtracer.xyz">fundtracer.xyz</a>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default SharePage;
