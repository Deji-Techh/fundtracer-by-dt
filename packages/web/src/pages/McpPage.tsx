import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createMcpKey, listMcpKeys, deleteMcpKey } from '../api';
import { LandingLayout, Badge } from '../design-system';
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

export function McpPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, loginWithGoogle } = useAuth();
  const [keys, setKeys] = useState<McpKey[]>([]);
  const [keyName, setKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);

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
      }
    } catch (err: any) {
      setError(err.message || 'Failed to revoke key');
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      alert('API key copied to clipboard. Store it securely — you won\'t be able to see it again.');
    }).catch(() => {
      const input = document.getElementById('generated-key-input') as HTMLInputElement;
      if (input) { input.select(); document.execCommand('copy'); }
    });
  };

  // ---- Loading state ----
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

  // ---- Not authenticated ----
  if (!isAuthenticated) {
    return (
      <LandingLayout
        navItems={navItems}
        showSearch={false}
        transparent
      >
        <div className="mcp-hero">
          <div className="mcp-hero__content">
            <div className="mcp-hero__badge">
              <Badge variant="info" size="sm">MCP SERVER</Badge>
            </div>
            <h1 className="mcp-hero__title">
              FundTracer <span className="mcp-hero__title-accent">MCP</span> Server
            </h1>
            <p className="mcp-hero__subtitle">
              Connect AI assistants like Claude Desktop and Cursor directly to blockchain analysis.
              Authenticate to generate your MCP API key.
            </p>
            <button
              className="mcp-btn mcp-btn--primary mcp-btn--lg"
              onClick={() => loginWithGoogle()}
            >
              Connect with Google
            </button>
          </div>
          <div className="mcp-hero__grid" />
        </div>
      </LandingLayout>
    );
  }

  // ---- Authenticated ----
  return (
    <LandingLayout
      navItems={navItems}
      showSearch={false}
      transparent
      headerRight={
        <button className="mcp-btn mcp-btn--primary" onClick={() => navigate('/app-evm')}>
          Launch App
        </button>
      }
    >
      <div className="mcp-page">
        <div className="mcp-page__container">
          {/* Header */}
          <div className="mcp-page__header">
            <h1 className="mcp-page__title">
              FundTracer <span className="mcp-page__title-accent">MCP</span> Server
            </h1>
            <p className="mcp-page__subtitle">
              Let AI agents analyze blockchain wallets, detect sybil clusters, trace fund flows, and more.
            </p>
          </div>

          {/* Key Management */}
          <section className="mcp-card">
            <h2 className="mcp-card__title">Your MCP API Keys</h2>

            {error && (
              <div className="mcp-error">
                {error}
              </div>
            )}

            <div className="mcp-generate-row">
              <input
                type="text"
                placeholder="Key name (e.g., Claude Desktop)"
                value={keyName}
                onChange={e => setKeyName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                maxLength={100}
                className="mcp-input"
              />
              <button
                onClick={handleGenerate}
                disabled={creating || !keyName.trim()}
                className="mcp-btn mcp-btn--primary"
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
                  <button
                    onClick={() => handleCopyKey(generatedKey)}
                    className="mcp-btn mcp-btn--copy"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {loadingKeys ? (
              <p className="mcp-empty">Loading keys...</p>
            ) : keys.length === 0 ? (
              <p className="mcp-empty">No MCP API keys yet. Generate one above.</p>
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
                        <span className="mcp-key-item__requests">
                          {k.requests} requests
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(k.id === k.key ? k.id : (k.key || k.id))}
                      className="mcp-btn mcp-btn--danger"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Setup Instructions */}
          <section className="mcp-card">
            <h2 className="mcp-card__title">Setup Instructions</h2>

            <div className="mcp-instruction">
            <h3 className="mcp-instruction__title">Option A: stdio (npx — auto-downloads, needs Node.js)</h3>
            <p className="mcp-instruction__desc">
              Works in Claude Desktop, Claude Code, Cursor, and any MCP client with stdio transport.
              Add to your client's MCP server config:
            </p>
            <pre className="mcp-code-block">{`{
  "mcpServers": {
    "fundtracer": {
      "command": "npx",
      "args": ["-y", "@fundtracer/server", "fundtracer-mcp"],
      "env": {
        "FUNDTRACER_MCP_API_KEY": "YOUR_FT_MCP_KEY"
      }
    }
  }
}`}</pre>
          </div>

          <div className="mcp-instruction">
            <h3 className="mcp-instruction__title">Option B: HTTP (zero install — direct API calls)</h3>
            <p className="mcp-instruction__desc">
              No package needed. Point your MCP client directly at the live API:
            </p>
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
            <p className="mcp-instruction__desc" style={{ marginTop: 12 }}>
              Or call directly with curl:
            </p>
            <pre className="mcp-code-block">{`# List available tools
curl https://api.fundtracer.xyz/api/mcp/tools

# Analyze a wallet
curl -X POST https://api.fundtracer.xyz/api/mcp/tools/analyze_wallet \\
  -H "Authorization: Bearer ft_mcp_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","chainId":"ethereum"}'`}</pre>
          </div>
          </section>

          {/* Tools Reference */}
          <section className="mcp-card">
            <h2 className="mcp-card__title">Available Tools</h2>
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
          </section>
        </div>
      </div>
    </LandingLayout>
  );
}

export default McpPage;
