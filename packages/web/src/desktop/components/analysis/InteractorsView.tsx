import { useEffect, useMemo, useRef, useState } from 'react';
import { streamAnalyzeContract } from '../../api/analyze';
import { useNotify } from '../../contexts/ToastContext';
import { useTabs } from '../../contexts/TabsContext';
import { ChainSelector } from '../common/ChainSelector';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { Users, ExternalLink, AlertTriangle, Shield, Download } from 'lucide-react';
import type { ChainId } from '../../types';
import { getInteractorsState, saveInteractorsState } from '../../stores/interactorsState';
import { CompactSearchForm, InputStage } from './CompactSearchForm';
import { ProgressiveLoader } from './ProgressiveLoader';
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

interface Interactor {
  address: string;
  interactionCount?: number;
  totalValueInEth?: number;
  totalValueOutEth?: number;
  firstInteraction?: number;
  lastInteraction?: number;
  fundingSource?: string;
  label?: string;
}

interface SuspiciousPattern {
  type: string;
  severity: string;
  description: string;
  evidence?: string[];
  score: number;
}

interface ContractResult {
  contractAddress: string;
  chain: string;
  totalInteractors: number;
  interactors: Interactor[];
  sharedFundingGroups?: { fundingSource: string; wallets: string[]; count: number }[];
  suspiciousPatterns?: SuspiciousPattern[];
  riskScore?: number;
  partial?: boolean;
  source?: string;
}

const CHAIN_EXPLORERS: Record<string, string> = {
  ethereum: 'https://etherscan.io', base: 'https://basescan.org',
  arbitrum: 'https://arbiscan.io', optimism: 'https://optimistic.etherscan.io',
  polygon: 'https://polygonscan.com', bsc: 'https://bscscan.com',
  linea: 'https://lineascan.build', solana: 'https://solscan.io',
};

interface InteractorsViewProps {
  onNavigateToSybil?: (addresses: string[], chain: ChainId) => void;
}

