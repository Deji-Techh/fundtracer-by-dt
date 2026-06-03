import { useState, useEffect, useRef } from 'react';
import { detectSybil } from '../../api/analyze';
import { useNotify } from '../../contexts/ToastContext';
import { useTabs } from '../../contexts/TabsContext';
import { ChainSelector } from '../common/ChainSelector';
import { Shield, AlertTriangle, Users, Link, ExternalLink } from 'lucide-react';
import type { ChainId } from '../../types';
import { getSybilState, saveSybilState } from '../../stores/sybilState';
import { InputStage } from './CompactSearchForm';
import { ProgressiveLoader } from './ProgressiveLoader';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface SybilViewProps {
  prefillAddresses?: string[];
  prefillChain?: ChainId;
  onPrefillConsumed?: () => void;
}

export function SybilView({ prefillAddresses, prefillChain, onPrefillConsumed }: SybilViewProps) {
  const notify = useNotify();
  const { activeTabId } = useTabs();
  const scopeKey = activeTabId || 'global';
  const initialState = getSybilState(scopeKey);
  const [textInput, setTextInput] = useState(initialState.textInput);
  const [chain, setChain] = useState<ChainId>(initialState.chain);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(initialState.result);
  const [error, setError] = useState<string | null>(null);
  const prefillConsumedRef = useRef(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const next = getSybilState(scopeKey);
    setTextInput(next.textInput);
    setChain(next.chain);
    setResult(next.result);
    setError(null);
    setLoading(false);
  }, [scopeKey]);

  useEffect(() => {
    saveSybilState({ textInput, chain, result }, scopeKey);
  }, [textInput, chain, result, scopeKey]);

  useEffect(() => {
    if (prefillAddresses && prefillAddresses.length >= 2 && !prefillConsumedRef.current) {
      prefillConsumedRef.current = true;
      setTextInput(prefillAddresses.join('\n'));
      if (prefillChain) setChain(prefillChain);
      onPrefillConsumed?.();
      // Auto-start analysis after state settles
      const timer = setTimeout(() => {
        setLoading(true);
        detectSybil(prefillAddresses, prefillChain || 'ethereum')
          .then(res => {
            const data = res as unknown as Record<string, unknown>;
            setResult((data.result || data) as unknown as Record<string, unknown>);
          })
          .catch(err => {
            setError(err instanceof Error ? err.message : 'Sybil detection failed');
          })
          .finally(() => setLoading(false));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [prefillAddresses, prefillChain, onPrefillConsumed]);

  const handleDetect = async () => {
    const addresses = textInput
      .split(/[\n,;\s]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (addresses.length < 2) { notify.error('Enter at least 2 addresses (comma or newline separated)'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await detectSybil(addresses, chain);
      const data = res as unknown as Record<string, unknown>;
      setResult((data.result || data) as unknown as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sybil detection failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 28, maxWidth: 1240, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!result && !loading && !error && (
        <InputStage
          title="Sybil Detection"
          maxWidth={720}
          hint="Detect related-wallet clusters based on shared funding and behavior"
        >
          <div style={{ width: '100%', background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 12, padding: 4 }}>
            <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
              placeholder="Paste addresses — one per line or comma-separated"
              rows={6}
              spellCheck={false}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: 'none',
                background: 'transparent',
                color: 'var(--fg)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                minHeight: 168,
                lineHeight: 1.5,
              }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 4px 2px 4px' }}>
              <ChainSelector value={chain} onChange={setChain} />
              <button onClick={handleDetect} disabled={loading}
                style={{
                  padding: '0 16px',
                  height: 38,
                  borderRadius: 10,
                  border: 'none',
                  background: loading ? 'var(--bg-secondary)' : 'var(--accent)',
                  color: loading ? 'var(--fg-tertiary)' : '#000',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: loading ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}>
                {loading ? 'Detecting' : 'Detect Sybils'}
              </button>
            </div>
          </div>
        </InputStage>
      )}

      {(result || loading || error) && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={20} style={{ color: 'var(--accent)' }} /> Sybil Detection
          </h2>
          <p style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginBottom: 16 }}>
            Paste multiple wallet addresses to detect clusters of related accounts that share common funding sources.
          </p>
        </>
      )}

      {loading && (
        <ProgressiveLoader
          title="Detecting sybil clusters"
          steps={['Looking up first funders', 'Grouping shared sources', 'Scoring cluster risk']}
          compact={isMobile}
        />
      )}
      {error && <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--card)', border: '1px solid var(--destructive)', color: 'var(--destructive)', fontSize: 13 }}>{error}</div>}

      {result && <SybilResult data={result} />}
    </div>
  );
}

function SybilResult({ data }: { data: Record<string, unknown> }) {
  const clusters = (data.clusters || data.sybilClusters || data.groups || []) as Array<Record<string, unknown>>;
  const totalAddresses = data.totalAddresses as number | undefined;
  const sybilCount = data.sybilCount as number | undefined;
  const clusterCount = (data.clusterCount || clusters.length) as number;

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <Metric icon={<Users size={16} />} label="Total Addresses" value={String(totalAddresses || 'N/A')} color="var(--fg)" />
        <Metric icon={<AlertTriangle size={16} />} label="Sybil Clusters" value={String(clusterCount)} color="var(--warning)" />
        <Metric icon={<Shield size={16} />} label="Sybil Addresses" value={String(sybilCount || clusters.reduce((sum: number, c: Record<string, unknown>) => { const m = (c.members || c.addresses) as unknown[]; return sum + (Array.isArray(m) ? m.length : 0); }, 0))} color="var(--destructive)" />
      </div>

      {clusters.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--accent)', fontSize: 13 }}>
          No sybil clusters detected. These addresses appear to be independent.
        </div>
      ) : (
        clusters.map((cluster, i) => {
          const members = (cluster.members || cluster.addresses || []) as unknown[];
          const commonSource = cluster.commonSource || cluster.fundingSource || cluster.sharedFunder;
          const confidence = cluster.confidence || cluster.score;

          return (
            <div key={i} style={{
              padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--card)',
              border: '1px solid var(--hairline)', marginBottom: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                  Cluster {i + 1} ({Array.isArray(members) ? members.length : 0} wallets)
                </span>
                {confidence !== undefined && (
                  <span style={{
                    padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600,
                    background: Number(confidence) > 0.7 ? 'rgba(255,51,102,0.15)' : 'rgba(255,193,7,0.15)',
                    color: Number(confidence) > 0.7 ? 'var(--destructive)' : 'var(--warning)',
                  }}>
                    {(Number(confidence) * 100).toFixed(0)}% confidence
                  </span>
                )}
              </div>

              {Boolean(commonSource) && (
                <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Link size={10} /> Common funder: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                    {String(commonSource).slice(0, 16)}...
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {Array.isArray(members) && members.slice(0, 15).map((addr, j) => (
                  <span key={j} style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-secondary)',
                    background: 'var(--hover-overlay)', padding: '3px 8px', borderRadius: 'var(--radius-md)',
                  }}>
                    {String(addr).slice(0, 10)}...
                  </span>
                ))}
                {Array.isArray(members) && members.length > 15 && (
                  <span style={{ fontSize: 10, color: 'var(--fg-tertiary)', padding: '3px 8px' }}>
                    +{members.length - 15} more
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--card)', border: '1px solid var(--hairline)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-tertiary)', marginBottom: 8 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}</div>
    </div>
  );
}
