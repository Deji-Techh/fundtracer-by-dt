import { useEffect, useMemo, useRef, useState } from 'react';
import { streamAnalyzeCEXFlow } from '../../api/analyze';
import { useNotify } from '../../contexts/ToastContext';
import { useTabs } from '../../contexts/TabsContext';
import { ChainSelector } from '../common/ChainSelector';
import { Building2, ArrowRightLeft, TrendingUp, TrendingDown, ExternalLink, Wallet } from 'lucide-react';
import type { ChainId } from '../../types';
import { getCexFlowState, saveCexFlowState } from '../../stores/cexFlowState';
import { CompactSearchForm, InputStage } from './CompactSearchForm';
import { ProgressiveLoader } from './ProgressiveLoader';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { ToolInlineAiAnalysis, type ToolAiMessage } from './ToolInlineAiAnalysis';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const CEX_COLORS: Record<string, string> = {
  'Binance': '#f0b90b', 'Coinbase': '#0052ff', 'Kraken': '#5741d9',
  'Bybit': '#ff9c00', 'OKX': '#000000', 'KuCoin': '#23af91',
  'Bitget': '#cad500', 'Gate.io': '#1f8cf0', 'Huobi': '#3172b0',
  'Bitfinex': '#68cbc8', 'Crypto.com': '#0d3e6f', 'Gemini': '#00bcd4',
};

function asFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function CEXFlowView() {
  const notify = useNotify();
  const { activeTabId } = useTabs();
  const scopeKey = activeTabId || 'global';
  const initialState = getCexFlowState(scopeKey);
  const [address, setAddress] = useState(initialState.address);
  const [chain, setChain] = useState<ChainId>(initialState.chain);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(initialState.result);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState('');
  const [activeResultTab, setActiveResultTab] = useState<'overview' | 'graph' | 'activity'>('overview');
  const [aiMessages, setAiMessages] = useState<ToolAiMessage[]>([]);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const runIdRef = useRef(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    const next = getCexFlowState(scopeKey);
    setAddress(next.address);
    setChain(next.chain);
    setResult(next.result);
    setError(null);
    setLoading(false);
    setProgressMessage('');
    setActiveResultTab('overview');
  }, [scopeKey]);

  useEffect(() => () => {
    streamCleanupRef.current?.();
    streamCleanupRef.current = null;
  }, []);

  useEffect(() => {
    saveCexFlowState({ address, chain, result }, scopeKey);
  }, [address, chain, result, scopeKey]);

  const handleAnalyze = () => {
    if (!address.trim()) { notify.error('Please enter a wallet address'); return; }
    streamCleanupRef.current?.();
    const runId = ++runIdRef.current;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressMessage('Preparing CEX flow trace');

    streamCleanupRef.current = streamAnalyzeCEXFlow(
      address.trim(),
      chain,
      (event) => {
        if (runId !== runIdRef.current) return;
        if (event.type === 'status') {
          const elapsed = event.elapsedSeconds ? ` (${event.elapsedSeconds}s)` : '';
          setProgressMessage(`${event.message || 'Tracing CEX flow'}${elapsed}`);
          return;
        }
        if (event.type === 'complete') {
          const data = (event.result || event) as unknown as Record<string, unknown>;
          setResult((data.result || data) as Record<string, unknown>);
          setProgressMessage('');
          setLoading(false);
          streamCleanupRef.current = null;
          return;
        }
        if (event.type === 'error') {
          const message = event.message || event.error || 'CEX flow analysis failed';
          setError(message);
          setProgressMessage('');
          setLoading(false);
          streamCleanupRef.current = null;
        }
      },
      (err) => {
        if (runId !== runIdRef.current) return;
        setError(err.message || 'CEX flow analysis failed');
        setProgressMessage('');
        setLoading(false);
        streamCleanupRef.current = null;
      },
    );
  };

  return (
    <div style={{
      padding: isMobile ? '14px 14px 72px' : 20,
      width: '100%',
      maxWidth: 'none',
      margin: 0,
      height: '100%',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto',
      overflowX: 'hidden',
    }}>
      {!result && !loading && !error && (
        <InputStage
          title="CEX Flow Analysis"
          maxWidth={640}
          hint="0x.. or ENS"
        >
          <CompactSearchForm
            value={address}
            onChange={setAddress}
            onSubmit={handleAnalyze}
            placeholder="0x.. or ENS"
            ariaLabel="Wallet address"
            loading={loading}
            disabled={loading}
            submitLabel="Analyze"
            loadingLabel="Analyzing"
            hideInputIcon
            showSubmitTextOnMobile
            leftSlot={<ChainSelector value={chain} onChange={setChain} compact />}
          />
        </InputStage>
      )}

      {(result || loading || error) && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={20} style={{ color: 'var(--accent)' }} /> CEX Flow Analysis
          </h2>
          <p style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginBottom: 16 }}>
            Trace fund flows between a wallet and centralized exchanges. Identify deposits, withdrawals, and exchange relationships.
          </p>
        </>
      )}

      {loading && (
        <ProgressiveLoader
          title="Tracing CEX flow"
          steps={['Fetching recent wallet transactions', 'Matching exchange wallets', 'Calculating deposits and withdrawals']}
          message={progressMessage || undefined}
          compact={isMobile}
        />
      )}
      {error && <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--card)', border: '1px solid var(--destructive)', color: 'var(--destructive)', fontSize: 13 }}>{error}</div>}

      {result && (
        <CEXResult
          data={result}
          address={address.trim()}
          chain={chain}
          isMobile={isMobile}
          activeTab={activeResultTab}
          onTabChange={setActiveResultTab}
          aiMessages={aiMessages}
          onAiMessagesChange={setAiMessages}
        />
      )}
    </div>
  );
}

