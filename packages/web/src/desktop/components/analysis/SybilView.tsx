import { useState, useEffect, useMemo, useRef } from 'react';
import { streamDetectSybil } from '../../api/analyze';
import { useNotify } from '../../contexts/ToastContext';
import { useTabs } from '../../contexts/TabsContext';
import { ChainSelector } from '../common/ChainSelector';
import { Shield, AlertTriangle, Users, Link, ExternalLink } from 'lucide-react';
import type { ChainId } from '../../types';
import { getSybilState, saveSybilState } from '../../stores/sybilState';
import { InputStage } from './CompactSearchForm';
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
  const [progressMessage, setProgressMessage] = useState('');
  const [activeResultTab, setActiveResultTab] = useState<'overview' | 'graph' | 'clusters'>('overview');
  const [aiMessages, setAiMessages] = useState<ToolAiMessage[]>([]);
  const prefillConsumedRef = useRef(false);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const runIdRef = useRef(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    const next = getSybilState(scopeKey);
    setTextInput(next.textInput);
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
        runSybilDetection(prefillAddresses, prefillChain || 'ethereum');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [prefillAddresses, prefillChain, onPrefillConsumed]);

  const runSybilDetection = (addresses: string[], selectedChain: ChainId) => {
    streamCleanupRef.current?.();
    const runId = ++runIdRef.current;

    setLoading(true);
    setError(null);
    setResult(null);
    setProgressMessage(`Validated ${addresses.length} addresses`);

    streamCleanupRef.current = streamDetectSybil(
      addresses,
      selectedChain,
      (event) => {
        if (runId !== runIdRef.current) return;

        if (event.type === 'status') {
          const elapsed = event.elapsedSeconds ? ` (${event.elapsedSeconds}s)` : '';
          setProgressMessage(`${event.message || 'Detecting sybil clusters'}${elapsed}`);
          return;
        }

        if (event.type === 'complete') {
          setResult(event.result as Record<string, unknown>);
          setProgressMessage('');
          setLoading(false);
          streamCleanupRef.current = null;
          return;
        }

        if (event.type === 'error') {
          const message = event.message || event.error || 'Sybil detection failed';
          setError(message);
          setProgressMessage('');
          setLoading(false);
          streamCleanupRef.current = null;
        }
      },
      (err) => {
        if (runId !== runIdRef.current) return;
        setError(err.message || 'Sybil detection failed');
        setProgressMessage('');
        setLoading(false);
        streamCleanupRef.current = null;
      },
    );
  };

  const handleDetect = () => {
    const addresses = textInput
      .split(/[\n,;\s]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (addresses.length < 2) { notify.error('Enter at least 2 addresses (comma or newline separated)'); return; }
    runSybilDetection(addresses, chain);
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
          message={progressMessage || undefined}
          compact={isMobile}
        />
      )}
      {error && <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--card)', border: '1px solid var(--destructive)', color: 'var(--destructive)', fontSize: 13 }}>{error}</div>}

      {result && (
        <SybilResult
          data={result}
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

function SybilResult({
  data,
  chain,
  isMobile,
  activeTab,
  onTabChange,
  aiMessages,
  onAiMessagesChange,
}: {
  data: Record<string, unknown>;
  chain: ChainId;
  isMobile: boolean;
  activeTab: 'overview' | 'graph' | 'clusters';
  onTabChange: (tab: 'overview' | 'graph' | 'clusters') => void;
  aiMessages: ToolAiMessage[];
  onAiMessagesChange: (messages: ToolAiMessage[]) => void;
}) {
  const clusters = (data.clusters || data.sybilClusters || data.groups || []) as Array<Record<string, unknown>>;
  const totalAddresses = data.totalAddresses as number | undefined;
  const sybilCount = data.sybilCount as number | undefined;
  const clusterCount = (data.clusterCount || clusters.length) as number;
  const chartData = useMemo(() => buildSybilClusterChart(clusters), [clusters]);
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
          Cluster Size and Risk
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 2, borderRadius: 1, background: 'var(--accent)', display: 'inline-block' }} />
            Wallets
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 2, borderRadius: 1, background: '#ffc107', display: 'inline-block' }} />
            Risk score
          </span>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
        Cluster wallet count compared with normalized risk score.
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
                y: { beginAtZero: true, ticks: { color: 'var(--fg-tertiary)', precision: 0, font: { size: 9, family: 'var(--font-mono)' } }, grid: { color: 'rgba(148, 163, 184, 0.08)' } },
              },
            }}
          />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-tertiary)', fontSize: 13 }}>
          No cluster graph is available because no clusters were detected
        </div>
      )}
    </div>
  );

  return (
    <div style={{ marginTop: 4 }}>
      <ResultTabs
        active={activeTab}
        onChange={onTabChange}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'graph', label: 'Graph' },
          { id: 'clusters', label: `Clusters (${clusters.length})` },
        ]}
      />

      {activeTab === 'overview' && (
        <>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.05fr) minmax(320px, 0.95fr)',
          gap: 16,
          alignItems: 'start',
        }}>
          <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <Metric icon={<Users size={16} />} label="Total Addresses" value={String(totalAddresses || 'N/A')} color="var(--fg)" />
        <Metric icon={<AlertTriangle size={16} />} label="Sybil Clusters" value={String(clusterCount)} color="var(--warning)" />
        <Metric icon={<Shield size={16} />} label="Sybil Addresses" value={String(sybilCount || clusters.reduce((sum: number, c: Record<string, unknown>) => { const m = (c.members || c.addresses) as unknown[]; return sum + (Array.isArray(m) ? m.length : 0); }, 0))} color="var(--destructive)" />
      </div>
            <div style={{ padding: 16, borderRadius: 'var(--radius-xl)', background: 'var(--card)', border: '1px solid var(--hairline)', color: clusters.length > 0 ? 'var(--fg-secondary)' : 'var(--accent)', fontSize: 13, lineHeight: 1.55 }}>
              {clusters.length > 0
                ? `${clusters.length} cluster${clusters.length === 1 ? '' : 's'} detected. Review shared funding sources and cluster scores before treating the wallets as related.`
                : 'No sybil clusters detected. These addresses appear to be independent based on the current funding data.'}
            </div>
          </div>
          <ToolInlineAiAnalysis
            cacheId="sybil"
            title="AI Analysis"
            prompt="Summarize this sybil detection result. Explain cluster risk, common funders, likely false positives, and what to inspect next."
            context={{ address: `sybil-${totalAddresses || clusters.length}`, chain, analysisData: data }}
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

      {activeTab === 'clusters' && clusters.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--accent)', fontSize: 13 }}>
          No sybil clusters detected. These addresses appear to be independent.
        </div>
      ) : activeTab === 'clusters' ? (
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
      ) : null}
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

function normalizeScore(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0;
  if (!Number.isFinite(n)) return 0;
  return n <= 1 ? n * 100 : n;
}

function clusterMembers(cluster: Record<string, unknown>): unknown[] {
  const members = cluster.members || cluster.addresses || [];
  return Array.isArray(members) ? members : [];
}

function buildSybilClusterChart(clusters: Array<Record<string, unknown>>) {
  const labels = clusters.map((_, index) => `Cluster ${index + 1}`);
  return {
    labels,
    datasets: [
      {
        label: 'Wallets',
        data: clusters.map(cluster => clusterMembers(cluster).length),
        borderColor: 'rgba(0, 230, 122, 0.95)',
        backgroundColor: 'rgba(0, 230, 122, 0.14)',
        tension: 0.35,
        pointRadius: 3,
      },
      {
        label: 'Risk score',
        data: clusters.map(cluster => normalizeScore(cluster.confidence || cluster.score || cluster.riskScore)),
        borderColor: 'rgba(255, 193, 7, 0.95)',
        backgroundColor: 'rgba(255, 193, 7, 0.14)',
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };
}
