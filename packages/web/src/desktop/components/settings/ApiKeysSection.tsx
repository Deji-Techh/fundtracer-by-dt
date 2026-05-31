import { useState, useEffect } from 'react';
import { listApiKeys, createApiKey, deleteApiKey, ApiKeyData } from '../../api/keys';
import { useNotify } from '../../contexts/ToastContext';

function maskKey(key: string): string {
  const replaced = key.replace(/(ft_(?:live|test|mcp)_).*(_[a-z0-9]{4})$/, '$1••••••••••••$2');
  // If the regex didn't match (unexpected key format), manually mask the middle
  if (replaced === key && key.length > 16) {
    return key.slice(0, 8) + '••••••••••••' + key.slice(-4);
  }
  return replaced;
}

function formatDate(ts: number | string | null | undefined): string {
  if (!ts) return 'Never';
  const d = typeof ts === 'string' ? new Date(ts) : new Date(ts);
  if (isNaN(d.getTime())) return 'Never';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'test' | 'live' | 'mcp'>('test');
  const [creating, setCreating] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const notify = useNotify();

  const loadKeys = async () => {
    try {
      setLoading(true);
      const data = await listApiKeys();
      setKeys(data.keys || []);
    } catch {
      notify.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadKeys(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createApiKey(newName.trim(), newType);
      setNewName('');
      notify.success('API key created');
      await loadKeys();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteApiKey(id);
      setKeys(prev => prev.filter(k => k.id !== id));
      notify.success('API key deleted');
    } catch {
      notify.error('Failed to delete key');
    }
  };

  const handleCopy = async (key: string, id: string) => {
    try {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      await writeText(key);
    } catch {
      try {
        await navigator.clipboard.writeText(key);
      } catch {
        notify.error('Failed to copy');
        return;
      }
    }
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    notify.success('API key copied');
  };

  const toggleShowKey = (id: string) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{ maxWidth: 660 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', marginBottom: 16, fontFamily: 'var(--font-sans)' }}>
        API Keys
      </h2>

      {/* Create new key */}
      <div style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--hairline)',
        padding: 16,
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
          Create New API Key
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Key name (e.g., Production)"
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            style={{
              flex: 1,
              minWidth: 180,
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--card-border)',
              background: 'var(--bg)',
              color: 'var(--fg)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              outline: 'none',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
          />
          <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', overflow: 'hidden' }}>
            <button
              onClick={() => setNewType('test')}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: newType === 'test' ? 'var(--accent)' : 'transparent',
                color: newType === 'test' ? '#000' : 'var(--fg-tertiary)',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
              }}
            >
              Test
            </button>
            <button
              onClick={() => setNewType('live')}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: newType === 'live' ? 'var(--accent)' : 'transparent',
                color: newType === 'live' ? '#000' : 'var(--fg-tertiary)',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
              }}
            >
              Live
            </button>
            <button
              onClick={() => setNewType('mcp')}
              style={{
                padding: '8px 14px',
                border: 'none',
                borderLeft: '1px solid var(--card-border)',
                background: newType === 'mcp' ? 'var(--accent)' : 'transparent',
                color: newType === 'mcp' ? '#000' : 'var(--fg-tertiary)',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
              }}
            >
              MCP
            </button>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: newName.trim() ? '#00cc6a' : 'var(--hover-overlay)',
              color: newName.trim() ? '#000' : 'var(--fg-tertiary)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              cursor: newName.trim() ? 'pointer' : 'default',
              whiteSpace: 'nowrap',
            }}
          >
            {creating ? 'Creating...' : 'Create Key'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)' }}>
            {newType === 'test'
              ? 'Test keys are for development only and do not count against rate limits.'
              : newType === 'mcp'
              ? 'MCP keys are for AI agent tools (Claude Code, Cursor, etc.). Scope-restricted to MCP endpoints only.'
              : 'Live keys count against your rate limits.'}
          </span>
        </div>
      </div>

      {/* Keys list */}
      {loading ? (
        <div style={{ color: 'var(--fg-tertiary)', fontSize: 13, fontFamily: 'var(--font-sans)', padding: 12 }}>
          Loading...
        </div>
      ) : keys.length === 0 ? (
        <div style={{ color: 'var(--fg-tertiary)', fontSize: 13, fontFamily: 'var(--font-sans)', padding: 12 }}>
          No API keys yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {keys.map(key => (
            <div key={key.id} style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--hairline)',
              padding: '16px',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-sans)' }}>
                    {key.name}
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: key.type === 'live' ? 'rgba(0,230,122,0.1)' : key.type === 'mcp' ? 'rgba(0,180,255,0.1)' : 'var(--hover-overlay)',
                    color: key.type === 'live' ? 'var(--accent)' : key.type === 'mcp' ? '#00b4ff' : 'var(--fg-tertiary)',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}>
                    {key.type}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(key.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--fg-tertiary)',
                    fontSize: 12,
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--destructive)'; e.currentTarget.style.background = 'var(--hover-overlay)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  Delete
                </button>
              </div>

              {/* Key value */}
              {key.key && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg)',
                  border: '1px solid var(--card-border)',
                  marginBottom: 10,
                }}>
                  <code style={{
                    flex: 1,
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--fg)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    userSelect: 'all',
                  }}>
                    {showKey[key.id] ? key.key : maskKey(key.key)}
                  </code>
                  <button
                    onClick={() => toggleShowKey(key.id)}
                    title={showKey[key.id] ? 'Hide key' : 'Show key'}
                    style={{
                      background: 'none', border: 'none', color: 'var(--fg-tertiary)',
                      cursor: 'pointer', padding: 4, display: 'flex',
                    }}
                  >
                    {showKey[key.id] ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleCopy(key.key!, key.id)}
                    title="Copy key"
                    style={{
                      background: 'none', border: 'none', color: copied === key.id ? 'var(--accent)' : 'var(--fg-tertiary)',
                      cursor: 'pointer', padding: 4, display: 'flex',
                    }}
                  >
                    {copied === key.id ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    )}
                  </button>
                </div>
              )}

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)', marginBottom: 2 }}>
                    Created
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-secondary)', fontFamily: 'var(--font-sans)' }}>
                    {formatDate(key.createdAt)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)', marginBottom: 2 }}>
                    Last Used
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-secondary)', fontFamily: 'var(--font-sans)' }}>
                    {formatDate(key.lastUsed)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)', marginBottom: 2 }}>
                    Requests
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {(key.requests ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
