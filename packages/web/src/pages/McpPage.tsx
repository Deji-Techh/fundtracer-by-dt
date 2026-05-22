import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createMcpKey, listMcpKeys, deleteMcpKey } from '../api';

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

export function McpPage() {
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
      // Fallback: select the text manually
      const input = document.getElementById('generated-key-input') as HTMLInputElement;
      if (input) { input.select(); document.execCommand('copy'); }
    });
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', background: '#0a0a0a', color: '#fff',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #333', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#888' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // ---- Not authenticated ----
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a0a', color: '#fff',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: 12 }}>
            FundTracer <span style={{ color: '#a855f7' }}>MCP</span> Server
          </h1>
          <p style={{ color: '#aaa', lineHeight: 1.6, marginBottom: 32 }}>
            Connect AI assistants like Claude Desktop and Cursor directly to blockchain analysis.
            Authenticate to generate your MCP API key.
          </p>
          <button
            onClick={() => window.location.href = '/auth'}
            style={{
              padding: '14px 32px', background: '#a855f7', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 16, fontWeight: 600,
            }}
          >
            Connect with Google
          </button>
        </div>
      </div>
    );
  }

  // ---- Authenticated ----
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#fff',
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <h1 style={{ fontSize: '1.8rem', marginBottom: 8 }}>
          FundTracer <span style={{ color: '#a855f7' }}>MCP</span> Server
        </h1>
        <p style={{ color: '#aaa', marginBottom: 32 }}>
          Let AI agents analyze blockchain wallets, detect sybil clusters, trace fund flows, and more.
        </p>

        {/* Generate Key Section */}
        <section style={{
          background: '#111', borderRadius: 12, padding: 24, marginBottom: 24,
          border: '1px solid #222',
        }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Your MCP API Keys</h2>

          {error && (
            <div style={{
              background: '#3b0a0a', border: '1px solid #dc2626', borderRadius: 8,
              padding: '8px 12px', marginBottom: 16, color: '#fca5a5', fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Key name (e.g., Claude Desktop)"
              value={keyName}
              onChange={e => setKeyName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              maxLength={100}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #333',
                background: '#1a1a1a', color: '#fff', fontSize: 14, outline: 'none',
              }}
            />
            <button
              onClick={handleGenerate}
              disabled={creating || !keyName.trim()}
              style={{
                padding: '10px 24px', background: creating ? '#555' : '#a855f7',
                color: '#fff', border: 'none', borderRadius: 8, cursor: creating ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
                opacity: creating || !keyName.trim() ? 0.6 : 1,
              }}
            >
              {creating ? 'Generating...' : 'Generate Key'}
            </button>
          </div>

          {/* Show newly generated key */}
          {generatedKey && (
            <div style={{
              background: '#1a3a1a', border: '1px solid #22c55e', borderRadius: 8,
              padding: 16, marginBottom: 16,
            }}>
              <p style={{ color: '#86efac', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>
                ⚠️ Copy this key now — you won't be able to see it again!
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="generated-key-input"
                  type="text"
                  readOnly
                  value={generatedKey}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #22c55e',
                    background: '#0d2a0d', color: '#4ade80', fontSize: 13, fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => handleCopyKey(generatedKey)}
                  style={{
                    padding: '10px 16px', background: '#22c55e', color: '#000',
                    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Key list */}
          {loadingKeys ? (
            <p style={{ color: '#666', fontSize: 14 }}>Loading keys...</p>
          ) : keys.length === 0 ? (
            <p style={{ color: '#666', fontSize: 14 }}>No MCP API keys yet. Generate one above.</p>
          ) : (
            <div>
              {keys.map(k => (
                <div key={k.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: '#1a1a1a', borderRadius: 8, marginBottom: 8,
                  border: '1px solid #222',
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{k.name}</p>
                    <code style={{ fontSize: 12, color: '#888' }}>
                      {k.maskedKey || k.key?.substring(0, 15) + '...'}
                    </code>
                    <span style={{ fontSize: 12, color: '#666', marginLeft: 12 }}>
                      {k.requests} requests
                    </span>
                  </div>
                  <button
                    onClick={() => handleRevoke(k.id === k.key ? k.id : (k.key || k.id))}
                    style={{
                      padding: '6px 14px', background: 'transparent', color: '#ef4444',
                      border: '1px solid #ef4444', borderRadius: 6, cursor: 'pointer',
                      fontSize: 12, fontWeight: 500,
                    }}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Setup Instructions */}
        <section style={{
          background: '#111', borderRadius: 12, padding: 24, marginBottom: 24,
          border: '1px solid #222',
        }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Setup Instructions</h2>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', color: '#a855f7', marginBottom: 8 }}>Claude Desktop</h3>
            <p style={{ color: '#aaa', fontSize: 13, marginBottom: 8 }}>
              Add to your <code style={{ background: '#222', padding: '2px 6px', borderRadius: 4 }}>claude_desktop_config.json</code>:
            </p>
            <pre style={{
              background: '#1a1a1a', padding: 16, borderRadius: 8, fontSize: 12,
              overflowX: 'auto', border: '1px solid #222',
            }}>
{`{
  "mcpServers": {
    "fundtracer": {
      "command": "npx",
      "args": ["-y", "@fundtracer/server"],
      "env": {
        "FUNDTRACER_MCP_API_KEY": "YOUR_FT_MCP_KEY"
      }
    }
  }
}`}
            </pre>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', color: '#a855f7', marginBottom: 8 }}>Direct stdio (self-hosted)</h3>
            <pre style={{
              background: '#1a1a1a', padding: 16, borderRadius: 8, fontSize: 12,
              overflowX: 'auto', border: '1px solid #222',
            }}>
{`FUNDTRACER_MCP_API_KEY=ft_mcp_xxx npx tsx src/mcp/stdio.ts`}
            </pre>
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', color: '#a855f7', marginBottom: 8 }}>HTTP API (curl)</h3>
            <pre style={{
              background: '#1a1a1a', padding: 16, borderRadius: 8, fontSize: 12,
              overflowX: 'auto', border: '1px solid #222',
            }}>
{`# List available tools
curl https://api.fundtracer.xyz/api/mcp/tools

# Analyze a wallet
curl -X POST https://api.fundtracer.xyz/api/mcp/tools/analyze_wallet \\
  -H "Authorization: Bearer ft_mcp_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","chainId":"ethereum"}'`}
            </pre>
          </div>
        </section>

        {/* Tools Reference */}
        <section style={{
          background: '#111', borderRadius: 12, padding: 24, marginBottom: 24,
          border: '1px solid #222',
        }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Available Tools</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#888' }}>Tool</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#888' }}>Description</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#888' }}>Parameters</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS_LIST.map(t => (
                  <tr key={t.name} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <code style={{ color: '#a855f7', fontSize: 13 }}>{t.name}</code>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#ccc' }}>{t.description}</td>
                    <td style={{ padding: '10px 12px', color: '#888', fontSize: 12 }}>{t.params}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
