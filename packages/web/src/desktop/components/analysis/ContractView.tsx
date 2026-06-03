import { useState, useEffect } from 'react';
import { useTabs } from '../../contexts/TabsContext';
import { analyzeContract } from '../../api/analyze';
import { useNotify } from '../../contexts/ToastContext';
import { ChainSelector } from '../common/ChainSelector';
import { ExternalLink, Copy, FileCode, AlertTriangle, Activity, Users } from 'lucide-react';
import type { AnalysisTab, ChainId } from '../../types';
import { CompactSearchForm } from './CompactSearchForm';
import { ProgressiveLoader } from './ProgressiveLoader';

export function ContractView() {
  const { tabs, activeTabId, openTab, setActiveTab } = useTabs();
  const notify = useNotify();

  const [address, setAddress] = useState('');
  const [chain, setChain] = useState<ChainId>('ethereum');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    const trimmed = address.trim();
    if (!trimmed) { notify.error('Please enter a contract address'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await analyzeContract(trimmed, chain);
      const data = res as unknown as Record<string, unknown>;
      setResult((data.result || data) as unknown as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileCode size={20} style={{ color: 'var(--accent)' }} /> Contract Analysis
      </h2>

      <div style={{ marginBottom: 20 }}>
        <CompactSearchForm
          value={address}
          onChange={setAddress}
          onSubmit={handleAnalyze}
          placeholder="0x.. or ENS"
          ariaLabel="Contract address"
          loading={loading}
          disabled={loading}
          submitLabel="Analyze"
          loadingLabel="Analyzing"
          hideInputIcon
          showSubmitTextOnMobile
          leftSlot={<ChainSelector value={chain} onChange={setChain} compact />}
        />
      </div>

      {loading && (
        <ProgressiveLoader
          title="Scanning contract"
          steps={['Collecting interactors', 'Checking shared funders', 'Scoring suspicious patterns']}
        />
      )}
      {error && <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--card)', border: '1px solid var(--destructive)', color: 'var(--destructive)', fontSize: 13 }}>{error}</div>}

      {result && (
        <div>
          <ContractResult data={result} chain={chain} />
        </div>
      )}

      {!result && !loading && !error && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 13 }}>
          Enter a smart contract address to analyze its interactions, detect sybil clusters, and discover shared funding sources.
        </div>
      )}
    </div>
  );
}

function ContractResult({ data, chain }: { data: Record<string, unknown>; chain: string }) {
  const interactors = (data.interactors || data.users || data.participants || []) as Array<Record<string, unknown>>;
  const sybilClusters = (data.sybilClusters || data.clusters || data.sybil || []) as Array<Record<string, unknown>>;
  const sharedFunding = (data.sharedFunding || data.fundingSources || data.commonSources || []) as Array<Record<string, unknown>>;
  const riskScore = data.riskScore as number | undefined;
  const totalInteractors = data.totalInteractors as number | undefined;
  const contractName = data.contractName as string | undefined;

  return (
    <div>
      {/* Metric cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <MetricCard icon={<Activity size={16} />} label="Risk Score" value={riskScore !== undefined ? `${riskScore}/100` : 'N/A'} color={riskScore !== undefined && riskScore > 60 ? 'var(--destructive)' : 'var(--accent)'} />
        <MetricCard icon={<Users size={16} />} label="Interactors" value={totalInteractors !== undefined ? String(totalInteractors) : '0'} color="var(--fg)" />
        <MetricCard icon={<AlertTriangle size={16} />} label="Sybil Clusters" value={String(sybilClusters.length)} color="var(--warning)" />
        <MetricCard icon={<FileCode size={16} />} label="Shared Funders" value={String(sharedFunding.length)} color="var(--accent)" />
      </div>

      {/* Contract name */}
      {contractName && (
        <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(0,230,122,0.1)', border: '1px solid var(--accent)', display: 'inline-block' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>{contractName}</span>
        </div>
      )}

      {/* Sybil clusters */}
      {sybilClusters.length > 0 && (
        <Section title={`Sybil Clusters (${sybilClusters.length})`} icon={<AlertTriangle size={14} />}>
          {sybilClusters.map((cluster, i) => {
            const members = cluster.members || cluster.addresses || [];
            const count = Array.isArray(members) ? members.length : 0;
            return (
              <div key={i} style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--card)', border: '1px solid var(--hairline)', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>
                  Cluster {i + 1} ({count} wallets)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {Array.isArray(members) && members.slice(0, 10).map((addr: unknown, j: number) => (
                    <span key={j} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-tertiary)', background: 'var(--hover-overlay)', padding: '2px 6px', borderRadius: 'var(--radius-md)' }}>
                      {String(addr).slice(0, 10)}...
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* Shared funding sources */}
      {sharedFunding.length > 0 && (
        <Section title={`Shared Funding Sources (${sharedFunding.length})`} icon={<FileCode size={14} />}>
          {sharedFunding.map((source, i) => (
            <div key={i} style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--card)', border: '1px solid var(--hairline)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg)' }}>
                {String(source.address || source.source || source.funder || source.from || '').slice(0, 16)}...
              </span>
              <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>
                {source.count || source.wallets ? `${source.count || source.wallets} wallets` : ''}
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Top interactors */}
      {interactors.length > 0 && (
        <Section title={`Top Interactors (${interactors.length})`} icon={<Users size={14} />}>
          {interactors.slice(0, 20).map((user, i) => (
            <div key={i} style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{String(user.address || user.wallet || '').slice(0, 20)}...</span>
              <span style={{ color: 'var(--fg-tertiary)' }}>{String(user.txCount || user.transactions || user.count || '')}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--card)', border: '1px solid var(--hairline)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-tertiary)', marginBottom: 8 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}</div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon} {title}
      </h4>
      {children}
    </div>
  );
}