function csvEscape(value: unknown): string {
  const raw = value == null ? '' : String(value);
  const escaped = raw.replace(/"/g, '""');
  return /[",\n\r]/.test(raw) ? `"${escaped}"` : escaped;
}

export function InteractorsView({ onNavigateToSybil }: InteractorsViewProps) {
  const notify = useNotify();
  const { activeTabId } = useTabs();
  const isMobile = useIsMobile();
  const scopeKey = activeTabId || 'global';
  const initialState = getInteractorsState(scopeKey);
  const [address, setAddress] = useState(initialState.address);
  const [chain, setChain] = useState<ChainId>(initialState.chain);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContractResult | null>((initialState.result as ContractResult | null) || null);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState('');
  const [activeResultTab, setActiveResultTab] = useState<'overview' | 'graph' | 'addresses'>('overview');
  const [aiMessages, setAiMessages] = useState<ToolAiMessage[]>([]);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    const next = getInteractorsState(scopeKey);
    setAddress(next.address);
    setChain(next.chain);
    setResult((next.result as ContractResult | null) || null);
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
    saveInteractorsState({ address, chain, result: result as Record<string, unknown> | null }, scopeKey);
  }, [address, chain, result, scopeKey]);

  const handleAnalyze = () => {
    const addr = address.trim();
    if (!addr) { notify.error('Please enter a wallet or contract address'); return; }
    streamCleanupRef.current?.();
    const runId = ++runIdRef.current;

    setLoading(true);
    setError(null);
    setResult(null);
    setProgressMessage('Preparing contract analysis');

    streamCleanupRef.current = streamAnalyzeContract(
      addr,
      chain,
      { maxInteractors: 1000, analyzeFunding: true },
      (event) => {
        if (runId !== runIdRef.current) return;

        if (event.type === 'status' || event.type === 'warning') {
          setProgressMessage(event.message || 'Analyzing interactors');
          return;
        }

        if (event.type === 'partial') {
          const partial = event.result as ContractResult;
          setResult(partial);
          setProgressMessage(event.message || `Found ${partial.totalInteractors} interactors. Analyzing funding sources.`);
          return;
        }

        if (event.type === 'complete') {
          setResult(event.result as ContractResult);
          setProgressMessage('');
          setLoading(false);
          streamCleanupRef.current = null;
          return;
        }

        if (event.type === 'error') {
          const message = event.message || event.error || 'Analysis failed';
          setError(event.hint ? `${message} ${event.hint}` : message);
          setProgressMessage('');
          setLoading(false);
          streamCleanupRef.current = null;
          notify.error(message);
        }
      },
      (err) => {
        if (runId !== runIdRef.current) return;
        setError(err.message || 'Analysis failed');
        setProgressMessage('');
        setLoading(false);
        streamCleanupRef.current = null;
        notify.error(err.message || 'Analysis failed');
      },
    );
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (!result) return;
    let content: string;
    let mime: string;
    let ext: string;

    if (format === 'json') {
      content = JSON.stringify(result, null, 2);
      mime = 'application/json';
      ext = 'json';
    } else {
      const headers = ['address', 'interactionCount', 'totalValueInEth', 'totalValueOutEth', 'firstInteraction', 'lastInteraction', 'fundingSource'];
      const rows = result.interactors.map((ix: Interactor) =>
        headers.map(h => csvEscape((ix as any)[h] ?? '')).join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      mime = 'text/csv';
      ext = 'csv';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interactors-${result.contractAddress.slice(0, 8)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify.success(`Exported as ${format.toUpperCase()}`);
  };

  const explorer = CHAIN_EXPLORERS[chain] || 'https://etherscan.io';
  const interactorChart = useMemo(() => buildInteractorsTimeline(result?.interactors || []), [result?.interactors]);

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
          Interactor Activity
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 2, borderRadius: 1, background: '#3b82f6', display: 'inline-block' }} />
            {interactorChart.modeLabel}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
        {interactorChart.description}
      </div>
      <div style={{ flex: 1, minHeight: isMobile ? 210 : 270 }}>
        <Line
          data={interactorChart}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1a1a20',
                titleColor: '#e4e4e8',
                bodyColor: '#a1a1aa',
                borderColor: '#282830',
                borderWidth: 1,
              },
            },
            scales: {
              x: { ticks: { color: 'var(--fg-tertiary)', font: { size: 9, family: 'var(--font-mono)' }, maxTicksLimit: 14, maxRotation: 45 }, grid: { color: 'rgba(148, 163, 184, 0.08)' } },
              y: { beginAtZero: true, ticks: { color: 'var(--fg-tertiary)', precision: 0, font: { size: 9, family: 'var(--font-mono)' } }, grid: { color: 'rgba(148, 163, 184, 0.08)' } },
            },
          }}
        />
      </div>
    </div>
  );

  return (
    <div style={{ padding: isMobile ? 14 : 20, width: '100%', maxWidth: 'none', margin: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!result && !loading && !error && (
        <InputStage
          title="Interactors Analysis"
          maxWidth={760}
          hint="Contract address or ENS"
        >
          <CompactSearchForm
            value={address}
            onChange={setAddress}
            onSubmit={handleAnalyze}
            placeholder="Contract address or ENS"
            ariaLabel="Wallet or contract address"
            loading={loading}
            disabled={loading}
            submitLabel="Find"
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
            <Users size={20} style={{ color: 'var(--accent)' }} /> Interactors
          </h2>
          <p style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginBottom: 16 }}>
            Enter a wallet or contract address to see all addresses that have interacted with it, detect sybil clusters, and export the results.
          </p>
        </>
      )}

      {loading && (
        <ProgressiveLoader
          title="Analyzing interactors"
          steps={['Loading contract interactions', 'Finding first funders', 'Detecting shared funding groups']}
          message={progressMessage || undefined}
          compact={isMobile}
        />
      )}

      {error && (
        <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--card)', border: '1px solid var(--destructive)', color: 'var(--destructive)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {result && (
        <div>
          <ResultTabs
            active={activeResultTab}
            onChange={setActiveResultTab}
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'graph', label: 'Graph' },
              { id: 'addresses', label: `Addresses (${result.interactors.length})` },
            ]}
          />

          {activeResultTab === 'overview' && (
            <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.2fr) minmax(320px, 0.8fr)',
              gap: 16,
              alignItems: 'start',
            }}>
              <div>
          {/* Summary */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{
              padding: '14px 18px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)',
              border: '1px solid var(--card-border)', minWidth: 130,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-tertiary)', marginBottom: 6, letterSpacing: '0.05em' }}>Interactors</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{result.totalInteractors}</div>
            </div>
            {result.riskScore != null && (
              <div style={{
                padding: '14px 18px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)',
                border: '1px solid var(--card-border)', minWidth: 130,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-tertiary)', marginBottom: 6, letterSpacing: '0.05em' }}>Risk Score</div>
                <div style={{
                  fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: result.riskScore > 60 ? 'var(--destructive)' : result.riskScore > 30 ? 'var(--warning)' : 'var(--accent)',
                }}>{result.riskScore}/100</div>
              </div>
            )}

            {/* Actions */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {loading && result && (
                <span style={{
                  padding: '5px 9px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--accent)',
                  background: 'rgba(0,230,122,0.08)',
                  color: 'var(--accent)',
                  fontSize: 10,
                  fontWeight: 600,
                  alignSelf: 'center',
                  whiteSpace: 'nowrap',
                }}>
                  Live update
                </span>
              )}
              {onNavigateToSybil && (
                <button
                  onClick={() => onNavigateToSybil(result.interactors.map(ix => ix.address), chain)}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--accent)', background: 'rgba(0,230,122,0.08)',
                    color: 'var(--accent)', fontSize: 11, fontFamily: 'var(--font-sans)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <Shield size={12} /> Analyze for Sybil
                </button>
              )}
              <button onClick={() => handleExport('csv')}
                style={exportBtnStyle}>
                <Download size={12} /> CSV
              </button>
              <button onClick={() => handleExport('json')}
                style={exportBtnStyle}>
                <Download size={12} /> JSON
              </button>
            </div>
          </div>

          {/* Suspicious patterns */}
          {result.suspiciousPatterns && result.suspiciousPatterns.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} style={{ color: 'var(--warning)' }} /> Suspicious Patterns
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.suspiciousPatterns.map((p: SuspiciousPattern, i: number) => (
                  <div key={i} style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--hairline)',
                    background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', textTransform: 'capitalize' }}>
                        {p.type?.replace(/_/g, ' ')}
                      </span>
                      <span style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 'var(--radius-full)',
                        background: p.severity === 'critical' || p.severity === 'high' ? 'rgba(255,69,58,0.1)' : 'rgba(255,159,10,0.1)',
                        color: p.severity === 'critical' || p.severity === 'high' ? 'var(--destructive)' : 'var(--warning)',
                        textTransform: 'uppercase',
                      }}>{p.severity}</span>
                      {p.score > 0 && (
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-tertiary)' }}>+{p.score}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.5 }}>{p.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shared funding groups */}
          {result.sharedFundingGroups && result.sharedFundingGroups.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={14} style={{ color: 'var(--destructive)' }} /> Shared Funding Groups
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {result.sharedFundingGroups.map((g, i: number) => (
                  <div key={i} style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--hairline)',
                    background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginBottom: 2 }}>Funder</div>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                        {g.fundingSource.slice(0, 10)}...{g.fundingSource.slice(-6)}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-full)',
                      background: 'rgba(255,69,58,0.1)', color: 'var(--destructive)',
                    }}>{g.count} wallets</span>
                  </div>
                ))}
              </div>
            </div>
          )}
              </div>
              {!result.partial && !loading && (
                <ToolInlineAiAnalysis
                  cacheId="interactors"
                  title="AI Analysis"
                  prompt="Summarize this contract interactor analysis. Focus on suspicious shared funding, concentration, risk score, and what an investigator should inspect next."
                  context={{ address: result.contractAddress, chain, analysisData: result }}
                  cachedMessages={aiMessages}
                  onMessagesChange={setAiMessages}
                />
              )}
            </div>
            <div style={{ marginTop: 16 }}>
              {graphPanel}
            </div>
            </>
          )}

          {activeResultTab === 'graph' && (
            graphPanel
          )}

          {/* Interactors table */}
          {activeResultTab === 'addresses' && (
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Interacting Addresses ({result.interactors.length})
              {result.totalInteractors > result.interactors.length && (
                <span style={{ fontWeight: 400, color: 'var(--fg-tertiary)', textTransform: 'none', letterSpacing: 0 }}>
                  {' '}— showing {result.interactors.length} of {result.totalInteractors}
                </span>
              )}
            </h4>
            <div style={{
              borderRadius: 'var(--radius-xl)', border: '1px solid var(--card-border)',
              overflow: isMobile ? 'auto' : 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8,
                padding: '8px 14px', borderBottom: '1px solid var(--hairline)',
                fontSize: 10, fontWeight: 600, color: 'var(--fg-tertiary)',
                textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)',
              }}>
                <span>Address</span>
                <span>Txs</span>
                <span>Value In</span>
                <span>Value Out</span>
                <span>Funder</span>
              </div>

              {/* Rows */}
              <div style={{ maxHeight: 500, overflow: 'auto' }}>
                {result.interactors.map((ix: Interactor, i: number) => (
                  <a key={i} href={`${explorer}/address/${ix.address}`} target="_blank" rel="noreferrer"
                    style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8,
                      padding: '7px 14px', textDecoration: 'none', borderBottom: '1px solid var(--hairline)',
                      background: 'transparent', transition: 'background 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ix.address.slice(0, 10)}...{ix.address.slice(-6)}
                      {ix.label && <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--accent)' }}>({ix.label})</span>}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-secondary)' }}>
                      {ix.interactionCount ?? '—'}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                      {ix.totalValueInEth != null ? `${ix.totalValueInEth.toFixed(4)} ETH` : '—'}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-secondary)' }}>
                      {ix.totalValueOutEth != null ? `${ix.totalValueOutEth.toFixed(4)} ETH` : '—'}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ix.fundingSource ? `${ix.fundingSource.slice(0, 6)}...${ix.fundingSource.slice(-4)}` : '—'}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

const exportBtnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
  background: 'var(--card)', color: 'var(--fg)', fontSize: 11, fontFamily: 'var(--font-sans)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
};

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

function normalizeTimestamp(value: unknown): Date | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return null;
  if (n < 1_000_000_000) return null;
  return new Date(n > 10_000_000_000 ? n : n * 1000);
}

function buildInteractorsTimeline(interactors: Interactor[]) {
  const buckets = new Map<string, number>();
  for (const interactor of interactors) {
    const date = normalizeTimestamp(interactor.firstInteraction || interactor.lastInteraction);
    if (!date) continue;
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  const labels = [...buckets.keys()].sort();
  if (labels.length === 0) {
    const ranked = [...interactors]
      .sort((a, b) => (b.interactionCount || 0) - (a.interactionCount || 0))
      .slice(0, 24);
    const rankLabels = ranked.map((ix, index) => ix.address ? `${index + 1}. ${ix.address.slice(0, 6)}...${ix.address.slice(-4)}` : `#${index + 1}`);
    return {
      labels: rankLabels,
      modeLabel: 'Tx count',
      description: 'Timeline timestamps were not returned, so this chart ranks interactors by interaction count.',
      datasets: [
        {
          label: 'Interactions',
          data: ranked.map(ix => ix.interactionCount || 0),
          borderColor: 'rgba(59, 130, 246, 0.95)',
          backgroundColor: 'rgba(59, 130, 246, 0.14)',
          tension: 0.35,
          pointRadius: 2,
        },
      ],
    };
  }
  return {
    labels,
    modeLabel: 'New wallets',
    description: 'New interactors grouped by first observed interaction date.',
    datasets: [
      {
        label: 'New interactors',
        data: labels.map(label => buckets.get(label) || 0),
        borderColor: 'rgba(0, 230, 122, 0.95)',
        backgroundColor: 'rgba(0, 230, 122, 0.14)',
        tension: 0.35,
        pointRadius: 2,
      },
    ],
  };
}
