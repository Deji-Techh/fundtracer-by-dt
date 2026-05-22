import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Users, GitBranch, BarChart2, Check, Terminal, Key, History, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/ToastContext';
import { createMcpKey, listMcpKeys, deleteMcpKey, getMcpHistory } from '../api';
import type { McpHistoryItem } from '../api';
import { LandingLayout } from '../design-system';
import './McpPage.css';

interface McpKey {
  id: string;
  name: string;
  key?: string;
  maskedKey?: string;
  type: string;
  createdAt: string;
  lastUsed: string | null;
  requests: number;
  active: boolean;
}

const TOOLS_LIST = [
  { name: 'analyze_wallet', description: 'Full wallet analysis with risk scoring', params: 'address, chainId' },
  { name: 'trace_funds', description: 'Recursive funding source/destination tracing', params: 'address, chainId, maxDepth?' },
  { name: 'compare_wallets', description: 'Multi-wallet comparison & sybil correlation', params: 'addresses, chainId' },
  { name: 'analyze_contract', description: 'Smart contract interactor & sybil analysis', params: 'contractAddress, chainId' },
  { name: 'detect_sybil_clusters', description: 'Cluster wallets sharing funding sources', params: 'addresses, chainId' },
  { name: 'get_portfolio', description: 'Token/DeFi/NFT portfolio for a wallet', params: 'address, chainId' },
  { name: 'get_transactions', description: 'Recent transaction history', params: 'address, chainId, limit?' },
  { name: 'lookup_entity', description: 'Look up known blockchain entities & labels', params: 'query, chainId?' },
  { name: 'get_gas_prices', description: 'Current gas prices across all chains', params: 'chainId?' },
  { name: 'get_token_info', description: 'Token market data & price info', params: 'tokenAddress, chainId' },
];

const navItems = [
  { label: 'Intel', href: '/' },
  { label: 'Blog', href: '/blog' },
  { label: 'Docs', href: '/docs/getting-started' },
  { label: 'Features', href: '/features' },
  { label: 'Rewards', href: '/rewards' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'API', href: '/api-docs' },
  { label: 'MCP', href: '/mcp', active: true },
  { label: 'CLI', href: '/cli' },
  { label: 'About', href: '/about' },
];

type McpTab = 'overview' | 'manage' | 'history' | 'documentation';

function CopyButton({ text, label }: { text: string; label?: string }) {
  const notify = useNotify();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      notify.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error('Failed to copy');
    }
  };

  return (
    <button className="cli-copy-btn" onClick={handleCopy}>
      {copied ? <><Check size={14} /> Copied</> : label || 'Copy'}
    </button>
  );
}

