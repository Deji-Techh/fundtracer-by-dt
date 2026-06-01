import { useState, useEffect, useRef } from 'react';
import { isTauri, tauriInvoke } from '../../lib/tauri-commands';
import { apiRequest } from '../../api/client';
import { useNotify } from '../../contexts/ToastContext';
import { Bell, BellOff, Plus, Trash2, Pause, Play, ChevronDown, ChevronRight, ArrowDownLeft, ArrowUpRight, ExternalLink, History, GitBranch } from 'lucide-react';
import { ChainSelector } from '../common/ChainSelector';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { ChainId } from '../../types';

interface WatchConfig {
  address: string;
  chain: string;
  label?: string;
  threshold_eth?: number;
  notify_on_incoming: boolean;
  notify_on_outgoing: boolean;
  paused: boolean;
}

interface ActivityEvent {
  address: string;
  chain: string;
  txHash: string;
  from: string;
  to: string;
  valueEth: number;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
  counterparty?: string;
  tokenAddress?: string;
  tokenAmount?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
}

function formatTokenAmount(raw: string, decimals: number): string {
  if (!raw || raw === '0') return '0';
  let s = raw;
  while (s.length <= decimals) s = '0' + s;
  const intPart = s.slice(0, s.length - decimals) || '0';
  const fracPart = s.slice(s.length - decimals).replace(/0+$/, '');
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}

const MAX_ACTIVITY = 50;

const EXPLORERS: Record<string, string> = {
  ethereum: 'etherscan.io', linea: 'lineascan.build', arbitrum: 'arbiscan.io',
  base: 'basescan.org', optimism: 'optimistic.etherscan.io', polygon: 'polygonscan.com',
  bsc: 'bscscan.com',
};

const NATIVE_CURRENCY: Record<string, string> = {
  ethereum: 'ETH', linea: 'ETH', arbitrum: 'ETH', base: 'ETH', optimism: 'ETH',
  polygon: 'POL', bsc: 'BNB',
};

