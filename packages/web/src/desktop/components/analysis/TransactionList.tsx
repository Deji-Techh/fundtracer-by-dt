import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, ChevronLeft, ChevronRight, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { ChainId } from '../../types';
import { useIsMobile } from '../../../hooks/useIsMobile';

const NATIVE_SYMBOL: Record<string, string> = {
  ethereum: 'ETH', base: 'ETH', arbitrum: 'ETH', optimism: 'ETH',
  polygon: 'POL', bsc: 'BNB', linea: 'ETH', solana: 'SOL',
};

function formatDestination(chain: ChainId, to?: string): string {
  if (to) return chain === 'solana' ? formatMobileAddress(to) : `${to.slice(0, 8)}...${to.slice(-5)}`;
  return chain === 'solana' ? 'Unknown' : 'Contract Creation';
}

const CATEGORY_COLORS: Record<string, string> = {
  transfer: 'rgba(0,230,122,0.12)', token_transfer: 'rgba(59,130,246,0.12)',
  contract_call: 'rgba(139,92,246,0.12)', dex_swap: 'rgba(245,158,11,0.12)',
  nft_transfer: 'rgba(236,72,153,0.12)', staking: 'rgba(6,182,212,0.12)',
  bridge: 'rgba(0,212,255,0.12)', lending: 'rgba(249,115,22,0.12)',
  contract_creation: 'rgba(99,102,241,0.12)', unknown: 'rgba(107,107,120,0.12)',
};

interface Transaction {
  hash?: string;
  txHash?: string;
  tx_hash?: string;
  from?: string;
  sender?: string;
  to?: string;
  recipient?: string;
  value?: string;
  amount?: string;
  valueInEth?: number;
  timestamp?: number;
  time?: number;
  blockTime?: number;
  status?: string;
  category?: string;
  isIncoming?: boolean;
  method?: string;
  methodName?: string;
  gasCostInEth?: number;
}

interface TransactionListProps {
  transactions: Transaction[];
  chain: ChainId;
  loading?: boolean;
  error?: string | null;
}

type SortField = 'timestamp' | 'value' | 'status';
type SortDir = 'asc' | 'desc';

const CHAIN_EXPLORERS: Record<string, string> = {
  ethereum: 'https://etherscan.io',
  base: 'https://basescan.org',
  arbitrum: 'https://arbiscan.io',
  optimism: 'https://optimistic.etherscan.io',
  polygon: 'https://polygonscan.com',
  bsc: 'https://bscscan.com',
  linea: 'https://lineascan.build',
  solana: 'https://solscan.io',
};

