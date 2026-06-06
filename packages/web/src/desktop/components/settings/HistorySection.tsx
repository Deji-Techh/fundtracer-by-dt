import { useState, useEffect } from 'react';
import { getHistoryCached, clearHistory, removeHistory, onHistoryChange, syncHistory, getLastSync } from '../../stores/history';
import { getAuthToken } from '../../api/client';
import type { HistoryEntry } from '../../types';

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatEth(eth: number | undefined): string {
  if (eth === undefined || eth === null) return '';
  if (eth > 1000) return `${(eth / 1000).toFixed(1)}K ETH`;
  return `${eth.toFixed(2)} ETH`;
}

export function HistorySection() {
  const [items, setItems] = useState<HistoryEntry[]>(() => getHistoryCached());
  const [filter, setFilter] = useState('');
  const [syncing, setSyncing] = useState(false);
  const authenticated = !!getAuthToken();

  useEffect(() => {
    const unsub = onHistoryChange(() => { setItems(getHistoryCached()); });
    return unsub;
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await syncHistory();
    setItems(getHistoryCached());
    setSyncing(false);
  };

  const handleClear = async () => {
    await clearHistory();
    setItems([]);
  };

  const handleRemove = async (item: HistoryEntry) => {
    await removeHistory(item.address, item.chain);
    setItems(getHistoryCached());
  };

  const filtered = filter
    ? items.filter(i =>
        i.address.toLowerCase().includes(filter.toLowerCase()) ||
        i.chain.includes(filter.toLowerCase()) ||
        (i.label && i.label.toLowerCase().includes(filter.toLowerCase())),
      )
    : items;

  const lastSync = getLastSync();

  return (
    <div style={{ maxWidth: 660 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-sans)', margin: 0 }}>
          Scan History
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {authenticated && (
            <button onClick={handleSync} disabled={syncing}
              style={{
                padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
                background: 'transparent', color: 'var(--fg-tertiary)', fontSize: 11, fontFamily: 'var(--font-sans)', cursor: 'pointer',
              }}>
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          )}
          {items.length > 0 && (
            <button onClick={handleClear}
              style={{
                padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
                background: 'transparent', color: 'var(--fg-tertiary)', fontSize: 11, fontFamily: 'var(--font-sans)', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--destructive)'; e.currentTarget.style.borderColor = 'var(--destructive)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-tertiary)'; e.currentTarget.style.borderColor = 'var(--card-border)'; }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Sync status */}
      <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
        {authenticated ? (
          lastSync > 0
            ? `Last synced ${timeAgo(lastSync)} — auto-syncs every 60s`
            : 'Syncing with server...'
        ) : (
          'Sign in to sync history across devices'
        )}
      </div>

      {/* Filter */}
      <input
        type="text" value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter by address, chain, or label..."
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--card-border)', background: 'var(--bg)',
          color: 'var(--fg)', fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none',
          marginBottom: 12,
        }}
      />

      {filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
          {items.length === 0
            ? 'No scan history yet. Analyze a wallet to start building your history.'
            : 'No matches found.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((item, i) => (
            <div key={`${item.address}-${item.chain}-${i}`} style={{
              padding: '12px 14px', borderRadius: 'var(--radius-lg)', background: 'var(--card)',
              border: '1px solid var(--hairline)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.address}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                      {item.chain}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase' }}>
                      {item.type}
                    </span>
                    {item.riskLevel && (
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 'var(--radius-full)',
                        background: item.riskLevel === 'high' ? 'rgba(255,69,58,0.1)' : item.riskLevel === 'medium' ? 'rgba(255,214,0,0.1)' : 'var(--accent-soft)',
                        color: item.riskLevel === 'high' ? 'var(--destructive)' : item.riskLevel === 'medium' ? '#ffd600' : 'var(--accent)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {item.riskLevel.toUpperCase()}
                      </span>
                    )}
                    {item.label && (
                      <span style={{ fontSize: 10, color: 'var(--fg-secondary)', fontFamily: 'var(--font-sans)' }}>
                        {item.label}
                      </span>
                    )}
                  </div>
                  {/* Stats row */}
                  {(item.totalTransactions !== undefined || item.totalValueSentEth !== undefined) && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      {item.totalTransactions !== undefined && (
                        <span style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)' }}>
                          {item.totalTransactions.toLocaleString()}{item.transactionHistoryLimited ? '+' : ''} txs
                        </span>
                      )}
                      {item.totalValueSentEth !== undefined && item.totalValueSentEth > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)' }}>
                          sent {formatEth(item.totalValueSentEth)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {timeAgo(item.timestamp)}
                  </div>
                  <button
                    onClick={() => handleRemove(item)}
                    title="Remove"
                    style={{
                      background: 'none', border: 'none', color: 'var(--fg-tertiary)', cursor: 'pointer',
                      padding: 2, fontSize: 14, lineHeight: '14px', opacity: 0.5,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--destructive)'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--fg-tertiary)'; }}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
