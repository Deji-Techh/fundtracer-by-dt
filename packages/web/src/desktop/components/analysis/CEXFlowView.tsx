import { useEffect, useState } from 'react';
import { analyzeCEXFlow } from '../../api/analyze';
import { useNotify } from '../../contexts/ToastContext';
import { useTabs } from '../../contexts/TabsContext';
import { Loader } from '../common/Loader';
import { ChainSelector } from '../common/ChainSelector';
import { Building2, ArrowRightLeft, TrendingUp, TrendingDown, ExternalLink, Wallet } from 'lucide-react';
import type { ChainId } from '../../types';
import { getCexFlowState, saveCexFlowState } from '../../stores/cexFlowState';
import { CompactSearchForm, InputStage } from './CompactSearchForm';

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

  useEffect(() => {
    const next = getCexFlowState(scopeKey);
    setAddress(next.address);
    setChain(next.chain);
    setResult(next.result);
    setError(null);
    setLoading(false);
  }, [scopeKey]);

  useEffect(() => {
    saveCexFlowState({ address, chain, result }, scopeKey);
  }, [address, chain, result, scopeKey]);

  const handleAnalyze = async () => {
    if (!address.trim()) { notify.error('Please enter a wallet address'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await analyzeCEXFlow(address.trim(), chain);
      const data = res as unknown as Record<string, unknown>;
      setResult((data.result || data) as unknown as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CEX flow analysis failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
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

      {loading && <Loader />}
      {error && <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--card)', border: '1px solid var(--destructive)', color: 'var(--destructive)', fontSize: 13 }}>{error}</div>}

      {result && <CEXResult data={result} />}
    </div>
  );
}

function CEXResult({ data }: { data: Record<string, unknown> }) {
  const exchanges = (data.exchanges || data.cexList || data.connectedCEXs || []) as Array<Record<string, unknown>>;
  const totalDeposited = asFiniteNumber(data.totalDeposited);
  const totalWithdrawn = asFiniteNumber(data.totalWithdrawn);
  const netFlow = asFiniteNumber(data.netFlow);
  const flowEvents = (data.flowEvents || data.transactions || data.flows || []) as Array<Record<string, unknown>>;

  return (
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

      {/* Flow events */}
      {flowEvents.length > 0 && (
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