export function McpPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { isAuthenticated, loading, loginWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<McpTab>('overview');
  const [keys, setKeys] = useState<McpKey[]>([]);
  const [keyName, setKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);

  // History pagination
  const [historyLogs, setHistoryLogs] = useState<McpHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyToolFilter, setHistoryToolFilter] = useState('');
  const [historyInit, setHistoryInit] = useState(false);

  const fetchHistory = useCallback(async (append = false) => {
    setLoadingHistory(true);
    try {
      const last = append && historyLogs.length > 0 ? historyLogs[historyLogs.length - 1].createdAt : undefined;
      const res = await getMcpHistory({
        limit: 25,
        startAfter: last,
        tool: historyToolFilter || undefined,
      });
      if (res.success) {
        setHistoryLogs(prev => append ? [...prev, ...res.logs] : res.logs);
        setHasMoreHistory(res.hasMore);
      }
    } catch (err) {
      console.error('Failed to load MCP history:', err);
    } finally {
      setLoadingHistory(false);
      setHistoryInit(true);
    }
  }, [historyToolFilter]);

  useEffect(() => {
    if (isAuthenticated && !historyInit) {
      fetchHistory();
    }
    if (!isAuthenticated) {
      setHistoryLogs([]);
      setHistoryInit(false);
    }
  }, [isAuthenticated, fetchHistory, historyInit]);

  const loadKeys = useCallback(async () => {
    setLoadingKeys(true);
    try {
      const res = await listMcpKeys();
      if (res.success) {
        setKeys(res.keys);
      }
    } catch (err: any) {
      console.error('Failed to load MCP keys:', err);
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadKeys();
    }
  }, [isAuthenticated, loadKeys]);

  const handleGenerate = async () => {
    if (!keyName.trim()) return;
    setCreating(true);
    setError(null);
    setGeneratedKey(null);

    try {
      const res = await createMcpKey(keyName.trim());
      if (res.success && res.key) {
        setGeneratedKey(res.key.key || '');
        setKeyName('');
        await loadKeys();
      } else {
        setError(res.error || 'Failed to create key');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create MCP key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!window.confirm('Revoke this MCP API key? Any services using it will stop working.')) return;

    try {
      const res = await deleteMcpKey(keyId);
      if (res.success) {
        await loadKeys();
        notify.success('Key revoked');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to revoke key');
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      notify.success('API key copied to clipboard. Store it securely!');
    } catch {
      const input = document.getElementById('generated-key-input') as HTMLInputElement;
      if (input) { input.select(); document.execCommand('copy'); notify.success('API key copied'); }
    }
  };

  const formatDate = (ts: string | number) => {
    const d = new Date(typeof ts === 'number' ? ts : ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ---- Tabs ----
  const TABS: { key: McpTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Terminal size={16} /> },
    { key: 'manage', label: 'Manage', icon: <Key size={16} /> },
    { key: 'history', label: 'History', icon: <History size={16} /> },
    { key: 'documentation', label: 'Documentation', icon: <BookOpen size={16} /> },
  ];

  const totalRequests = keys.reduce((sum, k) => sum + (k.requests || 0), 0);
  const activeKeyCount = keys.filter(k => k.active).length;

  // ======== LOADING ========
  if (loading) {
    return (
      <LandingLayout navItems={navItems} showSearch={false} transparent>
        <div className="mcp-loading">
          <div className="mcp-loading__spinner" />
          <p className="mcp-loading__text">Loading...</p>
        </div>
      </LandingLayout>
    );
  }

  return (
    <LandingLayout
      navItems={navItems}
      showSearch={false}
      transparent
      headerRight={
        isAuthenticated ? (
          <button className="mcp-btn mcp-btn--primary" onClick={() => navigate('/app-evm')}>
            Launch App
          </button>
        ) : undefined
      }
    >
    <div className="cli-page">
      <div className="cli-container">

        {/* ===== Header ===== */}
        <motion.div
          className="cli-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="cli-logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>FundTracer MCP</span>
          </div>
          <h1>Blockchain Analysis for AI Assistants</h1>
          <p>
            Let Claude, Cursor, and any MCP-compatible AI analyze wallets, detect sybil clusters,
            trace fund flows, and query on-chain data through natural language.
          </p>
        </motion.div>

        {/* ===== Tab Bar ===== */}
        <div className="mcp-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`mcp-tab ${activeTab === tab.key ? 'mcp-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ================================================================ */}
        {/* TAB: Overview */}
        {/* ================================================================ */}
        {activeTab === 'overview' && (
          <>
            {/* Stats bar */}
            {isAuthenticated && (
              <motion.div
                className="mcp-usage-stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mcp-stat">
                  <span className="mcp-stat__value">{activeKeyCount}</span>
                  <span className="mcp-stat__label">Active Keys</span>
                </div>
                <div className="mcp-stat">
                  <span className="mcp-stat__value">{totalRequests.toLocaleString()}</span>
                  <span className="mcp-stat__label">Total Requests</span>
                </div>
                <div className="mcp-stat">
                  <span className="mcp-stat__value">10</span>
                  <span className="mcp-stat__label">MCP Tools</span>
                </div>
              </motion.div>
            )}

            {/* CTA / Sign in */}
            {!isAuthenticated && (
              <motion.div
                className="cli-link-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h2 style={{ marginTop: 0, textAlign: 'center' }}>Get Started</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                  Sign in to generate your MCP API key and connect AI assistants to blockchain analysis.
                </p>
                <button
                  className="cli-google-btn"
                  onClick={() => loginWithGoogle()}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </button>
              </motion.div>
            )}

            {/* Features */}
            <motion.div
              className="cli-features"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2>Features</h2>
              <div className="cli-features-grid">
                <div className="cli-feature">
                  <div className="feature-icon"><Search size={24} /></div>
                  <h3>Wallet Analysis</h3>
                  <p>Full risk scoring, transaction history, and funding source tracing across 8+ chains</p>
                </div>
                <div className="cli-feature">
                  <div className="feature-icon"><Users size={24} /></div>
                  <h3>Sybil Detection</h3>
                  <p>Identify coordinated attack patterns and airdrop farmers with funding source clustering</p>
                </div>
                <div className="cli-feature">
                  <div className="feature-icon"><GitBranch size={24} /></div>
                  <h3>Fund Tracing</h3>
                  <p>Recursive funding tree analysis — trace where money comes from and goes to</p>
                </div>
                <div className="cli-feature">
                  <div className="feature-icon"><BarChart2 size={24} /></div>
                  <h3>Portfolio & Markets</h3>
                  <p>Token balances, DeFi positions, gas prices, and market data in real-time</p>
                </div>
              </div>
            </motion.div>

            {/* Quick start */}
            <motion.div
              className="cli-usage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h2 style={{ textAlign: 'center' }}>Quick Start</h2>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                Add to any MCP client:
              </p>
              <div className="cli-code-block">
                <code>{`"command": "npx", "args": ["-y", "@fundtracer/mcp", "fundtracer-mcp"]`}</code>
                <CopyButton text={`"command": "npx", "args": ["-y", "@fundtracer/mcp", "fundtracer-mcp"]`} />
              </div>
              {isAuthenticated && (
                <p style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
                  <button
                    className="cli-generate-btn"
                    onClick={() => setActiveTab('manage')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <Key size={16} />
                    Manage Your Keys
                  </button>
                </p>
              )}
            </motion.div>

            {/* Help */}
            <motion.div
              className="cli-cta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h2>Need Help?</h2>
              <p>Check the documentation for setup guides and tool reference</p>
              <button
                className="cli-generate-btn"
                onClick={() => setActiveTab('documentation')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <BookOpen size={16} />
                View Documentation
              </button>
            </motion.div>
          </>
        )}

        {/* ================================================================ */}
        {/* TAB: Manage */}
        {/* ================================================================ */}
        {activeTab === 'manage' && (
          !isAuthenticated ? (
            <div className="cli-link-section">
              <h2 style={{ marginTop: 0, textAlign: 'center' }}>Sign in Required</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                Sign in to manage your MCP API keys.
              </p>
              <button className="cli-google-btn" onClick={() => loginWithGoogle()}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          ) : (
            <>
              {/* Usage Stats */}
              <motion.div
                className="mcp-usage-stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mcp-stat">
                  <span className="mcp-stat__value">{activeKeyCount}</span>
                  <span className="mcp-stat__label">Active Keys</span>
                </div>
                <div className="mcp-stat">
                  <span className="mcp-stat__value">{totalRequests.toLocaleString()}</span>
                  <span className="mcp-stat__label">Total Requests</span>
                </div>
                <div className="mcp-stat">
                  <span className="mcp-stat__value">{keys.filter(k => !k.active).length}</span>
                  <span className="mcp-stat__label">Revoked</span>
                </div>
              </motion.div>

              {/* Error */}
              {error && (
                <div className="mcp-error">{error}</div>
              )}

              {/* Generate Key Card */}
              <motion.div
                className="cli-usage"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2>Generate MCP API Key</h2>
                <div className="mcp-generate-row">
                  <input
                    type="text"
                    placeholder="Key name (e.g., Claude Desktop)"
                    value={keyName}
                    onChange={e => setKeyName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                    maxLength={100}
                    className="cli-code-block"
                    style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '14px', padding: 'var(--space-3) var(--space-4)', outline: 'none' }}
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={creating || !keyName.trim()}
                    className="cli-generate-btn"
                  >
                    {creating ? 'Generating...' : 'Generate Key'}
                  </button>
                </div>

                {generatedKey && (
                  <div className="mcp-key-reveal">
                    <p className="mcp-key-reveal__warning">
                      Copy this key now — you won't be able to see it again!
                    </p>
                    <div className="mcp-key-reveal__row">
                      <input
                        id="generated-key-input"
                        type="text"
                        readOnly
                        value={generatedKey}
                        className="mcp-key-reveal__input"
                      />
                      <button onClick={() => handleCopyKey(generatedKey)} className="cli-generate-btn" style={{ whiteSpace: 'nowrap' }}>
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Key List */}
              <motion.div
                className="cli-usage"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                style={{ marginTop: 24 }}
              >
                <h2>Your API Keys</h2>
                {loadingKeys ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading keys...</p>
                ) : keys.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No MCP API keys yet. Generate one above.</p>
                ) : (
                  <div className="mcp-key-list">
                    {keys.map(k => (
                      <div key={k.id} className="mcp-key-item">
                        <div className="mcp-key-item__info">
                          <p className="mcp-key-item__name">{k.name}</p>
                          <div className="mcp-key-item__meta">
                            <code className="mcp-key-item__code">
                              {k.maskedKey || k.key?.substring(0, 15) + '...'}
                            </code>
                            <span className="mcp-key-item__requests">{k.requests} requests</span>
                            <span className="mcp-key-item__requests">
                              {k.lastUsed ? `Last: ${formatDate(k.lastUsed)}` : 'Never used'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevoke(k.key || k.id)}
                          className="mcp-btn mcp-btn--danger"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          )
        )}

        {/* ================================================================ */}
        {/* TAB: History */}
        {/* ================================================================ */}
        {activeTab === 'history' && (
          !isAuthenticated ? (
            <div className="cli-link-section">
              <h2 style={{ marginTop: 0, textAlign: 'center' }}>Sign in Required</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                Sign in to view your MCP usage history.
              </p>
              <button className="cli-google-btn" onClick={() => loginWithGoogle()}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          ) : (
            <motion.div
              className="cli-usage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h2>Request History</h2>

              {/* Tool filter */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-4)', alignItems: 'center' }}>
                <select
                  value={historyToolFilter}
                  onChange={e => { setHistoryToolFilter(e.target.value); setHistoryInit(false); }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                >
                  <option value="">All Tools</option>
                  {TOOLS_LIST.map(t => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {totalRequests.toLocaleString()} total requests
                </span>
              </div>

              {/* Empty / loading state */}
              {loadingHistory && historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
                  <div className="mcp-loading__spinner" style={{ margin: '0 auto var(--space-3)' }} />
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>Loading history...</p>
                </div>
              ) : historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
                  <History size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)', opacity: 0.4 }} />
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>No MCP requests yet.</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
                    {historyToolFilter ? `No requests for "${historyToolFilter}".` : 'Connect an AI assistant with your MCP key to see usage here.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* History table */}
                  <div className="mcp-table-wrap">
                    <table className="mcp-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Tool</th>
                          <th>Args</th>
                          <th>Duration</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyLogs.map(log => (
                          <tr key={log.id}>
                            <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }}>
                              {formatDate(log.createdAt)}
                            </td>
                            <td>
                              <code className="mcp-tool-name" style={{ fontSize: 12 }}>{log.toolName}</code>
                            </td>
                            <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12, color: 'var(--text-secondary)' }}>
                              {(() => {
                                try {
                                  const parsed = JSON.parse(log.args);
                                  const addr = parsed.address || parsed.addresses || parsed.contractAddress || parsed.query || parsed.tokenAddress;
                                  const chain = parsed.chainId;
                                  const summary = [addr ? (typeof addr === 'string' ? addr.substring(0, 20) : JSON.stringify(addr).substring(0, 20)) : '', chain].filter(Boolean).join(' · ');
                                  return summary || log.args.substring(0, 40);
                                } catch { return log.args.substring(0, 40); }
                              })()}
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {log.duration > 1000
                                ? `${(log.duration / 1000).toFixed(1)}s`
                                : `${log.duration}ms`
                              }
                            </td>
                            <td>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                color: log.status === 'success' ? 'var(--accent-green, #4ade80)' : 'var(--accent-red, #ff3366)',
                                fontSize: 12,
                              }}>
                                <span style={{
                                  width: 6, height: 6, borderRadius: '50%',
                                  background: log.status === 'success' ? 'var(--accent-green, #4ade80)' : 'var(--accent-red, #ff3366)',
                                  display: 'inline-block',
                                }} />
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Load more */}
                  {hasMoreHistory && (
                    <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                      <button
                        onClick={() => fetchHistory(true)}
                        disabled={loadingHistory}
                        className="cli-generate-btn"
                        style={{ opacity: loadingHistory ? 0.6 : 1 }}
                      >
                        {loadingHistory ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )
        )}

        {/* ================================================================ */}
        {/* TAB: Documentation */}
        {/* ================================================================ */}
        {activeTab === 'documentation' && (
          <>
            {/* Option A */}
            <motion.div
              className="cli-usage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h2>Option A: stdio (npx)</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                Works in Claude Desktop, Claude Code, Cursor, and any MCP client with stdio transport.
                Add to your client's MCP server config:
              </p>
              <div className="mcp-code-wrap">
                <CopyButton text={`{\n  "mcpServers": {\n    "fundtracer": {\n      "command": "npx",\n      "args": ["-y", "@fundtracer/mcp", "fundtracer-mcp"],\n      "env": {\n        "FUNDTRACER_MCP_API_KEY": "YOUR_FT_MCP_KEY"\n      }\n    }\n  }\n}`} />
                <pre className="mcp-code-block">{`{
  "mcpServers": {
    "fundtracer": {
      "command": "npx",
      "args": ["-y", "@fundtracer/mcp", "fundtracer-mcp"],
      "env": {
        "FUNDTRACER_MCP_API_KEY": "YOUR_FT_MCP_KEY"
      }
    }
  }
}`}</pre>
              </div>
            </motion.div>

            {/* Option B */}
            <motion.div
              className="cli-usage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              style={{ marginTop: 24 }}
            >
              <h2>Option B: HTTP</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                No package needed. Point your MCP client directly at the live API:
              </p>
              <div className="mcp-code-wrap">
                <CopyButton text={`{\n  "mcpServers": {\n    "fundtracer": {\n      "url": "https://api.fundtracer.xyz/api/mcp",\n      "headers": {\n        "Authorization": "Bearer YOUR_FT_MCP_KEY"\n      }\n    }\n  }\n}`} />
                <pre className="mcp-code-block">{`{
  "mcpServers": {
    "fundtracer": {
      "url": "https://api.fundtracer.xyz/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_FT_MCP_KEY"
      }
    }
  }
}`}</pre>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)' }}>
                Or call directly with curl:
              </p>
              <div className="mcp-code-wrap">
                <CopyButton text={`# List available tools\ncurl https://api.fundtracer.xyz/api/mcp/tools\n\n# Analyze a wallet\ncurl -X POST https://api.fundtracer.xyz/api/mcp/tools/analyze_wallet \\\n  -H "Authorization: Bearer ft_mcp_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","chainId":"ethereum"}'`} />
                <pre className="mcp-code-block">{`# List available tools
curl https://api.fundtracer.xyz/api/mcp/tools

# Analyze a wallet
curl -X POST https://api.fundtracer.xyz/api/mcp/tools/analyze_wallet \\
  -H "Authorization: Bearer ft_mcp_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","chainId":"ethereum"}'`}</pre>
              </div>
            </motion.div>

            {/* Tools Reference */}
            <motion.div
              className="cli-usage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              style={{ marginTop: 24 }}
            >
              <h2>Available Tools</h2>
              <div className="mcp-table-wrap">
                <table className="mcp-table">
                  <thead>
                    <tr>
                      <th>Tool</th>
                      <th>Description</th>
                      <th>Parameters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOOLS_LIST.map(t => (
                      <tr key={t.name}>
                        <td><code className="mcp-tool-name">{t.name}</code></td>
                        <td className="mcp-desc-cell">{t.description}</td>
                        <td className="mcp-params-cell">{t.params}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}

      </div>
    </div>
    </LandingLayout>
  );
}

export default McpPage;