function CEXResult({
  data,
  address,
  chain,
  isMobile,
  activeTab,
  onTabChange,
  aiMessages,
  onAiMessagesChange,
}: {
  data: Record<string, unknown>;
  address: string;
  chain: ChainId;
  isMobile: boolean;
  activeTab: 'overview' | 'graph' | 'activity';
  onTabChange: (tab: 'overview' | 'graph' | 'activity') => void;
  aiMessages: ToolAiMessage[];
  onAiMessagesChange: (messages: ToolAiMessage[]) => void;
}) {
  const exchanges = (data.exchanges || data.cexList || data.connectedCEXs || []) as Array<Record<string, unknown>>;
  const totalDeposited = asFiniteNumber(data.totalDeposited);
  const totalWithdrawn = asFiniteNumber(data.totalWithdrawn);
  const netFlow = asFiniteNumber(data.netFlow);
  const flowEvents = (data.flowEvents || data.transactions || data.flows || []) as Array<Record<string, unknown>>;
  const chartData = useMemo(() => buildCexFlowTimeline(flowEvents), [flowEvents]);
  const graphPanel = (
    <div style={{
      flex: isMobile ? '0 0 auto' : 1,
      minHeight: isMobile ? 260 : 340,
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--hairline)',
      background: 'var(--card)',
      padding: isMobile ? '12px 10px' : '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-sans)' }}>
          Exchange Flow Timeline
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 2, borderRadius: 1, background: 'var(--accent)', display: 'inline-block' }} />
            Deposits
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 2, borderRadius: 1, background: '#ff453a', display: 'inline-block' }} />
            Withdrawals
          </span>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
        Daily exchange deposits and withdrawals from matched CEX flow events.
      </div>
      {chartData.labels.length > 0 ? (
        <div style={{ flex: 1, minHeight: isMobile ? 210 : 270 }}>
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { intersect: false, mode: 'index' },
              plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a1a20', titleColor: '#e4e4e8', bodyColor: '#a1a1aa', borderColor: '#282830', borderWidth: 1 } },
              scales: {
                x: { ticks: { color: 'var(--fg-tertiary)', font: { size: 9, family: 'var(--font-mono)' }, maxTicksLimit: 14, maxRotation: 45 }, grid: { color: 'rgba(148, 163, 184, 0.08)' } },
                y: { ticks: { color: 'var(--fg-tertiary)', font: { size: 9, family: 'var(--font-mono)' } }, grid: { color: 'rgba(148, 163, 184, 0.08)' } },
              },
            }}
          />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-tertiary)', fontSize: 13 }}>
          No timestamped exchange flow events were found
        </div>
      )}
    </div>
  );

  return (
    <div>
      <ResultTabs
        active={activeTab}
        onChange={onTabChange}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'graph', label: 'Graph' },
          { id: 'activity', label: `Activity (${flowEvents.length})` },
        ]}
      />

      {activeTab === 'overview' && (
        <>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.1fr) minmax(320px, 0.9fr)',
          gap: 16,
          alignItems: 'start',
        }}>
          <div>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <Metric icon={<TrendingUp size={16} />} label="Total Deposited" value={totalDeposited !== null ? `${totalDeposited.toFixed(4)} ETH` : 'N/A'} color="var(--accent)" />
        <Metric icon={<TrendingDown size={16} />} label="Total Withdrawn" value={totalWithdrawn !== null ? `${totalWithdrawn.toFixed(4)} ETH` : 'N/A'} color="var(--destructive)" />
        <Metric icon={<ArrowRightLeft size={16} />} label="Net Flow" value={netFlow !== null ? `${netFlow.toFixed(4)} ETH` : 'N/A'} color={netFlow !== null && netFlow > 0 ? 'var(--accent)' : 'var(--destructive)'} />
        <Metric icon={<Building2 size={16} />} label="Connected CEXs" value={String(exchanges.length)} color="var(--fg)" />
      </div>

      {/* Exchange list */}
      {exchanges.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>
            Connected Exchanges
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {exchanges.map((ex, i) => {
              const name = (ex.name || ex.exchange || ex.cex || '') as string;
              const color = CEX_COLORS[name] || 'var(--accent)';
              const volume = asFiniteNumber(ex.volume ?? ex.totalValue ?? ex.amount);
              return (
                <div key={i} style={{
                  padding: '10px 16px', borderRadius: 'var(--radius-lg)', border: `2px solid ${color}`,
                  background: `${color}15`, minWidth: 140,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 4 }}>{String(name)}</div>
                  {volume !== null && <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-secondary)' }}>
                    {volume.toFixed(4)} ETH
                  </div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
          </div>
          <ToolInlineAiAnalysis
            cacheId="cex-flow"
            title="AI Analysis"
            prompt="Summarize this CEX flow trace. Explain exchange exposure, net deposit or withdrawal direction, unusual activity, and the next useful investigation steps."
            context={{ address, chain, analysisData: data }}
            cachedMessages={aiMessages}
            onMessagesChange={onAiMessagesChange}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          {graphPanel}
        </div>
        </>
      )}

      {activeTab === 'graph' && (
        graphPanel
      )}

      {/* Flow events */}
      {activeTab === 'activity' && flowEvents.length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>
            Recent Exchange Activity ({flowEvents.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {flowEvents.slice(0, 25).map((ev, i) => {
              const type = ev.type || ev.direction || ev.flowType;
              const exchange = ev.exchange || ev.cex || ev.name || '';
              const amount = asFiniteNumber(ev.amount ?? ev.value);
              const ts = ev.timestamp || ev.time;

              return (
                <div key={i} style={{
                  padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--card)',
                  border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 'var(--radius-md)', fontSize: 10, fontWeight: 600,
                      background: type === 'deposit' || type === 'in' ? 'rgba(0,255,136,0.12)' : 'rgba(255,51,102,0.12)',
                      color: type === 'deposit' || type === 'in' ? 'var(--accent)' : 'var(--destructive)',
                    }}>
                      {type === 'deposit' || type === 'in' ? 'IN' : 'OUT'}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>{String(exchange)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>
                      {amount !== null ? `${amount.toFixed(4)} ETH` : 'N/A'}
                    </span>
                    {Boolean(ts) && <span style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>
                      {typeof ts === 'number' ? new Date(ts * 1000).toLocaleDateString() : String(ts).slice(0, 10)}
                    </span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 140, padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--card)', border: '1px solid var(--hairline)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-tertiary)', marginBottom: 8 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}</div>
    </div>
  );
}

function ResultTabs<T extends string>({
  active,
  onChange,
  tabs,
}: {
  active: T;
  onChange: (tab: T) => void;
  tabs: Array<{ id: T; label: string }>;
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 0,
      padding: 0,
      borderRadius: 0,
      background: 'transparent',
      border: 'none',
      borderBottom: '1px solid var(--hairline)',
      marginBottom: 20,
      overflowX: 'auto',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            height: 32,
            padding: '0 14px',
            borderRadius: 0,
            border: 'none',
            borderBottom: active === tab.id ? '2px solid var(--fg)' : '2px solid transparent',
            background: 'transparent',
            color: active === tab.id ? 'var(--fg)' : 'var(--fg-tertiary)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: 'none',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function normalizeFlowDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (Number.isFinite(n)) return new Date(n > 10_000_000_000 ? n : n * 1000);
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function buildCexFlowTimeline(flowEvents: Array<Record<string, unknown>>) {
  const deposits = new Map<string, number>();
  const withdrawals = new Map<string, number>();
  for (const event of flowEvents) {
    const date = normalizeFlowDate(event.timestamp || event.time || event.date);
    if (!date) continue;
    const key = date.toISOString().slice(0, 10);
    const amount = asFiniteNumber(event.amount ?? event.value) || 0;
    const type = String(event.type || event.direction || event.flowType || '').toLowerCase();
    if (type === 'deposit' || type === 'in' || type === 'received') {
      deposits.set(key, (deposits.get(key) || 0) + amount);
    } else {
      withdrawals.set(key, (withdrawals.get(key) || 0) + amount);
    }
  }
  const labels = [...new Set([...deposits.keys(), ...withdrawals.keys()])].sort();
  return {
    labels,
    datasets: [
      {
        label: 'Deposits',
        data: labels.map(label => deposits.get(label) || 0),
        borderColor: 'rgba(0, 230, 122, 0.95)',
        backgroundColor: 'rgba(0, 230, 122, 0.14)',
        tension: 0.35,
        pointRadius: 2,
      },
      {
        label: 'Withdrawals',
        data: labels.map(label => withdrawals.get(label) || 0),
        borderColor: 'rgba(255, 69, 58, 0.95)',
        backgroundColor: 'rgba(255, 69, 58, 0.14)',
        tension: 0.35,
        pointRadius: 2,
      },
    ],
  };
}
