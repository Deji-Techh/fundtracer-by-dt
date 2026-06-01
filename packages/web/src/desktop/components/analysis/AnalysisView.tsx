import { useState, useMemo } from 'react';
import { useTabs } from '../../contexts/TabsContext';
import { useNotify } from '../../contexts/ToastContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { AnalysisTab } from '../../types';
import { TransactionList } from './TransactionList';
import { FundingTree } from './FundingTree';
import { FundingGraph } from './FundingGraph';
import { ContractView } from './ContractView';
import { CompareView } from './CompareView';
import { PortfolioView } from './PortfolioView';
import { ExportButton } from '../export/ExportButton';
import { InlineAiAnalysis } from './InlineAiAnalysis';
import { shareAnalysis } from '../../api/analyze';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

type SubTab = 'overview' | 'transactions' | 'funding' | 'graph' | 'portfolio';

interface AnalysisViewProps {
  tab: AnalysisTab;
}

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'funding', label: 'Funding' },
  { id: 'graph', label: 'Graph' },
  { id: 'portfolio', label: 'Portfolio' },
];

export function AnalysisView({ tab }: AnalysisViewProps) {
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const { updateTab } = useTabs();
  const notify = useNotify();
  const result = tab.result;

  const handleShare = async () => {
    try {
      const { url } = await shareAnalysis({
        address: tab.address,
        chain: tab.chain,
        type: tab.type,
        result: tab.result,
      });
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
        await writeText(url);
      }
      notify.success('Share link copied!');
    } catch {
      notify.error('Failed to create share link');
    }
  };

  const isMobile = useIsMobile();

  if (!result) return null;

  const addressLabel = isMobile && tab.address.length > 20
    ? `${tab.address.slice(0, 8)}...${tab.address.slice(-6)}`
    : tab.address;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header with address and actions */}
      <div style={{
        padding: isMobile ? '10px 14px' : '14px 20px',
        borderBottom: '1px solid var(--hairline)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: isMobile ? 8 : 0,
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {tab.chain?.toUpperCase()}
          </div>
          <div style={{
            fontSize: isMobile ? 12 : 14,
            fontWeight: 600,
            color: 'var(--fg)',
            fontFamily: 'var(--font-mono)',
            wordBreak: 'break-all',
          }}>
            {addressLabel}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: isMobile ? 'stretch' : 'flex-start' }}>
          <NewSearchButton onClick={() => updateTab(tab.id, { result: undefined, transactions: undefined, fundingData: undefined, error: undefined, address: '' })} />
          <button onClick={handleShare}
            type="button"
            style={{
              flex: isMobile ? '1 1 0' : undefined,
              justifyContent: 'center',
              minHeight: isMobile ? 38 : undefined,
              padding: isMobile ? '8px 10px' : '6px 14px', borderRadius: isMobile ? 12 : 'var(--radius-md)', border: '1px solid var(--card-border)',
              background: 'var(--bg-secondary)', color: 'var(--fg)', fontSize: 12, cursor: 'pointer',
              fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--card)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            Share
          </button>
          <ExportButton tab={tab} />
        </div>
      </div>

      {/* Sub-tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--hairline)',
        padding: isMobile ? '8px 10px' : '0 20px',
        gap: isMobile ? 6 : 0,
        flexShrink: 0,
        overflow: 'auto',
      }}>
        {SUB_TABS.map(st => (
          <button
            key={st.id}
            type="button"
            onClick={() => setSubTab(st.id)}
            style={{
              padding: isMobile ? '8px 12px' : '8px 14px',
              background: isMobile && subTab === st.id ? 'var(--card)' : 'none',
              border: isMobile ? '1px solid var(--card-border)' : 'none',
              borderBottom: isMobile ? '1px solid var(--card-border)' : (subTab === st.id ? '2px solid var(--fg)' : '2px solid transparent'),
              borderRadius: isMobile ? 999 : 0,
              color: subTab === st.id ? 'var(--fg)' : 'var(--fg-tertiary)',
              fontSize: isMobile ? 11 : 12,
              fontWeight: subTab === st.id ? 650 : 500,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (subTab !== st.id) e.currentTarget.style.color = 'var(--fg-secondary)'; }}
            onMouseLeave={e => { if (subTab !== st.id) e.currentTarget.style.color = 'var(--fg-tertiary)'; }}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content — tabs stay mounted to preserve state (AI messages, scroll, etc.) */}
      <div style={{ flex: 1 }}>
        <div style={{ display: subTab === 'overview' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflow: 'auto', padding: isMobile ? 10 : 20 }}>
          <OverviewTab tab={tab} result={result} isMobile={isMobile} />
        </div>
        <div style={{ display: subTab === 'transactions' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflow: 'auto', padding: isMobile ? 10 : 20 }}>
          <TransactionsTab tab={tab} />
        </div>
        <div style={{ display: subTab === 'funding' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflow: 'auto', padding: isMobile ? 10 : 20 }}>
          <FundingTab tab={tab} />
        </div>
        <div style={{ display: subTab === 'graph' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflow: 'auto', padding: isMobile ? 10 : 20 }}>
          <GraphTab tab={tab} />
        </div>
        <div style={{ display: subTab === 'portfolio' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflow: 'auto', padding: isMobile ? 10 : 20 }}>
          <PortfolioView address={tab.address} chain={tab.chain} />
        </div>
      </div>
    </div>
  );
}

function NewSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        padding: '6px 14px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--card-border)',
        background: 'var(--bg-secondary)',
        color: 'var(--fg)',
        fontSize: 12,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--card)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      New Search
    </button>
  );
}

/* ─── Overview Tab ─── */

const NATIVE_CURRENCY: Record<string, string> = {
  ethereum: 'ETH', base: 'ETH', arbitrum: 'ETH', optimism: 'ETH',
  polygon: 'POL', bsc: 'BNB', linea: 'ETH',
};

function OverviewTab({ tab, result, isMobile }: { tab: AnalysisTab; result: NonNullable<AnalysisTab['result']>; isMobile: boolean }) {
  const d = result as unknown as Record<string, unknown>;
  const wallet = d.wallet as Record<string, unknown> | undefined;
  const summary = d.summary as Record<string, unknown> | undefined;

  const riskScore = (d.overallRiskScore as number | undefined)
    ?? (d.riskScore as number | undefined)
    ?? (d.risk_score as number | undefined);
  const balance = (wallet?.balanceInEth as number | undefined)?.toString()
    ?? (wallet?.balance as string | undefined)
    ?? (d.balance as string | undefined);
  const txCount = (summary?.totalTransactions as number | undefined)
    ?? (wallet?.txCount as number | undefined)
    ?? (d.transactionCount as number | undefined);
  const firstSeen = (wallet?.firstTxTimestamp as number | undefined)
    ?? (d.firstSeen as number | undefined);
  const lastSeen = (wallet?.lastTxTimestamp as number | undefined)
    ?? (d.lastSeen as number | undefined);
  const walletLabel = (wallet?.label as string | undefined)
    ?? (d.label as string | undefined);
  const labels: string[] | undefined = walletLabel ? [walletLabel] : (d.labels as string[] | undefined);
  const rawIndicators = (d.suspiciousIndicators ?? d.indicators ?? d.flags) as unknown[] | undefined;
  const entityType = (wallet?.infrastructureType as string | undefined)
    ?? (d.entityType as string | undefined)
    ?? (d.entity_type as string | undefined);

  const chain = tab.chain || 'ethereum';
  const currency = NATIVE_CURRENCY[chain] || 'ETH';

  // Normalize suspicious indicators
  type IndicatorObj = { type?: string; severity?: string; description?: string; evidence?: unknown; score?: number };
  const stringIndicators: string[] = [];
  const objectIndicators: IndicatorObj[] = [];
  if (rawIndicators) {
    for (const ind of rawIndicators) {
      if (typeof ind === 'string') stringIndicators.push(ind);
      else if (ind && typeof ind === 'object') objectIndicators.push(ind as IndicatorObj);
    }
  }

  // Extract transactions for charting
  const rawTxs = (d.transactions as unknown[]) ?? [];

  // Collect suspicious tx hashes from indicators and same-block groups
  const suspiciousHashes = useMemo(() => {
    const hashes = new Set<string>();
    if (rawIndicators) {
      for (const ind of rawIndicators) {
        if (ind && typeof ind === 'object') {
          const evidence = (ind as Record<string, unknown>).evidence;
          if (Array.isArray(evidence)) {
            for (const e of evidence) {
              if (typeof e === 'string' && e.startsWith('0x') && e.length === 66) hashes.add(e.toLowerCase());
            }
          }
        }
      }
    }
    const sameBlock = d.sameBlockTransactions as Array<Record<string, unknown>> | undefined;
    if (sameBlock) {
      for (const group of sameBlock) {
        if (group.isSuspicious && Array.isArray(group.transactions)) {
          for (const tx of group.transactions) {
            if (tx && typeof tx === 'object') {
              const h = (tx as Record<string, unknown>).hash as string;
              if (h) hashes.add(h.toLowerCase());
            }
          }
        }
      }
    }
    return hashes;
  }, [rawTxs.length]);

  type TxPoint = { day: string; timestamp: number; valueInEth: number; isIncoming: boolean; hash: string; from: string; to: string; isSuspicious: boolean };
  const allPoints: TxPoint[] = [];
  for (const tx of rawTxs) {
    if (tx && typeof tx === 'object') {
      const t = tx as Record<string, unknown>;
      const hash = ((t.hash as string) || '').toLowerCase();
      allPoints.push({
        timestamp: (t.timestamp as number) || 0,
        valueInEth: (t.valueInEth as number) || 0,
        isIncoming: !!(t.isIncoming),
        hash,
        from: (t.from as string) || '',
        to: (t.to as string) || '',
        day: (t.timestamp as number) ? new Date((t.timestamp as number) * 1000).toISOString().slice(0, 10) : '',
        isSuspicious: suspiciousHashes.has(hash),
      });
    }
  }

  // Build daily bucketed data
  type ChartFilter = 'all' | 'incoming' | 'outgoing' | 'suspicious';
  const [chartFilter, setChartFilter] = useState<ChartFilter>('all');

  const chartData = useMemo(() => {
    const incoming: Record<string, number> = {};
    const outgoing: Record<string, number> = {};
    const suspiciousPts: Array<{ x: string; y: number; hash: string; from: string; to: string; isIncoming: boolean }> = [];

    for (const pt of allPoints) {
      if (!pt.day) continue;
      if (pt.isIncoming) {
        incoming[pt.day] = (incoming[pt.day] || 0) + pt.valueInEth;
      } else {
        outgoing[pt.day] = (outgoing[pt.day] || 0) + pt.valueInEth;
      }
      if (pt.isSuspicious) {
        suspiciousPts.push({
          x: pt.day, y: pt.valueInEth,
          hash: pt.hash, from: pt.from, to: pt.to, isIncoming: pt.isIncoming,
        });
      }
    }

    const allDays = new Set([...Object.keys(incoming), ...Object.keys(outgoing)]);
    const sortedDays = Array.from(allDays).sort();

    return { sortedDays, incoming, outgoing, suspiciousPts };
  }, [allPoints.length, suspiciousHashes.size]);

  // Filtered datasets based on active filter
  const datasets: Array<Record<string, unknown>> = [];
  const showIncoming = chartFilter === 'all' || chartFilter === 'incoming';
  const showOutgoing = chartFilter === 'all' || chartFilter === 'outgoing';
  const showSuspicious = chartFilter === 'all' || chartFilter === 'suspicious';

  if (showIncoming) {
    datasets.push({
      label: 'Incoming', data: chartData.sortedDays.map(d => chartData.incoming[d] || 0),
      borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)',
      borderWidth: chartFilter === 'incoming' ? 2 : 1.2, pointRadius: 0, pointHitRadius: 8,
      tension: 0.35, fill: true,
    });
  }
  if (showOutgoing) {
    datasets.push({
      label: 'Outgoing', data: chartData.sortedDays.map(d => -(chartData.outgoing[d] || 0)),
      borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.06)',
      borderWidth: chartFilter === 'outgoing' ? 2 : 1.2, pointRadius: 0, pointHitRadius: 8,
      tension: 0.35, fill: true,
    });
  }
  if (showSuspicious && chartData.suspiciousPts.length > 0) {
    datasets.push({
      label: 'Suspicious', data: chartData.suspiciousPts,
      borderColor: '#ff9f0a', backgroundColor: '#ff9f0a',
      borderWidth: 0, pointRadius: 5, pointHitRadius: 12, pointHoverRadius: 8,
      pointStyle: 'triangle', showLine: false,
    });
  }

  const hasChartData = chartData.sortedDays.length > 0;
  const suspiciousCount = chartData.suspiciousPts.length;

  // Chart theme
  const chartTextColor = getComputedStyle(document.documentElement).getPropertyValue('--fg-tertiary').trim() || '#6b6b78';
  const chartGridColor = getComputedStyle(document.documentElement).getPropertyValue('--hairline').trim() || '#282830';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16, height: '100%' }}>
      {/* ── Top Row: Left (metrics) | Right (AI analysis) ── */}
      <div style={{
        display: 'flex', gap: isMobile ? 12 : 16, flex: '0 0 auto',
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: 'wrap',
      }}>
        {/* Left eye — Metrics + indicators */}
        <div style={{
          flex: isMobile ? '0 0 auto' : '1 1 380px', minWidth: isMobile ? 0 : 320,
          display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16,
        }}>
          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(120px, max-content))', gap: isMobile ? 8 : 12 }}>
            <MetricCard
              isMobile={isMobile}
              label="Risk Score"
              value={riskScore !== undefined ? `${riskScore}/100` : 'N/A'}
              color={riskScore !== undefined ? (riskScore > 60 ? 'var(--destructive)' : riskScore > 30 ? '#ff9f0a' : 'var(--accent)') : 'var(--fg-tertiary)'}
            />
            <MetricCard isMobile={isMobile} label="Balance" value={balance ? `${Number(balance).toFixed(4)} ${currency}` : 'N/A'} color="var(--fg)" />
            <MetricCard isMobile={isMobile} label="Transactions" value={txCount !== undefined ? String(txCount) : 'N/A'} color="var(--fg)" />
            {firstSeen != null && (
              <MetricCard isMobile={isMobile} label="First Seen" value={new Date(firstSeen * 1000).toISOString().slice(0, 10)} color="var(--fg-secondary)" />
            )}
            {lastSeen != null && (
              <MetricCard isMobile={isMobile} label="Last Seen" value={new Date(lastSeen * 1000).toISOString().slice(0, 10)} color="var(--fg-secondary)" />
            )}
          </div>

          {/* Entity type + Labels row */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {entityType && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-tertiary)', marginBottom: 6, fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>
                  Entity Type
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600,
                  background: 'rgba(0,230,122,0.1)', color: 'var(--accent)', fontFamily: 'var(--font-sans)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {entityType}
                </span>
              </div>
            )}
            {labels && labels.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-tertiary)', marginBottom: 6, fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>
                  Labels
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {labels.map((l, i) => (
                    <span key={i} style={{
                      padding: '3px 10px', borderRadius: 'var(--radius-full)',
                      background: 'rgba(0,230,122,0.1)', color: 'var(--accent)',
                      fontSize: 11, fontFamily: 'var(--font-mono)',
                    }}>{l}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Suspicious indicators */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-tertiary)', marginBottom: 8, fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>
              Suspicious Indicators
            </div>
            {(stringIndicators.length > 0 || objectIndicators.length > 0) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stringIndicators.map((ind, i) => (
                  <div key={`str-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg)', fontFamily: 'var(--font-sans)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--destructive)', flexShrink: 0 }} />
                    {ind}
                  </div>
                ))}
                {objectIndicators.map((ind, i) => (
                  <div key={`obj-${i}`} style={{
                    padding: '8px 12px', borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--hairline)', background: 'var(--card)',
                    display: 'flex', flexDirection: 'column', gap: 3,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: (ind.severity === 'critical' || ind.severity === 'high') ? 'var(--destructive)' : '#ff9f0a',
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', textTransform: 'capitalize' }}>
                        {ind.type || 'Suspicious Activity'}
                      </span>
                      {ind.score !== undefined && (
                        <span style={{
                          fontSize: 10, padding: '2px 6px', borderRadius: 'var(--radius-full)',
                          background: 'rgba(255,69,58,0.1)', color: 'var(--destructive)',
                          fontFamily: 'var(--font-mono)',
                        }}>+{ind.score}</span>
                      )}
                      {ind.severity && (
                        <span style={{
                          fontSize: 10, padding: '2px 6px', borderRadius: 'var(--radius-full)',
                          background: 'var(--hover-overlay)', color: 'var(--fg-tertiary)',
                          textTransform: 'uppercase',
                        }}>{ind.severity}</span>
                      )}
                    </div>
                    {ind.description && (
                      <div style={{ fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.5 }}>{ind.description}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'var(--font-sans)' }}>
                No suspicious activity detected
              </div>
            )}
          </div>
        </div>

        {/* Right eye — AI Analysis */}
        <div style={{
          flex: isMobile ? '0 0 auto' : '1 1 420px', minWidth: 0, minHeight: isMobile ? 260 : 360,
        }}>
          <InlineAiAnalysis
            address={tab.address}
            chain={chain}
            analysisData={result}
          />
        </div>
      </div>

      {/* ── Bottom Row: Transaction flow chart (the "mouth") ── */}
      <div style={{
        flex: 1, minHeight: isMobile ? 260 : 340,
        display: 'flex', flexDirection: 'column',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--hairline)',
        background: 'var(--card)',
        padding: isMobile ? '12px 10px' : '14px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-sans)' }}>
              Transaction Flow ({currency})
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 2, borderRadius: 1, background: '#3b82f6', display: 'inline-block' }} />
                In
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 2, borderRadius: 1, background: '#f43f5e', display: 'inline-block' }} />
                Out
              </span>
              {suspiciousCount > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ff9f0a' }}>
                  <span style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '6px solid #ff9f0a', display: 'inline-block' }} />
                  {suspiciousCount} flagged
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', maxWidth: '100%' }}>
            {([
              { id: 'all' as const, label: 'All' },
              { id: 'incoming' as const, label: 'Incoming' },
              { id: 'outgoing' as const, label: 'Outgoing' },
              { id: 'suspicious' as const, label: 'Suspicious' },
            ]).map(f => (
              <button
                key={f.id}
                onClick={() => setChartFilter(f.id)}
                type="button"
                style={{
                  padding: isMobile ? '5px 10px' : '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 500, cursor: 'pointer',
                  border: chartFilter === f.id ? '1px solid var(--accent)' : '1px solid transparent',
                  background: chartFilter === f.id ? 'rgba(0,230,122,0.1)' : 'transparent',
                  color: chartFilter === f.id ? 'var(--accent)' : 'var(--fg-tertiary)',
                  fontFamily: 'var(--font-sans)', textTransform: 'capitalize', transition: 'background 150ms, border-color 150ms, color 150ms',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
          {chartFilter === 'suspicious'
            ? 'Showing only flagged transactions'
            : 'Positive = incoming, negative = outgoing'}
        </div>
        {hasChartData ? (
          <div style={{ flex: 1, minHeight: isMobile ? 210 : 270 }}>
            <Line
              data={{
                labels: chartData.sortedDays,
                datasets: datasets as any,
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                scales: {
                  x: {
                    ticks: { color: chartTextColor, font: { size: 9, family: 'var(--font-mono)' }, maxTicksLimit: 14, maxRotation: 45 },
                    grid: { color: chartGridColor },
                  },
                  y: {
                    ticks: {
                      color: chartTextColor, font: { size: 9, family: 'var(--font-mono)' },
                      callback: (v) => {
                        const n = typeof v === 'number' ? v : Number(v);
                        const abs = Math.abs(n);
                        if (abs === 0) return '0';
                        if (abs < 0.0001) return (n < 0 ? '-' : '+') + abs.toFixed(6);
                        if (abs < 1) return (n < 0 ? '-' : '') + abs.toFixed(4);
                        return (n < 0 ? '-' : '') + abs.toFixed(2);
                      },
                    },
                    grid: { color: chartGridColor },
                  },
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#1a1a20', titleColor: '#e4e4e8', bodyColor: '#a1a1aa',
                    borderColor: '#282830', borderWidth: 1, padding: 12,
                    titleFont: { size: 11, family: 'var(--font-mono)' },
                    bodyFont: { size: 11, family: 'var(--font-mono)' },
                    callbacks: {
                      label: (ctx) => {
                        const val = Number(ctx.parsed.y);
                        const abs = Math.abs(val);
                        const dir = val >= 0 ? 'In' : 'Out';
                        let label = ` ${dir}: ${abs < 0.0001 ? abs.toFixed(6) : abs.toFixed(4)} ${currency}`;
                        const raw = ctx.raw as Record<string, unknown> | undefined;
                        if (raw?.hash) {
                          label += `  |  ${raw.hash}`;
                          if (raw.from) label += `  |  From: ${(raw.from as string).slice(0, 10)}...`;
                          if (raw.to) label += `  |  To: ${(raw.to as string).slice(0, 10)}...`;
                        }
                        return label;
                      },
                    },
                  },
                },
                interaction: { intersect: false, mode: 'index' },
              }}
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-tertiary)', fontSize: 13 }}>
            No transaction history available
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, isMobile }: { label: string; value: string; color: string; isMobile?: boolean }) {
  return (
    <div style={{
      padding: isMobile ? '10px 11px' : '14px 18px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--card-border)',
      minWidth: 0,
      overflow: 'hidden',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-tertiary)', marginBottom: 6, fontFamily: 'var(--font-sans)', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: isMobile ? 15 : 20, fontWeight: 700, color, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  );
}

/* ─── Transactions Tab ─── */

function TransactionsTab({ tab }: { tab: AnalysisTab }) {
  const raw = tab.transactions;
  let txList: unknown[] = [];
  if (Array.isArray(raw)) {
    txList = raw;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    txList = (obj.transactions as unknown[]) || (obj.data as unknown[]) || (obj.result as unknown[]) || (obj.txs as unknown[]) || [];
  }

  return (
    <TransactionList transactions={txList as any[]} chain={tab.chain} />
  );
}

/* ─── Funding Tab ─── */

function FundingTab({ tab }: { tab: AnalysisTab }) {
  const funding = tab.fundingData as unknown as Record<string, unknown> | undefined;
  const resultData = (funding?.result as Record<string, unknown> | undefined) ?? funding;
  const rawSources = resultData?.fundingSources || funding?.sources || funding?.fundingSources;
  const rawDestinations = resultData?.fundingDestinations || funding?.destinations || funding?.fundingDestinations;

  // API returns single FundingNode objects; FundingTree expects arrays
  const sources = rawSources
    ? (Array.isArray(rawSources) ? rawSources : [rawSources]) as any[]
    : [];
  const destinations = rawDestinations
    ? (Array.isArray(rawDestinations) ? rawDestinations : [rawDestinations]) as any[]
    : [];

  return (
    <FundingTree
      sources={sources}
      destinations={destinations}
      targetAddress={tab.address}
      chain={tab.chain}
    />
  );
}

function GraphTab({ tab }: { tab: AnalysisTab }) {
  const funding = tab.fundingData as unknown as Record<string, unknown> | undefined;
  const resultData = (funding?.result as Record<string, unknown> | undefined) ?? funding;
  const rawSources = resultData?.fundingSources || funding?.sources || funding?.fundingSources;
  const rawDestinations = resultData?.fundingDestinations || funding?.destinations || funding?.fundingDestinations;

  const sources = rawSources
    ? (Array.isArray(rawSources) ? rawSources : [rawSources]) as any[]
    : [];
  const destinations = rawDestinations
    ? (Array.isArray(rawDestinations) ? rawDestinations : [rawDestinations]) as any[]
    : [];

  if (sources.length === 0 && destinations.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 13 }}>
        Run a full analysis to generate the interactive funding graph.
      </div>
    );
  }

  return (
    <FundingGraph
      sources={sources}
      destinations={destinations}
      targetAddress={tab.address}
    />
  );
}
