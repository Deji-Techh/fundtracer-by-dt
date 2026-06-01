import { useEffect, useMemo, useRef, useState } from 'react';
import { compareWallets } from '../../api/analyze';
import { useNotify } from '../../contexts/ToastContext';
import { Loader } from '../common/Loader';
import { ChainSelector } from '../common/ChainSelector';
import { GitCompare, Plus, X, ArrowRightLeft, Shield, Link, Sparkles } from 'lucide-react';
import type { ChainId } from '../../types';
import { sendChatMessage } from '../../api/chat';
import { MarkdownContent } from './MarkdownContent';
import { clearCompareState, getCompareState, saveCompareState } from '../../stores/compareState';
import { useTabs } from '../../contexts/TabsContext';
import { FundingGraph } from './FundingGraph';
import { InputStage } from './CompactSearchForm';
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

type CompareResultData = Record<string, unknown>;
type CompareTab = 'overview' | 'graph' | 'detailed';

export function CompareView() {
  const notify = useNotify();
  const { activeTabId } = useTabs();
  const scopeKey = activeTabId || 'global';
  const [addresses, setAddresses] = useState<string[]>(['', '']);
  const [chain, setChain] = useState<ChainId>('ethereum');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [activeTab, setActiveTab] = useState<CompareTab>('overview');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = getCompareState(scopeKey);
    setAddresses(initial.addresses);
    setChain(initial.chain);
    setResult(initial.result);
    setAiMessages(initial.aiMessages || []);
    setActiveTab(initial.activeTab || 'overview');
    setError(null);
    setHydrated(true);
  }, [scopeKey]);

  useEffect(() => {
    if (!hydrated) return;
    saveCompareState({
      addresses,
      chain,
      result,
      aiMessages,
      activeTab,
    }, scopeKey);
  }, [addresses, chain, result, aiMessages, activeTab, hydrated, scopeKey]);

  const addRow = () => { if (addresses.length < 10) setAddresses([...addresses, '']); };
  const removeRow = (i: number) => { if (addresses.length > 2) setAddresses(addresses.filter((_, idx) => idx !== i)); };
  const updateAddr = (i: number, val: string) => {
    const next = [...addresses];
    next[i] = val;
    setAddresses(next);
  };

  const handleCompare = async () => {
    const valid = addresses.map(a => a.trim()).filter(Boolean);
    if (valid.length < 2) {
      notify.error('Enter at least 2 addresses to compare');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setAiMessages([]);
    setActiveTab('overview');
    try {
      const res = await compareWallets(valid, chain);
      const data = res as unknown as Record<string, unknown>;
      // Match web behavior: use result payload and force plain JSON-safe object shape.
      const payload = (data.result || data) as Record<string, unknown>;
      setResult(JSON.parse(JSON.stringify(payload)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  const resetCompare = () => {
    setResult(null);
    setError(null);
    setAddresses(['', '']);
    setAiMessages([]);
    setActiveTab('overview');
    clearCompareState(scopeKey);
  };

  return (
    <div style={{ padding: 20, height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {result && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <GitCompare size={20} style={{ color: 'var(--accent)' }} /> Compare Wallets
          </h2>
          <button
            onClick={resetCompare}
            style={{
              padding: '7px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--card-border)',
              background: 'var(--bg-secondary)',
              color: 'var(--fg)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            New Compare
          </button>
        </div>
      )}

      {!result && (
        <InputStage
          title="Compare Analysis"
          maxWidth={640}
          hint="Paste 2 or more wallet addresses to compare activity and correlations"
        >
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {addresses.map((addr, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)', minWidth: 20 }}>
                  {i + 1}.
                </span>
                <input type="text" value={addr}
                  onChange={e => updateAddr(i, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && i === addresses.length - 1) handleCompare(); }}
                  placeholder="0x... or ENS"
                  spellCheck={false}
                  style={{
                    flex: 1, height: 42, minWidth: 0, padding: '0 13px', borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--card-border)', background: 'var(--card)',
                    color: 'var(--fg)', fontSize: 12, fontFamily: 'var(--font-mono)', outline: 'none',
                  }}
                />
                {addresses.length > 2 && (
                  <button
                    onClick={() => removeRow(i)}
                    style={{ padding: 6, borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--fg-tertiary)', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {addresses.length < 10 && (
              <button
                onClick={addRow}
                style={{
                  padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--card-border)',
                  background: 'transparent', color: 'var(--fg-tertiary)', fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
                }}
              >
                <Plus size={12} /> Add address
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <ChainSelector value={chain} onChange={setChain} />
            <button
              onClick={handleCompare}
              disabled={loading}
              style={{
                padding: '10px 24px', borderRadius: 'var(--radius-lg)', border: 'none',
                background: loading ? 'var(--hover-overlay)' : 'var(--accent)',
                color: loading ? 'var(--fg-tertiary)' : '#000', fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? 'Comparing...' : 'Compare'}
            </button>
          </div>
        </InputStage>
      )}

      {loading && <Loader />}
      {error && <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--card)', border: '1px solid var(--destructive)', color: 'var(--destructive)', fontSize: 13 }}>{error}</div>}
      {result && (
        <CompareOverview
          data={result}
          chain={chain}
          aiMessages={aiMessages}
          onAiMessagesChange={setAiMessages}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}
    </div>
  );
}

function normalizePercentNumber(raw: unknown): number | null {
  if (typeof raw !== 'number' || Number.isNaN(raw)) return null;
  const pct = raw <= 1 ? raw * 100 : raw;
  return Math.max(0, Math.min(100, pct));
}

function formatPercent(raw: unknown): string {
  const pct = normalizePercentNumber(raw);
  return pct === null ? 'N/A' : `${pct.toFixed(0)}%`;
}

function shortAddress(v: unknown): string {
  const s = String(v || '');
  if (!s) return 'Unknown';
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}...${s.slice(-4)}`;
}

function asWalletAddress(wallet: unknown): string {
  if (!wallet || typeof wallet !== 'object') return String(wallet || '');
  const w = wallet as Record<string, unknown>;
  const innerWallet = w.wallet as Record<string, unknown> | undefined;
  return String(innerWallet?.address || w.address || '');
}

function CompareOverview({
  data,
  chain,
  aiMessages,
  onAiMessagesChange,
  activeTab,
  onTabChange,
}: {
  data: CompareResultData;
  chain: ChainId;
  aiMessages: AiMessage[];
  onAiMessagesChange: (messages: AiMessage[]) => void;
  activeTab: CompareTab;
  onTabChange: (tab: CompareTab) => void;
}) {
  const wallets = (data.wallets || []) as Array<unknown>;
  const commonFundingSources = (data.commonFundingSources || data.commonSources || data.commonFunding || data.sharedSources || []) as Array<unknown>;
  const commonDestinations = (data.commonDestinations || []) as Array<unknown>;
  const directTransfers = (data.directTransfers || []) as Array<unknown>;
  const sharedProjects = (data.sharedProjects || data.sharedInteractions || data.sharedContracts || []) as Array<unknown>;
  const sybilScore = data.sybilScore as number | undefined;
  const correlationScore = data.correlationScore as number | undefined;
  const sybilPct = normalizePercentNumber(sybilScore);
  const correlationPct = normalizePercentNumber(correlationScore);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {chain.toUpperCase()} Overview
      </div>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--hairline)', paddingBottom: 4 }}>
        {(['overview', 'graph', 'detailed'] as CompareTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            style={{
              padding: '6px 10px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: activeTab === tab ? 'var(--hover-overlay)' : 'transparent',
              color: activeTab === tab ? 'var(--fg)' : 'var(--fg-tertiary)',
              cursor: 'pointer',
              fontSize: 11,
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
      <>
      {/* 2 eyes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Left eye: analysis */}
        <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-lg)', background: 'var(--card)', padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>
            <ArrowRightLeft size={14} /> Analysis
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginBottom: 12 }}>
            <MetricCard icon={<Shield size={14} />} label="Sybil Correlation" value={formatPercent(sybilScore)} color={sybilPct !== null && sybilPct > 50 ? 'var(--destructive)' : 'var(--accent)'} />
            <MetricCard icon={<ArrowRightLeft size={14} />} label="Wallet Correlation" value={formatPercent(correlationScore)} color={correlationPct !== null && correlationPct > 50 ? 'var(--warning)' : 'var(--fg)'} />
            <MetricCard icon={<Link size={14} />} label="Common Sources" value={String(commonFundingSources.length)} color="var(--accent)" />
            <MetricCard icon={<GitCompare size={14} />} label="Shared Activity" value={String(sharedProjects.length)} color="var(--fg)" />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {wallets.map((wallet, i) => (
              <span
                key={`${asWalletAddress(wallet)}-${i}`}
                style={{
                  padding: '5px 9px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--hairline)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--fg-secondary)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {shortAddress(asWalletAddress(wallet))}
              </span>
            ))}
          </div>
        </div>

        {/* Right eye: AI analysis */}
        <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-lg)', background: 'var(--card)', padding: 14 }}>
          <CompareInlineAiAnalysis
            chain={chain}
            data={data}
            addresses={wallets.map(asWalletAddress).filter(Boolean)}
            cachedMessages={aiMessages}
            onMessagesChange={onAiMessagesChange}
          />
        </div>
      </div>
      <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-lg)', background: 'var(--card)', padding: 14 }}>
        <CompareActivityChart wallets={wallets} mode="analysis-like" />
      </div>
      </>
      )}
      {activeTab === 'graph' && (
        <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-lg)', background: 'var(--card)', padding: 10, height: 'calc(100vh - 190px)', minHeight: 560 }}>
          <CompareNodeGraph
            wallets={wallets}
            commonFundingSources={commonFundingSources}
            commonDestinations={commonDestinations}
          />
        </div>
      )}
      {activeTab === 'detailed' && (
        <DetailedCompareGrid
          chain={chain}
          commonFundingSources={commonFundingSources}
          commonDestinations={commonDestinations}
          directTransfers={directTransfers}
          sharedProjects={sharedProjects}
        />
      )}
    </div>
  );
}

function CompareNodeGraph({
  wallets,
  commonFundingSources,
  commonDestinations,
}: {
  wallets: Array<unknown>;
  commonFundingSources: Array<unknown>;
  commonDestinations: Array<unknown>;
}) {
  const walletAddresses = wallets.map(asWalletAddress).filter(Boolean);
  const targetAddress = walletAddresses[0] || 'compare-cluster';

  const sourceNodes = useMemo(() => {
    const list = commonFundingSources
      .map((x) => {
        const rec = (x && typeof x === 'object') ? x as Record<string, unknown> : undefined;
        const addr = String(rec?.address || rec?.source || x || '');
        if (!addr) return null;
        return {
          address: addr,
          label: shortAddress(addr),
          depth: 0,
          entityType: 'wallet',
          txCount: Number(rec?.txCount || rec?.count || 0),
          totalValueInEth: Number(rec?.value || rec?.totalValueInEth || 0),
          children: [{ address: targetAddress, label: shortAddress(targetAddress), depth: 1, entityType: 'wallet' }],
        };
      })
      .filter(Boolean) as any[];
    return list;
  }, [commonFundingSources, targetAddress]);

  const destinationNodes = useMemo(() => {
    const list = commonDestinations
      .map((x) => {
        const rec = (x && typeof x === 'object') ? x as Record<string, unknown> : undefined;
        const addr = String(rec?.address || rec?.destination || x || '');
        if (!addr) return null;
        return {
          address: targetAddress,
          label: shortAddress(targetAddress),
          depth: 0,
          entityType: 'wallet',
          children: [{ address: addr, label: shortAddress(addr), depth: 1, entityType: 'wallet' }],
        };
      })
      .filter(Boolean) as any[];
    return list;
  }, [commonDestinations, targetAddress]);

  if (sourceNodes.length === 0 && destinationNodes.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 13 }}>
        No funding graph data found for this comparison.
      </div>
    );
  }

  return (
    <FundingGraph
      sources={sourceNodes}
      destinations={destinationNodes}
      targetAddress={targetAddress}
    />
  );
}

interface AiMessage {
  role: 'assistant' | 'user';
  content: string;
}

function CompareInlineAiAnalysis({
  chain,
  data,
  addresses,
  cachedMessages,
  onMessagesChange,
}: {
  chain: ChainId;
  data: CompareResultData;
  addresses: string[];
  cachedMessages: AiMessage[];
  onMessagesChange: (messages: AiMessage[]) => void;
}) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState('');
  const loadedRef = useRef(false);
  const dataSignature = useMemo(() => JSON.stringify(data).slice(0, 20000), [data]);

  useEffect(() => {
    // New compare result in same tab should trigger a fresh AI pass when no cached messages exist.
    loadedRef.current = false;
    setStreaming('');
    if (cachedMessages.length === 0) setMessages([]);
  }, [dataSignature, cachedMessages.length]);

  useEffect(() => {
    if (loadedRef.current || !data) return;
    loadedRef.current = true;
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages);
      return;
    }
    void runInitial();
  }, [data, cachedMessages]);

  useEffect(() => {
    onMessagesChange(messages);
  }, [messages, onMessagesChange]);

  const runInitial = async () => {
    setLoading(true);
    try {
      const prompt = `Analyze this wallet comparison on ${chain} and provide:
1) Correlation risk summary
2) Common funding/source insights
3) Direct transfer and shared-activity interpretation
4) Whether this looks sybil-like and why
5) Brief investigation next steps`;

      let fullReply = '';
      await sendChatMessage(
        'inline-compare-analysis',
        prompt,
        { address: addresses[0], chain, analysisData: JSON.stringify(data).slice(0, 20000) },
        [],
        undefined,
        (chunk) => {
          fullReply += chunk;
          setStreaming(fullReply);
        },
      );

      setMessages([{ role: 'assistant', content: fullReply }]);
      setStreaming('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate compare AI analysis';
      setMessages([{ role: 'assistant', content: `Failed to generate analysis: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setLoading(true);
    const userMsg: AiMessage = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      let fullReply = '';
      await sendChatMessage(
        'inline-compare-analysis',
        q,
        { address: addresses[0], chain, analysisData: JSON.stringify(data).slice(0, 20000) },
        history,
        undefined,
        (chunk) => {
          fullReply += chunk;
          setStreaming(fullReply);
        },
      );

      setMessages(prev => [...prev, { role: 'assistant', content: fullReply }]);
      setStreaming('');
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to get response.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 230 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>
        <Sparkles size={14} /> AI Analysis
      </div>
      <div style={{ flex: 1, overflow: 'auto', marginBottom: 8 }}>
        {loading && messages.length === 0 && !streaming && (
          <div style={{ fontSize: 12, color: 'var(--fg-tertiary)' }}>Analyzing compare result...</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            {msg.role === 'assistant' ? (
              <div style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.55 }}>
                <MarkdownContent text={msg.content} />
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{msg.content}</div>
            )}
          </div>
        ))}
        {streaming && (
          <div style={{ fontSize: 12, color: 'var(--fg)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
            {streaming}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleFollowUp(); }}
          placeholder="Ask follow-up..."
          disabled={loading}
          style={{
            flex: 1, padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
            background: 'var(--bg-secondary)', color: 'var(--fg)', fontSize: 12, outline: 'none',
          }}
        />
        <button
          onClick={handleFollowUp}
          disabled={loading || !input.trim()}
          style={{
            padding: '7px 10px', borderRadius: 'var(--radius-md)', border: 'none',
            background: input.trim() && !loading ? 'var(--accent)' : 'var(--card-border)',
            color: input.trim() && !loading ? '#000' : 'var(--fg-tertiary)',
            fontSize: 12, cursor: input.trim() && !loading ? 'pointer' : 'default',
          }}
        >
          Ask
        </button>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '10px 11px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--hairline)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-tertiary)', marginBottom: 5 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}</div>
    </div>
  );
}

function CompareActivityChart({ wallets, mode }: { wallets: Array<unknown>; mode?: 'analysis-like' | 'simple' }) {
  const palette = ['#00e67a', '#28a0f0', '#f0b90b', '#ff0420', '#8247e5', '#ff8c42'];
  const [chartFilter, setChartFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');

  const chart = useMemo(() => {
    const dayMapIn = new Map<string, number[]>();
    const dayMapOut = new Map<string, number[]>();
    const labelsByWallet: string[] = [];

    wallets.forEach((wallet, walletIdx) => {
      const w = (wallet && typeof wallet === 'object') ? wallet as Record<string, unknown> : {};
      const innerWallet = (w.wallet && typeof w.wallet === 'object') ? w.wallet as Record<string, unknown> : undefined;
      const walletAddress = String(innerWallet?.address || w.address || `Wallet ${walletIdx + 1}`);
      labelsByWallet.push(shortAddress(walletAddress));

      const txs = (w.transactions || []) as Array<Record<string, unknown>>;
      for (const tx of txs) {
        const ts = Number(tx.timestamp || 0);
        if (!ts) continue;
        const day = new Date(ts * 1000).toISOString().slice(0, 10);
        if (!dayMapIn.has(day)) dayMapIn.set(day, new Array(wallets.length).fill(0));
        if (!dayMapOut.has(day)) dayMapOut.set(day, new Array(wallets.length).fill(0));
        const from = String(tx.from || '').toLowerCase();
        const to = String(tx.to || '').toLowerCase();
        const addrLower = walletAddress.toLowerCase();
        const explicit = typeof tx.isIncoming === 'boolean' ? tx.isIncoming : undefined;
        const isIncoming = explicit !== undefined ? explicit : (to === addrLower && from !== addrLower);
        if (isIncoming) {
          const row = dayMapIn.get(day);
          if (row) row[walletIdx] += 1;
        } else {
          const row = dayMapOut.get(day);
          if (row) row[walletIdx] += 1;
        }
      }
    });

    const days = Array.from(new Set([...dayMapIn.keys(), ...dayMapOut.keys()])).sort();
    const datasets: Array<Record<string, unknown>> = [];
    for (let walletIdx = 0; walletIdx < labelsByWallet.length; walletIdx += 1) {
      if (chartFilter === 'all' || chartFilter === 'incoming') {
        datasets.push({
          label: `${labelsByWallet[walletIdx]} In`,
          data: days.map(day => (dayMapIn.get(day)?.[walletIdx] || 0)),
          borderColor: palette[walletIdx % palette.length],
          backgroundColor: 'transparent',
          borderWidth: chartFilter === 'incoming' ? 2 : 1.2,
          pointRadius: 0,
          pointHitRadius: 8,
          tension: 0.28,
        });
      }
      if (chartFilter === 'all' || chartFilter === 'outgoing') {
        datasets.push({
          label: `${labelsByWallet[walletIdx]} Out`,
          data: days.map(day => -(dayMapOut.get(day)?.[walletIdx] || 0)),
          borderColor: palette[walletIdx % palette.length],
          backgroundColor: 'transparent',
          borderWidth: chartFilter === 'outgoing' ? 2 : 1.2,
          borderDash: [5, 3],
          pointRadius: 0,
          pointHitRadius: 8,
          tension: 0.28,
          alpha: 0.8,
        });
      }
    }

    return { days, datasets };
  }, [wallets, chartFilter]);

  if (!chart.days.length) {
    return (
      <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', padding: '20px 6px' }}>
        No timestamped activity points available for graphing yet.
      </div>
    );
  }

  return (
    <div style={{ minHeight: 320 }}>
      {mode === 'analysis-like' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>Transaction Flow (counts)</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {(['all', 'incoming', 'outgoing'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setChartFilter(f)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 10,
                    border: chartFilter === f ? '1px solid var(--accent)' : '1px solid transparent',
                    background: chartFilter === f ? 'rgba(0,230,122,0.1)' : 'transparent',
                    color: chartFilter === f ? 'var(--accent)' : 'var(--fg-tertiary)',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginBottom: 8 }}>
            Positive = incoming, negative = outgoing
          </div>
        </>
      )}
      <div style={{ height: 300 }}>
      <Line
        data={{ labels: chart.days, datasets: chart.datasets as any }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#a1a1aa' } },
            tooltip: { mode: 'index', intersect: false },
          },
          scales: {
            x: { ticks: { color: '#86868b', maxTicksLimit: 8 }, grid: { color: 'rgba(120,120,128,0.12)' } },
            y: { ticks: { color: '#86868b' }, grid: { color: 'rgba(120,120,128,0.12)' }, beginAtZero: true },
          },
        }}
      />
      </div>
    </div>
  );
}

function DetailedCompareGrid({
  chain,
  commonFundingSources,
  commonDestinations,
  directTransfers,
  sharedProjects,
}: {
  chain: ChainId;
  commonFundingSources: Array<unknown>;
  commonDestinations: Array<unknown>;
  directTransfers: Array<unknown>;
  sharedProjects: Array<unknown>;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <DetailCard title="Common Funding Sources" chain={chain} items={commonFundingSources} valueOf={(v) => String((v as any)?.address || (v as any)?.source || v || '')} explorerOf={(v) => explorerUrl(chain, String((v as any)?.address || (v as any)?.source || v || ''), 'address')} />
      <DetailCard title="Common Destinations" chain={chain} items={commonDestinations} valueOf={(v) => String((v as any)?.address || (v as any)?.destination || v || '')} explorerOf={(v) => explorerUrl(chain, String((v as any)?.address || (v as any)?.destination || v || ''), 'address')} />
      <DetailCard title="Direct Transfers" chain={chain} items={directTransfers} valueOf={(v) => {
        const x = v as any;
        return `${shortAddress(x?.from)} -> ${shortAddress(x?.to)} ${x?.value ? `(${String(x.value).slice(0, 8)})` : ''}`;
      }} explorerOf={(v) => {
        const x = v as any;
        return explorerUrl(chain, String(x?.hash || ''), 'tx');
      }} />
      <DetailCard title="Shared Activity / Projects" chain={chain} items={sharedProjects} valueOf={(v) => {
        const x = v as any;
        return String(x?.projectName || x?.contractAddress || x?.address || x || '');
      }} explorerOf={(v) => {
        const x = v as any;
        const addr = String(x?.contractAddress || x?.address || '');
        return addr ? explorerUrl(chain, addr, 'address') : null;
      }} />
    </div>
  );
}

function explorerBase(chain: ChainId): string {
  switch (chain) {
    case 'ethereum': return 'https://etherscan.io';
    case 'base': return 'https://basescan.org';
    case 'arbitrum': return 'https://arbiscan.io';
    case 'optimism': return 'https://optimistic.etherscan.io';
    case 'polygon': return 'https://polygonscan.com';
    case 'bsc': return 'https://bscscan.com';
    case 'linea': return 'https://lineascan.build';
    default: return 'https://etherscan.io';
  }
}

function explorerUrl(chain: ChainId, value: string, kind: 'address' | 'tx'): string | null {
  const clean = value.trim();
  if (!clean) return null;
  const base = explorerBase(chain);
  return kind === 'tx' ? `${base}/tx/${clean}` : `${base}/address/${clean}`;
}

function DetailCard({
  title,
  chain,
  items,
  valueOf,
  explorerOf,
}: {
  title: string;
  chain: ChainId;
  items: Array<unknown>;
  valueOf: (v: unknown) => string;
  explorerOf: (v: unknown) => string | null;
}) {
  return (
    <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-lg)', background: 'var(--card)', padding: 12, minHeight: 220 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--fg-tertiary)' }}>No data.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflow: 'auto' }}>
          {items.map((item, idx) => (
            <div
              key={idx}
              style={{ fontSize: 11, color: 'var(--fg-secondary)', fontFamily: 'var(--font-mono)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', padding: '6px 8px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget.querySelector('[data-open-link]') as HTMLElement | null;
                if (btn) btn.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget.querySelector('[data-open-link]') as HTMLElement | null;
                if (btn) btn.style.opacity = '0';
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{valueOf(item)}</span>
              {explorerOf(item) ? (
                <a
                  data-open-link
                  href={explorerOf(item) || '#'}
                  target="_blank"
                  rel="noreferrer"
                  style={{ opacity: 0, transition: 'opacity 120ms', color: 'var(--accent)', fontSize: 10, textDecoration: 'none', flexShrink: 0 }}
                  title={`Open in ${explorerBase(chain)}`}
                >
                  Open
                </a>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
