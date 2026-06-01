import { useState, useEffect, useCallback } from 'react';
import {
  getPolymarketTrending,
  getPolymarketSpikes,
  getPolymarketMovers,
  getPolymarketMarkets,
  PolymarketMarket,
  VolumeSpike,
  PriceMover,
} from '../../api';
import './PolymarketView.css';

type ViewMode = 'trending' | 'spikes' | 'movers' | 'all' | 'search';

const MODES: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: 'trending', label: 'Trending', icon: <TrendingIcon /> },
  { id: 'spikes', label: 'Spikes', icon: <SpikeIcon /> },
  { id: 'movers', label: 'Movers', icon: <MoversIcon /> },
  { id: 'all', label: 'All', icon: <GridIcon /> },
  { id: 'search', label: 'Search', icon: <SearchIcon /> },
];

export function PolymarketView() {
  const [mode, setMode] = useState<ViewMode>('trending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [all, setAll] = useState<PolymarketMarket[]>([]);
  const [trending, setTrending] = useState<PolymarketMarket[]>([]);
  const [spikes, setSpikes] = useState<VolumeSpike[]>([]);
  const [movers, setMovers] = useState<PriceMover[]>([]);
  const [searchResults, setSearchResults] = useState<PolymarketMarket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [selected, setSelected] = useState<PolymarketMarket | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      switch (mode) {
        case 'trending': {
          const r = await getPolymarketTrending(20);
          if (r.success) setTrending(r.data);
          break;
        }
        case 'spikes': {
          const r = await getPolymarketSpikes(2.0, 10000);
          if (r.success) setSpikes(r.data);
          break;
        }
        case 'movers': {
          const r = await getPolymarketMovers(0.05);
          if (r.success) setMovers(r.data);
          break;
        }
        case 'all': {
          const r = await getPolymarketMarkets({ limit: 50 });
          if (r.success) setAll(r.data);
          break;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'search') load();
  }, [mode, load]);

  useEffect(() => {
    const id = setInterval(() => { if (mode !== 'search') load(true); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [mode, load]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true); setError(null);
    try {
      const r = await getPolymarketMarkets({ q: searchQuery, limit: 20 });
      if (r.success) setSearchResults(r.data);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally { setLoading(false); }
  };

  const openMarket = (m: PolymarketMarket) => { setSelected(m); setPanelOpen(true); };
  const closePanel = () => setPanelOpen(false);

  return (
    <div className="pm-view" style={{ padding: 28, maxWidth: 1240, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', margin: '0 0 4px' }}>Polymarket</h2>
          <p style={{ fontSize: 12, color: 'var(--fg-tertiary)', margin: 0 }}>
            Track prediction markets, trending events, and price movements in real-time
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          title="Refresh"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 'var(--radius-md)',
            border: '1px solid var(--card-border)', background: 'var(--card)',
            color: 'var(--fg-secondary)', cursor: refreshing ? 'default' : 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={refreshing ? { animation: 'pm-spin 1s linear infinite' } : undefined}>
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>
          </svg>
        </button>
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)', padding: 4, overflowX: 'auto', overflowY: 'hidden' }}>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setSearchResults([]); setSearchQuery(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', border: 'none', borderRadius: 'var(--radius-md)',
              background: mode === m.id ? 'var(--hover-overlay)' : 'transparent',
              color: mode === m.id ? 'var(--fg)' : 'var(--fg-tertiary)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.15s ease', whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {m.icon}
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Search input */}
      {mode === 'search' && (
        <div style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Search by question or topic..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--card-border)', background: 'var(--card)',
              color: 'var(--fg)', fontSize: 13, outline: 'none',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            style={{
              padding: '10px 18px', borderRadius: 'var(--radius-lg)', border: 'none',
              background: loading || !searchQuery.trim() ? 'var(--bg-secondary)' : 'var(--accent)',
              color: loading || !searchQuery.trim() ? 'var(--fg-tertiary)' : '#000',
              fontSize: 13, fontWeight: 600, cursor: loading || !searchQuery.trim() ? 'default' : 'pointer',
            }}
          >
            Search
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--card)', border: '1px solid var(--destructive)', color: 'var(--destructive)', fontSize: 13, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Error Loading Data</div>
          <div style={{ color: 'var(--fg-secondary)', marginBottom: 10 }}>{error}</div>
          <button onClick={() => load(false)} style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', background: 'var(--bg-secondary)', color: 'var(--fg)', fontSize: 12, cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="markets-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="pm-card pm-skeleton-card">
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div className="pm-skeleton" style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
                <div className="pm-skeleton" style={{ flex: 1, height: 20, borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="pm-skeleton" style={{ height: 36, borderRadius: 'var(--radius-md)' }} />
                <div className="pm-skeleton" style={{ height: 36, borderRadius: 'var(--radius-md)' }} />
              </div>
              <div style={{ display: 'flex', gap: 16, paddingTop: 10, borderTop: '1px solid var(--hairline)', marginTop: 4 }}>
                <div className="pm-skeleton" style={{ flex: 1, height: 28, borderRadius: 4 }} />
                <div className="pm-skeleton" style={{ flex: 1, height: 28, borderRadius: 4 }} />
                <div className="pm-skeleton" style={{ flex: 1, height: 28, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="markets-grid" style={{ paddingBottom: 32 }}>
          {mode === 'trending' && trending.map(m => <MarketCard key={m.id} market={m} onClick={() => openMarket(m)} />)}
          {mode === 'spikes' && spikes.filter(s => s?.market).map(s => <MarketCard key={s.market.id} market={s.market} extra={<SpikeBadge ratio={s.spikeRatio} />} onClick={() => openMarket(s.market)} />)}
          {mode === 'movers' && movers.filter(mv => mv?.market).map(mv => <MarketCard key={mv.market.id} market={mv.market} extra={<MoverBadge change={mv.priceChange} prev={mv.previousPrice} cur={mv.currentPrice} />} onClick={() => openMarket(mv.market)} />)}
          {mode === 'all' && all.map(m => <MarketCard key={m.id} market={m} onClick={() => openMarket(m)} />)}
          {mode === 'search' && searchResults.map(m => <MarketCard key={m.id} market={m} onClick={() => openMarket(m)} />)}

          {/* Empty states */}
          {mode === 'trending' && trending.length === 0 && <Empty label="No trending markets found" />}
          {mode === 'spikes' && spikes.length === 0 && <Empty label="No volume spikes detected" />}
          {mode === 'movers' && movers.length === 0 && <Empty label="No significant price movements" />}
          {mode === 'all' && all.length === 0 && <Empty label="No markets found" />}
          {mode === 'search' && searchQuery && searchResults.length === 0 && <Empty label={`No markets found for "${searchQuery}"`} />}
        </div>
      )}

      {/* Slide-out panel */}
      {panelOpen && selected && (
        <>
          <div className="pm-backdrop" onClick={closePanel} />
          <div className="pm-panel">
            <DetailPanel market={selected} onClose={closePanel} />
          </div>
        </>
      )}
    </div>
  );
}

function MarketCard({ market, extra, onClick }: { market: PolymarketMarket; extra?: React.ReactNode; onClick: () => void }) {
  const primaryPrice = market.outcomePrices?.[0] ? parseFloat(String(market.outcomePrices[0])) : 0;
  const isYes = primaryPrice >= 0.5;

  return (
    <div className="pm-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0, overflow: 'hidden',
          background: market.image ? 'transparent' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 14,
        }}>
          {market.image ? <img src={market.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (market.question?.charAt(0).toUpperCase() || '?')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            borderLeft: `3px solid ${isYes ? 'var(--accent)' : 'var(--destructive)'}`,
            paddingLeft: 8,
          }}>
            {market.question}
          </div>
        </div>
      </div>

      {/* Outcomes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        {market.outcomes?.slice(0, 2).map((outcome, i) => {
          const price = parseFloat(String(market.outcomePrices?.[i] || '0'));
          const pct = (price * 100).toFixed(1);
          const isOutcomeYes = i === 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)', minWidth: 36 }}>{outcome}</span>
              <span style={{ fontSize: 13, fontWeight: 700, minWidth: 48, fontFamily: 'var(--font-mono)', color: isOutcomeYes ? 'var(--accent)' : 'var(--destructive)' }}>{pct}%</span>
              <div style={{ flex: 1, height: 5, background: 'var(--hairline)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${price * 100}%`, background: isOutcomeYes ? 'var(--accent)' : 'var(--destructive)', borderRadius: 'var(--radius-full)', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, paddingTop: 10, borderTop: '1px solid var(--hairline)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 10, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>24h Vol</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>{fmtCurrency(market.volume24hr)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 10, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Liquidity</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>{fmtCurrency(market.liquidity)}</span>
        </div>
        {market.endDate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 10, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Ends</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{new Date(market.endDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Extra badge */}
      {extra && <div style={{ marginTop: 8 }}>{extra}</div>}

      {/* Tags */}
      {market.tags && market.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {market.tags.slice(0, 3).map((t, i) => (
            <span key={i} style={{ padding: '2px 8px', background: 'var(--hover-overlay)', borderRadius: 'var(--radius-full)', fontSize: 10, color: 'var(--fg-secondary)' }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function SpikeBadge({ ratio }: { ratio: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: 'var(--radius-md)', fontSize: 11 }}>
      <span style={{ fontWeight: 700, color: '#818cf8' }}>{ratio.toFixed(1)}x</span>
      <span style={{ color: 'var(--fg-tertiary)' }}>above avg</span>
    </div>
  );
}

function MoverBadge({ change, prev, cur }: { change: number; prev: number; cur: number }) {
  const up = change >= 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
      <span style={{
        padding: '2px 8px', borderRadius: 'var(--radius-md)', fontWeight: 600,
        background: up ? 'rgba(0,230,122,0.1)' : 'rgba(255,69,58,0.1)',
        color: up ? 'var(--accent)' : 'var(--destructive)',
      }}>
        {up ? '+' : ''}{(change * 100).toFixed(1)}%
      </span>
      <span style={{ color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)' }}>
        {fmtPrice(prev)} → {fmtPrice(cur)}
      </span>
    </div>
  );
}

function DetailPanel({ market, onClose }: { market: PolymarketMarket; onClose: () => void }) {
  const primaryPrice = market.outcomePrices?.[0] ? parseFloat(String(market.outcomePrices[0])) : 0;
  const openOnPolymarket = () => {
    const cleanSlug = (market.slug || '').replace(/\.\.(yes|no)$/i, '');
    window.open(`https://polymarket.com/event/${cleanSlug}?outcomeIndex=0`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Panel header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: 18, borderBottom: '1px solid var(--hairline)', background: 'var(--bg-secondary)' }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: 0, lineHeight: 1.4 }}>{market.question}</h3>
          {market.slug && <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)', display: 'block', marginTop: 4 }}>{market.slug}</span>}
        </div>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--fg-secondary)', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Panel body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {market.image && (
          <div style={{ width: '100%', height: 180, borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
            <img src={market.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        {market.description && <p style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.6, margin: 0 }}>{market.description}</p>}

        {/* Outcomes */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Outcome Probabilities</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {market.outcomes?.map((outcome, i) => {
              const price = parseFloat(String(market.outcomePrices?.[i] || '0'));
              const isPrimary = i === 0;
              return (
                <div key={i} style={{ padding: 10, borderRadius: 'var(--radius-md)', background: isPrimary ? 'rgba(0,230,122,0.05)' : 'var(--hover-overlay)', border: isPrimary ? '1px solid var(--accent)' : '1px solid var(--hairline)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{outcome}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: isPrimary ? 'var(--accent)' : 'var(--destructive)' }}>{(price * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--hairline)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${price * 100}%`, background: isPrimary ? 'var(--accent)' : 'var(--destructive)', borderRadius: 'var(--radius-full)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Market Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatCard label="24h Volume" value={fmtCurrency(market.volume24hr)} />
            <StatCard label="Total Volume" value={fmtCurrency(market.volume)} />
            <StatCard label="Liquidity" value={fmtCurrency(market.liquidity)} />
            <StatCard label="End Date" value={market.endDate ? new Date(market.endDate).toLocaleDateString() : '-'} />
          </div>
        </div>

        {/* Tags */}
        {market.tags && market.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {market.tags.map((t, i) => (
              <span key={i} style={{ padding: '4px 10px', background: 'var(--hover-overlay)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-full)', fontSize: 11, color: 'var(--fg-secondary)' }}>{t}</span>
            ))}
          </div>
        )}

        {/* Trade button */}
        <button onClick={openOnPolymarket}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: 14, border: 'none', borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 'auto',
          }}>
          Trade on Polymarket
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--hover-overlay)', border: '1px solid var(--hairline)' }}>
      <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{value}</div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{ gridColumn: '1 / -1', padding: 60, textAlign: 'center', color: 'var(--fg-tertiary)' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.4 }}>
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
      </svg>
      <p style={{ fontSize: 13, margin: 0 }}>{label}</p>
    </div>
  );
}

function fmtCurrency(v?: number): string {
  if (v === undefined || v === null) return '-';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function fmtPrice(p?: string | number): string {
  if (p === undefined || p === null) return '-';
  const n = typeof p === 'string' ? parseFloat(p) : p;
  if (isNaN(n)) return '-';
  return `${(n * 100).toFixed(1)}%`;
}

/* ---- inline SVG icons ---- */

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>
    </svg>
  );
}

function SpikeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  );
}

function MoversIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}

export default PolymarketView;