function formatRelative(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function explorerUrl(chain: string, txHash: string): string {
  return `https://${EXPLORERS[chain] || 'etherscan.io'}/tx/${txHash}`;
}

export function WatchtowerSection() {
  const [watched, setWatched] = useState<WatchConfig[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState<ChainId>('ethereum');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const activityLoaded = useRef(false);
  const notify = useNotify();
  const isMobile = useIsMobile();

  useEffect(() => { loadWatched(); }, []);

  // Load historical activity from server on mount
  useEffect(() => {
    if (activityLoaded.current) return;
    activityLoaded.current = true;
    apiRequest<{ success: boolean; events: ActivityEvent[] }>('/api/watchtower/activity?limit=50')
      .then(res => {
        if (res.events?.length) setActivity(res.events);
      })
      .catch(() => {});
  }, []);

  // Listen for live watchtower events from Tauri backend
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<{ type: string; event: ActivityEvent }>('watchtower-tx', (ev) => {
        const tx = ev.payload?.event;
        if (tx) {
          setActivity(prev => [tx, ...prev].slice(0, MAX_ACTIVITY));
        }
      }).then(fn => { unlisten = fn; }).catch(() => {});
    }).catch(() => {});
    return () => { unlisten?.(); };
  }, []);

  // Poll activity API as fallback (ensures UI stays current even if WS event path lags)
  useEffect(() => {
    const poll = () => {
      apiRequest<{ success: boolean; events: ActivityEvent[] }>('/api/watchtower/activity?limit=50')
        .then(res => {
          if (res.events?.length) setActivity(res.events);
        })
        .catch(() => {});
    };
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadWatched = async () => {
    if (!isTauri()) return;
    try {
      const list = await tauriInvoke<WatchConfig[]>('watchtower_list');
      setWatched(list);
    } catch { /* not available */ }
  };

  const handleAdd = async () => {
    const addr = address.trim();
    if (!addr) { notify.error('Enter a wallet address'); return; }
    setLoading(true);
    try {
      await tauriInvoke('watchtower_add', {
        address: addr, chain, label: label || null,
        thresholdEth: null, notifyOnIncoming: true, notifyOnOutgoing: true,
      });
      apiRequest('/api/watchtower/add', 'POST', { address: addr, chain }).catch(() => {});
      setAddress(''); setLabel('');
      notify.success(`Now watching ${addr.slice(0, 10)}...`);
      loadWatched();
    } catch { notify.error('Failed to add to watchtower'); }
    finally { setLoading(false); }
  };

  const handleRemove = async (addr: string, chainId: string) => {
    try {
      await tauriInvoke('watchtower_remove', { address: addr, chain: chainId });
      apiRequest('/api/watchtower/remove', 'POST', { address: addr, chain: chainId }).catch(() => {});
      notify.info('Removed from watchtower');
      loadWatched();
    } catch { notify.error('Failed to remove'); }
  };

  const handleTogglePause = async (w: WatchConfig) => {
    try {
      await tauriInvoke('watchtower_update', { address: w.address, chain: w.chain, paused: !w.paused });
      loadWatched();
    } catch { notify.error('Failed to update'); }
  };

  const toggleExpanded = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Group activity events by watched address (match on lowercase)
  const activityByWallet = (w: WatchConfig): ActivityEvent[] => {
    const addrLower = w.address.toLowerCase();
    return activity.filter(ev => ev.address.toLowerCase() === addrLower && ev.chain === w.chain);
  };

  const totalActivity = watched.reduce((sum, w) => sum + activityByWallet(w).length, 0);

  return (
    <div style={{ paddingBottom: isMobile ? 8 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Bell size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Watchtower</span>
      </div>
      <p style={{ fontSize: isMobile ? 12 : 12, color: 'var(--fg-tertiary)', marginBottom: isMobile ? 14 : 16, lineHeight: 1.45 }}>
        24/7 wallet monitoring. Get native desktop notifications when watched wallets have new activity — even when the app is minimized to tray.
      </p>

      {/* Add form */}
      <div style={{
        padding: isMobile ? 10 : '14px 16px', borderRadius: isMobile ? 14 : 'var(--radius-lg)', background: 'var(--card)',
        border: '1px solid var(--hairline)', marginBottom: 16,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(92px, 104px)' : 'repeat(4, auto)',
          gap: isMobile ? 8 : 8,
          alignItems: 'stretch',
        }}>
          <input type="text" value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="0x... wallet to watch"
            spellCheck={false}
            style={{ ...inputStyle, minWidth: 0, width: '100%', maxWidth: isMobile ? 'none' : undefined, gridColumn: isMobile ? '1 / 3' : undefined }}
          />
          <ChainSelector value={chain} onChange={setChain} compact={isMobile} style={{ gridColumn: isMobile ? '1 / 2' : undefined, minWidth: 0 }} />
          <input type="text" value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Label (optional)"
            style={{ ...inputStyle, minWidth: 0, width: '100%', maxWidth: isMobile ? 'none' : 140, gridColumn: isMobile ? '1 / 2' : undefined }}
          />
          <button type="button" onClick={handleAdd} disabled={loading}
            style={{
              padding: isMobile ? '0 12px' : '8px 16px', borderRadius: isMobile ? 12 : 'var(--radius-md)', border: 'none',
              background: 'var(--accent)', color: '#000', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
              minHeight: isMobile ? 44 : undefined,
              gridColumn: isMobile ? '2 / 3' : undefined,
              gridRow: isMobile ? '2 / 4' : undefined,
            }}>
            <Plus size={14} style={{ display: 'inline' }} /> Watch
          </button>
        </div>
      </div>

      {/* Tree: watched wallets with nested activity */}
      {watched.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 12 }}>
          <BellOff size={24} style={{ marginBottom: 8, opacity: 0.3 }} />
          <div>No wallets being watched. Add one above to start monitoring.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Summary header */}
          {totalActivity > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0',
              fontSize: 11, color: 'var(--fg-tertiary)',
            }}>
              <History size={13} />
              <span>{totalActivity} transaction{totalActivity !== 1 ? 's' : ''} tracked across {watched.length} wallet{watched.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          {watched.map((w, i) => {
            const key = `${w.chain}:${w.address}`;
            const isExpanded = expanded.has(key);
            const walletActivity = activityByWallet(w);
            const hasActivity = walletActivity.length > 0;

            return (
              <div key={i} style={{
                borderRadius: 'var(--radius-md)', background: 'var(--card)',
                border: '1px solid var(--hairline)', overflow: 'hidden',
              }}>
                {/* ── Wallet row (parent node) ── */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => toggleExpanded(key)}
                        style={{ padding: 0, border: 'none', background: 'transparent', color: 'var(--fg-tertiary)', cursor: 'pointer', display: 'flex' }}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg)', fontWeight: 600 }}>
                        {w.label || `${w.address.slice(0, 10)}...${w.address.slice(-6)}`}
                      </span>
                      <span style={{
                        fontSize: 9, padding: '2px 6px', borderRadius: 'var(--radius-full)',
                        background: w.paused ? 'rgba(255,159,10,0.15)' : 'rgba(0,230,122,0.15)',
                        color: w.paused ? '#ff9f0a' : 'var(--accent)', fontWeight: 600,
                      }}>
                        {w.paused ? 'PAUSED' : 'ACTIVE'}
                      </span>
                      {hasActivity && (
                        <span style={{
                          fontSize: 9, padding: '2px 6px', borderRadius: 'var(--radius-full)',
                          background: 'rgba(100,140,255,0.12)', color: '#648cff', fontWeight: 600,
                        }}>
                          {walletActivity.length} tx
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 2, marginLeft: 22 }}>
                      {w.chain.toUpperCase()}
                      {w.threshold_eth ? ` • Min ${w.threshold_eth} ETH` : ''}
                      {w.notify_on_incoming && w.notify_on_outgoing ? ' • In + Out' : w.notify_on_incoming ? ' • In only' : w.notify_on_outgoing ? ' • Out only' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button onClick={() => handleTogglePause(w)}
                      title={w.paused ? 'Resume' : 'Pause'}
                      style={{ padding: 4, borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: w.paused ? '#ff9f0a' : 'var(--fg-tertiary)', cursor: 'pointer', display: 'flex' }}>
                      {w.paused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                    <button onClick={() => handleRemove(w.address, w.chain)}
                      style={{ padding: 4, borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--fg-tertiary)', cursor: 'pointer', display: 'flex' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* ── Expanded children: settings + activity tree ── */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--hairline)' }}>
                    {/* Settings section */}
                    <div style={{ padding: '12px 14px 12px 34px', borderBottom: hasActivity ? '1px solid var(--hairline)' : 'none' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                        Notification Filters
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                        {/* Incoming toggle */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <div
                            onClick={() => tauriInvoke('watchtower_update', { address: w.address, chain: w.chain, notifyOnIncoming: !w.notify_on_incoming }).then(loadWatched)}
                            style={{
                              width: 34, height: 20, borderRadius: 'var(--radius-full)',
                              background: w.notify_on_incoming ? 'var(--accent)' : 'var(--card-border)',
                              position: 'relative', transition: 'background 0.15s', flexShrink: 0,
                            }}>
                            <div style={{
                              position: 'absolute', top: 2, left: w.notify_on_incoming ? 16 : 2,
                              width: 16, height: 16, borderRadius: '50%',
                              background: w.notify_on_incoming ? '#000' : 'var(--fg-tertiary)',
                              transition: 'left 0.15s',
                            }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--fg)', fontWeight: 500 }}>Incoming</div>
                            <div style={{ fontSize: 9, color: 'var(--fg-tertiary)' }}>Notify on received</div>
                          </div>
                        </label>

                        {/* Outgoing toggle */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <div
                            onClick={() => tauriInvoke('watchtower_update', { address: w.address, chain: w.chain, notifyOnOutgoing: !w.notify_on_outgoing }).then(loadWatched)}
                            style={{
                              width: 34, height: 20, borderRadius: 'var(--radius-full)',
                              background: w.notify_on_outgoing ? 'var(--accent)' : 'var(--card-border)',
                              position: 'relative', transition: 'background 0.15s', flexShrink: 0,
                            }}>
                            <div style={{
                              position: 'absolute', top: 2, left: w.notify_on_outgoing ? 16 : 2,
                              width: 16, height: 16, borderRadius: '50%',
                              background: w.notify_on_outgoing ? '#000' : 'var(--fg-tertiary)',
                              transition: 'left 0.15s',
                            }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--fg)', fontWeight: 500 }}>Outgoing</div>
                            <div style={{ fontSize: 9, color: 'var(--fg-tertiary)' }}>Notify on sent</div>
                          </div>
                        </label>

                        {/* Min ETH threshold */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 34, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--fg-tertiary)' }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--fg)', fontWeight: 500, marginBottom: 1 }}>Min ETH</div>
                            <input type="number" step="0.001" min="0" placeholder="Any amount"
                              value={w.threshold_eth ?? ''}
                              onChange={e => {
                                const v = e.target.value ? parseFloat(e.target.value) : null;
                                tauriInvoke('watchtower_update', { address: w.address, chain: w.chain, thresholdEth: v }).then(loadWatched);
                              }}
                              style={{
                                width: 88, padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--card-border)', background: 'var(--bg-secondary)',
                                color: 'var(--fg)', fontSize: 11, fontFamily: 'var(--font-mono)', outline: 'none',
                              }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Activity tree under this wallet */}
                    {hasActivity && (
                      <div style={{ padding: '8px 0', background: 'rgba(0,0,0,0.08)' }}>
                        {/* Tree branch header */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '4px 14px 8px 28px', fontSize: 10, color: 'var(--fg-tertiary)',
                        }}>
                          <GitBranch size={12} />
                          <span>Transaction history ({walletActivity.length})</span>
                        </div>

                        {/* Tree lines + transaction items */}
                        <div style={{ position: 'relative' }}>
                          {walletActivity.map((ev, j) => {
                            const isLast = j === walletActivity.length - 1;
                            const counterparty = ev.counterparty || (ev.direction === 'incoming' ? ev.from : ev.to);
                            const isIncoming = ev.direction === 'incoming';
                            const isToken = !!(ev.tokenSymbol && ev.tokenAmount);
                            const isZeroValue = isToken ? false : ev.valueEth < 0.0001;

                            return (
                              <div key={`${ev.txHash}-${j}`} style={{ position: 'relative' }}>
                                {/* Vertical tree line */}
                                {!isLast && (
                                  <div style={{
                                    position: 'absolute', left: 27, top: 0, bottom: 0, width: 1,
                                    background: 'var(--hairline)',
                                  }} />
                                )}
                                {/* Horizontal branch */}
                                <div style={{
                                  position: 'absolute', left: 27, top: 18, width: 16, height: 1,
                                  background: 'var(--hairline)',
                                }} />

                                <div style={{
                                  marginLeft: 42, marginRight: 8, marginBottom: isLast ? 0 : 2,
                                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--hairline)', background: 'var(--card)',
                                }}>
                                  {/* Row 1: direction icon + counterparty + value */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                      {isIncoming
                                        ? <ArrowDownLeft size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                        : <ArrowUpRight size={13} style={{ color: '#ff6b6b', flexShrink: 0 }} />}
                                      <span style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>
                                        {isIncoming ? 'From' : 'To'}
                                      </span>
                                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg)', wordBreak: 'break-all' }}>
                                        {counterparty}
                                      </span>
                                    </div>
                                    <span style={{
                                      fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
                                      color: isZeroValue ? 'var(--fg-tertiary)' : isIncoming ? 'var(--accent)' : '#ff6b6b',
                                      whiteSpace: 'nowrap',
                                    }}>
                                      {isToken
                                        ? `${isIncoming ? '+' : '-'}${formatTokenAmount(ev.tokenAmount!, ev.tokenDecimals ?? 18)} ${ev.tokenSymbol}`
                                        : `${isIncoming ? '+' : '-'}${ev.valueEth.toFixed(6)} ${NATIVE_CURRENCY[ev.chain] || 'ETH'}`
                                      }
                                    </span>
                                  </div>
                                  {/* Row 2: time + chain + explorer link */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, paddingLeft: 19 }}>
                                    <span style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>{formatRelative(ev.timestamp)}</span>
                                    <span style={{ color: 'var(--hairline)', fontSize: 9 }}>•</span>
                                    <span style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontWeight: 500 }}>{ev.chain.toUpperCase()}</span>
                                    <span style={{ color: 'var(--hairline)', fontSize: 9 }}>•</span>
                                    <a href={explorerUrl(ev.chain, ev.txHash)} target="_blank" rel="noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--fg-tertiary)', textDecoration: 'none' }}
                                      title="View on block explorer">
                                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9 }}>
                                        {ev.txHash.slice(0, 6)}...{ev.txHash.slice(-4)}
                                      </span>
                                      <ExternalLink size={9} />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Empty state when no activity for this wallet */}
                    {!hasActivity && (
                      <div style={{ padding: '12px 14px 12px 34px', fontSize: 11, color: 'var(--fg-tertiary)', fontStyle: 'italic' }}>
                        No transactions recorded yet. Activity will appear here as it happens.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--card-border)', background: 'var(--card)',
  color: 'var(--fg)', fontSize: 12, fontFamily: 'var(--font-mono)', outline: 'none',
};