export function TransactionList({ transactions, chain, loading, error }: TransactionListProps) {
  const isMobile = useIsMobile();
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const currency = NATIVE_SYMBOL[chain] || 'ETH';
  const explorer = CHAIN_EXPLORERS[chain] || 'https://etherscan.io';

  const filtered = useMemo(() => {
    let result = [...transactions];
    if (filterType === 'transfer') result = result.filter(tx => tx.category === 'transfer' || !tx.category);
    else if (filterType === 'incoming') result = result.filter(tx => tx.isIncoming);
    else if (filterType === 'outgoing') result = result.filter(tx => !tx.isIncoming);
    else if (filterType === 'contract') result = result.filter(tx => tx.method || tx.methodName);
    else if (filterType === 'token') result = result.filter(tx => tx.category === 'token_transfer');
    else if (filterType === 'failed') result = result.filter(tx => tx.status === 'failed' || tx.status === '0');

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'timestamp') cmp = (a.timestamp || a.time || a.blockTime || 0) - (b.timestamp || b.time || b.blockTime || 0);
      else if (sortField === 'value') cmp = (a.valueInEth || 0) - (b.valueInEth || 0);
      else if (sortField === 'status') cmp = (a.status || '').localeCompare(b.status || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [transactions, filterType, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={10} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />;
  };

  const openTx = (hash: string) => {
    if (!hash) return;
    window.open(`${explorer}/tx/${hash}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 22, height: 22, border: '2px solid var(--hairline)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 12, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)' }}>Loading transactions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <span style={{ color: 'var(--destructive)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>{error}</span>
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 12, opacity: 0.2 }}>TX</div>
        <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)' }}>
          No transactions found. Run a full analysis to fetch transaction history.
        </div>
      </div>
    );
  }

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'transfer', label: 'Transfers' },
    { id: 'token', label: 'Tokens' },
    { id: 'incoming', label: 'In' },
    { id: 'outgoing', label: 'Out' },
    { id: 'contract', label: 'Contracts' },
    { id: 'failed', label: 'Failed' },
  ];

  return (
    <div style={{ fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 12, borderBottom: '1px solid var(--hairline)', marginBottom: 0,
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => { setFilterType(f.id); setPage(0); }}
              style={{
                padding: '4px 11px', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 500,
                cursor: 'pointer', border: filterType === f.id ? '1px solid var(--accent)' : '1px solid transparent',
                background: filterType === f.id ? 'rgba(0,230,122,0.1)' : 'transparent',
                color: filterType === f.id ? 'var(--accent)' : 'var(--fg-tertiary)',
                fontFamily: 'var(--font-sans)', transition: 'all 150ms',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)' }}>
          {filtered.length.toLocaleString()} tx{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {!isMobile && (
        <div style={{
          display: 'grid', gridTemplateColumns: '44px 90px 1fr 1fr 110px 24px', gap: 8,
          padding: '10px 8px', borderBottom: '1px solid var(--hairline)',
          fontSize: 10, fontWeight: 600, color: 'var(--fg-tertiary)', textTransform: 'uppercase',
          letterSpacing: '0.05em', alignItems: 'center',
        }}>
          <span style={{ textAlign: 'center' }}>Dir</span>
          <button onClick={() => toggleSort('timestamp')} style={thStyle}><SortIcon field="timestamp" /> Age</button>
          <span>From</span>
          <span>To</span>
          <button onClick={() => toggleSort('value')} style={{ ...thStyle, justifyContent: 'flex-end' }}>
            <SortIcon field="value" /> Value
          </button>
          <span />
        </div>
      )}

      {/* Rows */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {pageData.map((tx, i) => {
          const hash = tx.hash || tx.txHash || tx.tx_hash || '';
          const from = tx.from || tx.sender || '';
          const to = tx.to || tx.recipient || '';
          const value = tx.valueInEth ?? (tx.value ? Number(tx.value) / 1e18 : 0);
          const ts = tx.timestamp || tx.time || tx.blockTime || 0;
          const isIncoming = tx.isIncoming;
          const isFailed = tx.status === 'failed' || tx.status === '0';
          const cat = tx.category || 'unknown';
          const methodName = tx.methodName || tx.method || '';

          if (isMobile) {
            return (
              <button
                key={hash || i}
                type="button"
                onClick={() => openTx(hash)}
                title={hash || undefined}
                style={{
                  width: '100%',
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: '12px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: 0,
                  borderBottom: '1px solid var(--hairline)',
                  background: 'transparent',
                  opacity: isFailed ? 0.5 : 1,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  {isIncoming ? (
                    <ArrowDownLeft size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                  ) : (
                    <ArrowUpRight size={16} style={{ color: '#f43f5e', flexShrink: 0 }} />
                  )}
                  <span style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--fg)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                        {ts ? formatAge(ts) : '—'}
                      </span>
                      <span style={{
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 9,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-full)',
                        background: CATEGORY_COLORS[cat] || CATEGORY_COLORS.unknown,
                        color: 'var(--fg-tertiary)',
                        textTransform: 'uppercase',
                      }}>
                        {methodName || cat.replace(/_/g, ' ')}
                      </span>
                    </span>
                  </span>
                  <span style={{
                    flexShrink: 0,
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: isIncoming ? '#22c55e' : 'var(--fg)',
                  }}>
                    {isIncoming ? '+' : ''}{formatValue(Number(value), currency)}
                  </span>
                  <ExternalLink size={12} style={{ color: 'var(--fg-tertiary)', opacity: 0.55, flexShrink: 0 }} />
                </span>
                <span style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                  gap: 8,
                  minWidth: 0,
                }}>
                  <span style={mobileAddressStyle}>
                    <span style={mobileAddressLabelStyle}>From</span>
                    <span>{formatMobileAddress(from)}</span>
                  </span>
                  <span style={mobileAddressStyle}>
                    <span style={mobileAddressLabelStyle}>To</span>
                    <span style={{ color: isIncoming ? 'var(--accent)' : 'var(--fg-secondary)' }}>
                      {formatDestination(chain, to)}
                    </span>
                  </span>
                </span>
              </button>
            );
          }

          return (
            <div
              key={hash || i}
              onClick={() => openTx(hash)}
              title={hash || undefined}
              style={{
                display: 'grid', gridTemplateColumns: '44px 90px 1fr 1fr 110px 24px', gap: 8,
                padding: '9px 8px', cursor: 'pointer', alignItems: 'center',
                borderBottom: '1px solid var(--hairline)',
                background: 'transparent', transition: 'background 120ms',
                opacity: isFailed ? 0.5 : 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Direction icon */}
              <span style={{ display: 'flex', justifyContent: 'center' }}>
                {isIncoming ? (
                  <ArrowDownLeft size={15} style={{ color: '#22c55e', flexShrink: 0 }} />
                ) : (
                  <ArrowUpRight size={15} style={{ color: '#f43f5e', flexShrink: 0 }} />
                )}
              </span>

              {/* Age + category badge */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, color: 'var(--fg)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                  {ts ? formatAge(ts) : '—'}
                </span>
                <span style={{
                  fontSize: 8, fontWeight: 500, fontFamily: 'var(--font-sans)',
                  padding: '1px 5px', borderRadius: 'var(--radius-full)',
                  background: CATEGORY_COLORS[cat] || CATEGORY_COLORS.unknown,
                  color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em',
                  width: 'fit-content',
                }}>
                  {methodName || cat.replace(/_/g, ' ')}
                </span>
              </div>

              {/* From */}
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {from ? `${from.slice(0, 8)}...${from.slice(-5)}` : '—'}
              </span>

              {/* To */}
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)',
                color: isIncoming ? 'var(--accent)' : 'var(--fg-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {formatDestination(chain, to)}
              </span>

              {/* Value */}
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                color: isIncoming ? '#22c55e' : 'var(--fg)',
                textAlign: 'right',
              }}>
                {isIncoming ? '+' : ''}{formatValue(Number(value), currency)}
              </span>

              {/* External link */}
              <span style={{ display: 'flex', justifyContent: 'center' }}>
                <ExternalLink size={11} style={{ color: 'var(--fg-tertiary)', opacity: 0.5, flexShrink: 0 }} />
              </span>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4,
          paddingTop: 10, borderTop: '1px solid var(--hairline)',
        }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={pageBtnStyle(page === 0)}>
            <ChevronLeft size={12} />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i;
            } else if (page < 4) {
              pageNum = i < 5 ? i : totalPages - 1;
            } else if (page > totalPages - 5) {
              pageNum = i < 1 ? 0 : totalPages - 6 + i;
            } else {
              pageNum = i === 0 ? 0 : i === 6 ? totalPages - 1 : page - 3 + i;
            }
            const showEllipsis = i > 0 && pageNum !== (() => {
              let prev: number;
              if (totalPages <= 7) prev = i - 1;
              else if (page < 4) prev = i < 5 ? i - 1 : (i === 5 ? 4 : totalPages - 2);
              else if (page > totalPages - 5) prev = i < 1 ? -1 : totalPages - 7 + i - 1;
              else prev = i === 0 ? -1 : page - 4 + i - 1;
              return prev;
            })() + 1;

            if (showEllipsis && i > 0 && i < 6) {
              return <span key={`ell-${i}`} style={{ fontSize: 11, color: 'var(--fg-tertiary)', padding: '0 2px' }}>...</span>;
            }

            return (
              <button key={pageNum} onClick={() => setPage(pageNum)}
                style={{
                  minWidth: 28, height: 26, borderRadius: 'var(--radius-md)', fontSize: 11, cursor: 'pointer',
                  border: pageNum === page ? '1px solid var(--accent)' : '1px solid transparent',
                  background: pageNum === page ? 'rgba(0,230,122,0.1)' : 'transparent',
                  color: pageNum === page ? 'var(--accent)' : 'var(--fg-tertiary)',
                  fontFamily: 'var(--font-mono)', fontWeight: pageNum === page ? 600 : 400,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {pageNum + 1}
              </button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={pageBtnStyle(page >= totalPages - 1)}>
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 3,
  color: 'var(--fg-tertiary)', fontSize: 10, fontWeight: 600, cursor: 'pointer',
  textTransform: 'uppercase' as const, letterSpacing: '0.05em', padding: 0,
};

function pageBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    minWidth: 28, height: 26, borderRadius: 'var(--radius-md)', fontSize: 11, cursor: disabled ? 'default' : 'pointer',
    border: '1px solid transparent', background: 'transparent',
    color: disabled ? 'var(--fg-tertiary)' : 'var(--fg-secondary)', opacity: disabled ? 0.3 : 1,
    fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

function formatAge(ts: number): string {
  // Normalize to milliseconds: values < 1e12 are Unix seconds
  const ms = ts > 0 && ts < 1e12 ? ts * 1000 : ts;
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 0) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 2592000) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(ms).toISOString().slice(0, 10);
}

function formatValue(v: number, currency: string): string {
  if (v === 0) return `0 ${currency}`;
  if (v < 0.00001) return `<0.00001 ${currency}`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K ${currency}`;
  if (v < 0.001) return `${v.toFixed(6)} ${currency}`;
  if (v < 1) return `${v.toFixed(4)} ${currency}`;
  return `${v.toFixed(3)} ${currency}`;
}

function formatMobileAddress(address: string): string {
  if (!address) return '—';
  if (address.length <= 18) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

const mobileAddressStyle: React.CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  padding: '8px 9px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--hairline)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--fg)',
  overflow: 'hidden',
};

const mobileAddressLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 8,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--fg-tertiary)',
};
