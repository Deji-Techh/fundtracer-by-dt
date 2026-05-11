import React, { useState, useEffect, useCallback } from 'react';
import { isValidSolanaAddress } from '../../utils/addressDetection';
import './SolanaView.css';

type SolanaTab = 'overview' | 'transactions' | 'funding-tree';

const API_BASE = import.meta.env.VITE_API_URL || 'https://fundtracer-by-dt-production.up.railway.app';
const SOLSCAN_TX = 'https://solscan.io/tx';

function truncateAddr(addr: string, n = 6): string {
  if (!addr || addr.length < n * 2) return addr || '';
  return `${addr.slice(0, n)}...${addr.slice(-n)}`;
}

function safeDate(ts: string | number | undefined | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function safeTime(ts: string | number | undefined | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatSol(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '0';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(n) ? '0' : n.toLocaleString(undefined, { maximumFractionDigits: 6, minimumFractionDigits: 0 });
}

interface OverviewData {
  wallet: string;
  firstTimestamp: string;
  lastTimestamp: string;
  activityPeriodDays: number;
  totalTransactions: number;
  totalSOLSent: string;
  totalSOLReceived: string;
  uniqueAddressCount: number;
  uniqueAddresses: string[];
  topInteractors: { address: string; count: number }[];
  allTransactions: { signature: string; timestamp: string; status: string }[];
  scanTimeMs: number;
}

interface FundingTreeData {
  wallet: string;
  fundingSources: { address: string; label: string | null; totalSol: string; txCount: number; lastActivity: string | null }[];
  fundingDestinations: { address: string; label: string | null; totalSol: string; txCount: number; lastActivity: string | null }[];
  totalSourcesFound: number;
  totalDestinationsFound: number;
  totalTransfers: number;
}

export function SolanaView() {
  const [address, setAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<SolanaTab>('overview');

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [fundingTree, setFundingTree] = useState<FundingTreeData | null>(null);

  const [txFilter, setTxFilter] = useState('all');
  const [treeMode, setTreeMode] = useState<'sources' | 'destinations'>('sources');

  const authToken = typeof window !== 'undefined' ? localStorage.getItem('fundtracer_token') : null;

  const handleAnalyze = useCallback(async () => {
    if (!address.trim()) return;
    if (!isValidSolanaAddress(address.trim())) {
      setError('Please enter a valid Solana address');
      return;
    }

    setError('');
    setIsAnalyzing(true);
    setOverview(null);
    setTransactions([]);
    setFundingTree(null);

    const trimmed = address.trim();

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    try {
      if (activeTab === 'overview') {
        const res = await fetch(`${API_BASE}/api/solana/overview/${trimmed}`, { headers });
        if (!res.ok) throw new Error(await res.text().catch(() => 'Overview scan failed'));
        const data = await res.json();
        setOverview(data);
      } else if (activeTab === 'transactions') {
        const res = await fetch(`${API_BASE}/api/solana/transactions/${trimmed}?limit=200`, { headers });
        if (!res.ok) throw new Error(await res.text().catch(() => 'Failed to fetch transactions'));
        const data = await res.json();
        setTransactions(data.transactions || []);
      } else if (activeTab === 'funding-tree') {
        const res = await fetch(`${API_BASE}/api/solana/funding-tree/${trimmed}`, { headers });
        if (!res.ok) throw new Error(await res.text().catch(() => 'Failed to build funding tree'));
        const data = await res.json();
        setFundingTree(data);
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [address, activeTab, authToken]);

  useEffect(() => {
    if (address && isValidSolanaAddress(address.trim())) {
      handleAnalyze();
    }
  }, [activeTab]);

  const filteredTxs = transactions.filter((tx: any) => {
    if (txFilter === 'all') return true;
    if (txFilter === 'success') return tx.status === 'success';
    if (txFilter === 'failed') return tx.status === 'failed';
    return true;
  });

  const treeItems = treeMode === 'sources' ? (fundingTree?.fundingSources || []) : (fundingTree?.fundingDestinations || []);

  const tabs: { id: SolanaTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'funding-tree', label: 'Funding Tree' },
  ];

  return (
    <div className="investigate-view">
      <div className="page-head">
        <div className="page-title">Solana</div>
        <div className="page-desc">Analyze Solana wallets via Helius — overview, transactions, and funding tree</div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Solana Mainnet</div>
          <div className="stat-val">Active</div>
          <div className="stat-note">Helius-powered</div>
        </div>
        <div className="stat">
          <div className="stat-label">Transactions</div>
          <div className="stat-val">{overview?.totalTransactions ?? transactions.length ?? 0}</div>
          <div className="stat-note">{overview ? `Scanned in ${overview.scanTimeMs}ms` : '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Interactors</div>
          <div className="stat-val">{overview?.uniqueAddressCount ?? 0}</div>
          <div className="stat-note">Unique addresses</div>
        </div>
        <div className="stat">
          <div className="stat-label">Activity</div>
          <div className="stat-val">{overview?.activityPeriodDays ?? 0}d</div>
          <div className="stat-note">Period</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-content">
          <div className="search-section">
            <div className="search-row">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter Solana address..."
                className="search-input"
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
              <button className="btn-primary" onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? 'Scanning...' : 'Analyze'}
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== OVERVIEW TAB ========== */}
      {activeTab === 'overview' && (
        <div className="panel">
          <div className="panel-content">
            {overview ? (
              <div className="overview-section">
                <div className="info-grid">
                  <div className="info-card">
                    <div className="info-label">Wallet Address</div>
                    <div className="info-value mono">{truncateAddr(overview.wallet, 8)}</div>
                  </div>
                  <div className="info-card">
                    <div className="info-label">First Activity</div>
                    <div className="info-value">{safeDate(overview.firstTimestamp)}</div>
                  </div>
                  <div className="info-card">
                    <div className="info-label">Last Activity</div>
                    <div className="info-value">{safeDate(overview.lastTimestamp)}</div>
                  </div>
                  <div className="info-card">
                    <div className="info-label">Activity Period</div>
                    <div className="info-value">{overview.activityPeriodDays} days</div>
                  </div>
                  <div className="info-card">
                    <div className="info-label">Total Transactions</div>
                    <div className="info-value">{overview.totalTransactions.toLocaleString()}</div>
                  </div>
                  <div className="info-card">
                    <div className="info-label">Total SOL Sent</div>
                    <div className="info-value">{formatSol(overview.totalSOLSent)} SOL</div>
                  </div>
                  <div className="info-card">
                    <div className="info-label">Total SOL Received</div>
                    <div className="info-value">{formatSol(overview.totalSOLReceived)} SOL</div>
                  </div>
                  <div className="info-card">
                    <div className="info-label">Unique Interactors</div>
                    <div className="info-value">{overview.uniqueAddressCount}</div>
                  </div>
                </div>

                {overview.topInteractors.length > 0 && (
                  <div style={{ marginTop: 'var(--space-5)' }}>
                    <h4 style={{ margin: '0 0 var(--space-3)', color: 'var(--intel-text-primary)' }}>Top Interactors</h4>
                    <div className="interactors-list">
                      {overview.topInteractors.map((item, i) => (
                        <div key={i} className="interactor-item">
                          <span className="interactor-rank">#{i + 1}</span>
                          <a
                            className="interactor-addr"
                            href={`https://solscan.io/address/${item.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {truncateAddr(item.address, 12)}
                          </a>
                          <span className="interactor-count">{item.count} txs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--intel-text-muted)' }}>
                  Scan completed in {overview.scanTimeMs}ms
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <h3>Enter a Solana Address</h3>
                <p>Paste a Solana wallet address to get a complete overview — first/last activity, total SOL sent/received, and top interactors.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== TRANSACTIONS TAB ========== */}
      {activeTab === 'transactions' && (
        <div className="panel">
          <div className="panel-content">
            {transactions.length > 0 ? (
              <>
                <div className="tx-filters" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  {['all', 'success', 'failed'].map(f => (
                    <button
                      key={f}
                      className={`filter-btn ${txFilter === f ? 'active' : ''}`}
                      onClick={() => setTxFilter(f)}
                      style={{
                        padding: '4px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--intel-border-subtle)',
                        background: txFilter === f ? 'var(--intel-cyan)' : 'var(--intel-bg-elevated)',
                        color: txFilter === f ? 'var(--intel-bg-deep)' : 'var(--intel-text-secondary)',
                        cursor: 'pointer', fontSize: 'var(--text-xs)',
                      }}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                  <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--intel-text-muted)', alignSelf: 'center' }}>
                    {filteredTxs.length} of {transactions.length}
                  </span>
                </div>

                <div className="tx-list" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {filteredTxs.slice(0, 200).map((tx: any, i: number) => (
                    <div key={i} className="tx-item" style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      borderBottom: '1px solid var(--intel-border-subtle)',
                    }}>
                      <span className={`tx-status-dot ${tx.status}`} style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: tx.status === 'success' ? 'var(--intel-green)' : 'var(--intel-red)',
                      }} />
                      <a
                        href={`${SOLSCAN_TX}/${tx.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tx-hash mono"
                        style={{ flex: 1, color: 'var(--intel-cyan)', fontSize: 'var(--text-xs)', textDecoration: 'none' }}
                      >
                        {truncateAddr(tx.signature, 10)}
                      </a>
                      <span className="tx-time" style={{ fontSize: 'var(--text-xs)', color: 'var(--intel-text-muted)' }}>
                        {safeTime(tx.blockTime ? tx.blockTime * 1000 : null)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : overview && overview.allTransactions ? (
              <>
                <div className="tx-list" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {overview.allTransactions.slice(0, 200).map((tx, i) => (
                    <div key={i} className="tx-item" style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      borderBottom: '1px solid var(--intel-border-subtle)',
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: tx.status === 'success' ? 'var(--intel-green)' : 'var(--intel-red)',
                      }} />
                      <a
                        href={`${SOLSCAN_TX}/${tx.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ flex: 1, color: 'var(--intel-cyan)', fontSize: 'var(--text-xs)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}
                      >
                        {truncateAddr(tx.signature, 10)}
                      </a>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--intel-text-muted)' }}>
                        {safeTime(tx.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
                {overview.allTransactions.length > 200 && (
                  <div style={{ textAlign: 'center', padding: 'var(--space-3)', color: 'var(--intel-text-muted)', fontSize: 'var(--text-xs)' }}>
                    Showing 200 of {overview.allTransactions.length.toLocaleString()} transactions. View full list on Solscan.
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <h3>No Transactions</h3>
                <p>Enter an address and analyze it to see the transaction history.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== FUNDING TREE TAB ========== */}
      {activeTab === 'funding-tree' && (
        <div className="panel">
          <div className="panel-content">
            {fundingTree ? (
              <>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  <button
                    className={`filter-btn ${treeMode === 'sources' ? 'active' : ''}`}
                    onClick={() => setTreeMode('sources')}
                    style={{
                      padding: '6px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--intel-border-subtle)',
                      background: treeMode === 'sources' ? 'var(--intel-cyan)' : 'var(--intel-bg-elevated)',
                      color: treeMode === 'sources' ? 'var(--intel-bg-deep)' : 'var(--intel-text-secondary)',
                      cursor: 'pointer', fontSize: 'var(--text-sm)',
                    }}
                  >
                    Sources ({fundingTree.totalSourcesFound})
                  </button>
                  <button
                    className={`filter-btn ${treeMode === 'destinations' ? 'active' : ''}`}
                    onClick={() => setTreeMode('destinations')}
                    style={{
                      padding: '6px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--intel-border-subtle)',
                      background: treeMode === 'destinations' ? 'var(--intel-cyan)' : 'var(--intel-bg-elevated)',
                      color: treeMode === 'destinations' ? 'var(--intel-bg-deep)' : 'var(--intel-text-secondary)',
                      cursor: 'pointer', fontSize: 'var(--text-sm)',
                    }}
                  >
                    Destinations ({fundingTree.totalDestinationsFound})
                  </button>
                  <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--intel-text-muted)', alignSelf: 'center' }}>
                    {fundingTree.totalTransfers} transfers analyzed
                  </span>
                </div>

                <div className="funding-list" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {treeItems.length > 0 ? (
                    treeItems.map((item, i) => (
                      <div key={i} className="funding-item" style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                        padding: 'var(--space-2) var(--space-3)',
                        borderBottom: '1px solid var(--intel-border-subtle)',
                      }}>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--intel-text-muted)', width: 24, flexShrink: 0 }}>
                          #{i + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <a
                            href={`https://solscan.io/address/${item.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--intel-cyan)', fontSize: 'var(--text-xs)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}
                          >
                            {truncateAddr(item.address, 12)}
                          </a>
                          {item.label && (
                            <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-2xs)', color: 'var(--intel-text-muted)' }}>
                              ({item.label})
                            </span>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--intel-text-primary)' }}>
                            {formatSol(item.totalSol)} SOL
                          </div>
                          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--intel-text-muted)' }}>
                            {item.txCount} txn{item.txCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <h3>No {treeMode === 'sources' ? 'Sources' : 'Destinations'} Found</h3>
                      <p>No transfer data available for this address.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <h3>Funding Tree</h3>
                <p>Enter an address to trace where SOL comes from and where it goes.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SolanaView;
