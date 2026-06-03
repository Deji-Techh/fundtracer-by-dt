import { useEffect, useMemo, useRef, useState } from 'react';
import { useChain } from '../../contexts/ChainContext';
import { ChainSelector } from '../common/ChainSelector';
import { useNotify } from '../../contexts/ToastContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { scanContract, scanContractRich, analyzeContract } from '../../api/analyze';
import { addHistory } from '../../stores/history';
import { useTabs } from '../../contexts/TabsContext';
import { sendChatMessage } from '../../api/chat';
import { MarkdownContent } from './MarkdownContent';
import { clearContractScannerState, getContractScannerState, saveContractScannerState } from '../../stores/contractScannerState';
import { CompactSearchForm, InputStage } from './CompactSearchForm';
import { ProgressiveLoader } from './ProgressiveLoader';

interface WalletInteraction {
  address: string;
  interactionCount: number;
  firstSeen: number;
  lastSeen: number;
  sent: number;
  received: number;
  category?: string;
  uniqueAssets?: number;
  fundingSource?: string;
}

interface SharedFundingGroup {
  fundingSource: string;
  wallets: string[];
  count: number;
  totalInteractions: number;
  totalSent: number;
  totalReceived: number;
  categories: string[];
}

interface ScanResult {
  contractAddress: string;
  contractName?: string;
  contractSymbol?: string;
  contractType?: string;
  creator?: string;
  creationDate?: string;
  creationTx?: string;
  ethBalance?: number;
  chain?: string;
  totalInteractors?: number;
  totalTransfers?: number;
  uniqueWallets?: number;
  incomingTransfers?: number;
  outgoingTransfers?: number;
  categoryBreakdown?: Record<string, number>;
  walletInteractions?: WalletInteraction[];
  riskScore?: number;
  scanDuration?: number;
}

type ScannerTab = 'overview' | 'interactors' | 'shared-funding';
interface AiMessage { role: 'assistant' | 'user'; content: string; }

function normalizeScanResult(raw: Record<string, unknown>): ScanResult {
  if (raw.contractAddress) return raw as unknown as ScanResult;
  const contract = (raw.contract || {}) as Record<string, unknown>;
  const stats = (raw.stats || {}) as Record<string, unknown>;
  const wallets = (raw.wallets || raw.walletInteractions || []) as WalletInteraction[];
  return {
    contractAddress: (contract.address as string) || '',
    contractName: (contract.name as string) || undefined,
    contractSymbol: (contract.symbol as string) || undefined,
    contractType: (contract.type as string) || undefined,
    creator: (contract.creator as string) || undefined,
    creationDate: (contract.createdAt as string) || undefined,
    creationTx: (contract.creationTxHash as string) || undefined,
    ethBalance: contract.balanceETH != null ? parseFloat(contract.balanceETH as string) : undefined,
    chain: (raw.chain as string) || undefined,
    totalInteractors: (stats.uniqueWallets != null ? stats.uniqueWallets as number : wallets.length) || undefined,
    totalTransfers: stats.totalTransfers != null ? (stats.totalTransfers as number) : undefined,
    uniqueWallets: stats.uniqueWallets != null ? (stats.uniqueWallets as number) : undefined,
    incomingTransfers: stats.incomingTransfers != null ? (stats.incomingTransfers as number) : undefined,
    outgoingTransfers: stats.outgoingTransfers != null ? (stats.outgoingTransfers as number) : undefined,
    categoryBreakdown: (stats.categoryCounts as Record<string, number>) || undefined,
    walletInteractions: wallets,
    riskScore: (raw.riskScore as number) ?? 0,
    scanDuration: (raw.scanDurationMs as number) || (raw.scanDuration as number) || undefined,
  };
}

function explorerBase(chain: string): string {
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

export function ContractScannerView() {
  const { activeTabId } = useTabs();
  const scopeKey = activeTabId || 'global';
  const { chain, setChain } = useChain();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof WalletInteraction>('interactionCount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<ScannerTab>('overview');
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const notify = useNotify();
  const { openTab } = useTabs();
  const isMobile = useIsMobile();

  useEffect(() => {
    const saved = getContractScannerState(scopeKey);
    setAddress(saved.address || '');
    setResult(saved.result as ScanResult | null);
    setActiveTab(saved.activeTab || 'overview');
    setAiMessages(saved.aiMessages || []);
    setError(null);
    if (saved.chain && saved.chain !== chain) setChain(saved.chain);
    setHydrated(true);
  }, [scopeKey]);

  useEffect(() => {
    if (!hydrated) return;
    saveContractScannerState({
      address,
      chain,
      result: result as unknown as Record<string, unknown> | null,
      activeTab,
      aiMessages,
    }, scopeKey);
  }, [address, chain, result, activeTab, aiMessages, hydrated, scopeKey]);

  const handleScan = async () => {
    const addr = address.trim();
    if (!addr) { notify.error('Enter a contract address'); return; }
    setLoading(true); setError(null); setResult(null); setAiMessages([]);
    try {
      let data: any;
      try {
        data = await scanContractRich(addr, chain);
      } catch {
        data = await scanContract(addr, chain);
      }
      let r = normalizeScanResult((data.result || data) as Record<string, unknown>);

      // Fallback: if scan endpoint returns empty contract activity, try analyze endpoint.
      const looksEmpty = (r.totalTransfers || 0) === 0
        && (r.walletInteractions?.length || 0) === 0
        && (r.totalInteractors || 0) === 0;
      if (looksEmpty) {
        try {
          const alt = await analyzeContract(addr, chain);
          r = normalizeScanResult((alt as any).result || (alt as any) || {});
        } catch {
          // Keep original result if fallback fails.
        }
      }

      setResult(r);
      setActiveTab('overview');
      addHistory({
        address: addr,
        chain,
        type: 'contract',
        riskScore: r.riskScore,
        totalTransactions: r.totalTransfers,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Contract scan failed');
    } finally { setLoading(false); }
  };

  const resetView = () => {
    setResult(null);
    setError(null);
    setAddress('');
    setAiMessages([]);
    setActiveTab('overview');
    clearContractScannerState(scopeKey);
  };

  const sorted = result?.walletInteractions
    ? [...result.walletInteractions].sort((a, b) => {
        const av = a[sortKey] ?? 0;
        const bv = b[sortKey] ?? 0;
        return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
      })
    : [];

  const pageSize = 25;
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(sorted.length / pageSize);
  const sharedFundingGroups = useMemo((): SharedFundingGroup[] => {
    const map = new Map<string, SharedFundingGroup>();
    for (const w of (result?.walletInteractions || [])) {
      if (!w.fundingSource) continue;
      const prev = map.get(w.fundingSource) || {
        fundingSource: w.fundingSource,
        wallets: [],
        count: 0,
        totalInteractions: 0,
        totalSent: 0,
        totalReceived: 0,
        categories: [],
      };
      prev.wallets.push(w.address);
      prev.totalInteractions += Number(w.interactionCount || 0);
      prev.totalSent += Number(w.sent || 0);
      prev.totalReceived += Number(w.received || 0);
      if (w.category && !prev.categories.includes(w.category)) prev.categories.push(w.category);
      prev.count = prev.wallets.length;
      map.set(w.fundingSource, prev);
    }
    return Array.from(map.entries())
      .map(([, group]) => group)
      .sort((a, b) => b.count - a.count);
  }, [result?.walletInteractions]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24, height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {result && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', margin: '0 0 4px' }}>Contract Scanner</h2>
            <p style={{ fontSize: 12, color: 'var(--fg-tertiary)', margin: 0 }}>
              Scan smart contracts for sybil activity, shared funders, and suspicious patterns
            </p>
          </div>
          <button onClick={resetView} style={{ padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', background: 'var(--bg-secondary)', color: 'var(--fg)', fontSize: 12, cursor: 'pointer' }}>
            New Scan
          </button>
        </div>
      )}

      {!result && (
        <>
          <InputStage
            title="Contract Analysis"
            maxWidth={760}
            hint="0x.. or ENS"
          >
            <CompactSearchForm
              value={address}
              onChange={setAddress}
              onSubmit={handleScan}
              placeholder="0x.. or ENS"
              ariaLabel="Contract address"
              loading={loading}
              disabled={loading || !address.trim()}
              submitLabel="Scan"
              loadingLabel="Scanning"
              autoFocus
              hideInputIcon
              showSubmitTextOnMobile
              leftSlot={<ChainSelector value={chain} onChange={setChain} compact />}
            />
          </InputStage>
        </>
      )}

      {error && <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--destructive)', color: 'var(--destructive)', fontSize: 13, marginBottom: 16, background: 'var(--card)' }}>{error}</div>}
      {loading && (
        <ProgressiveLoader
          title="Scanning contract"
          steps={['Checking bytecode and metadata', 'Fetching transfers and interactors', 'Finding shared funding groups']}
          compact={isMobile}
        />
      )}

      {result && (
        <>
          <div style={{ display: 'flex', gap: 4, margin: '10px 0 12px', borderBottom: '1px solid var(--hairline)', paddingBottom: 6 }}>
            {(['overview', 'interactors', 'shared-funding'] as ScannerTab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: '6px 10px', border: 'none', borderRadius: 'var(--radius-md)', background: activeTab === tab ? 'var(--hover-overlay)' : 'transparent', color: activeTab === tab ? 'var(--fg)' : 'var(--fg-tertiary)', cursor: 'pointer', fontSize: 11, textTransform: 'capitalize' }}>
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              <div style={{ border: '1px solid var(--card-border)', borderRadius: 'var(--radius-xl)', background: 'var(--card)', padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>{result.contractName || 'Contract'}</div>
                    <a href={`${explorerBase(chain)}/address/${result.contractAddress}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                      {result.contractAddress.slice(0, 10)}...{result.contractAddress.slice(-6)}
                    </a>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>Risk</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: (result.riskScore || 0) > 60 ? 'var(--destructive)' : 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{result.riskScore ?? 0}/100</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginTop: 12 }}>
                  <Stat label="Interactors" value={String(result.totalInteractors ?? result.uniqueWallets ?? 0)} />
                  <Stat label="Transfers" value={String(result.totalTransfers ?? 0)} />
                  <Stat label="Balance" value={`${typeof result.ethBalance === 'number' ? result.ethBalance.toFixed(4) : '0.0000'} ETH`} />
                </div>
                {((result.totalTransfers || 0) === 0 && (result.walletInteractions?.length || 0) === 0) && (
                  <div style={{ marginTop: 12, fontSize: 11, color: 'var(--fg-tertiary)', lineHeight: 1.5 }}>
                    No transfer activity found for this contract on <strong>{chain.toUpperCase()}</strong>.
                    Try a different chain for this address.
                  </div>
                )}
              </div>
              <ContractInlineAiAnalysis chain={chain} contractAddress={result.contractAddress} analysisData={result} cachedMessages={aiMessages} onMessagesChange={setAiMessages} />
            </div>
          )}

          {activeTab === 'interactors' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>
                Wallet Interactions ({sorted.length})
              </div>
              <div style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--card-border)', background: 'var(--card)', overflow: isMobile ? 'auto' : 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 100px', padding: '10px 16px', borderBottom: '1px solid var(--hairline)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-tertiary)' }}>
                  {(['Address', 'Interactions', 'Sent', 'Received', 'Category'] as const).map(h => (
                    <div key={h} style={{ cursor: 'pointer' }}
                      onClick={() => {
                        const k = h === 'Interactions' ? 'interactionCount' : h === 'Sent' ? 'sent' : h === 'Received' ? 'received' : h === 'Address' ? 'address' : 'category';
                        if (sortKey === k) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
                        else { setSortKey(k as keyof WalletInteraction); setSortDir('desc'); }
                        setPage(0);
                      }}>
                      {h}
                    </div>
                  ))}
                </div>
                {paged.map((w, i) => (
                  <div key={i}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 100px', padding: '8px 16px', borderBottom: '1px solid var(--hairline)', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg)', cursor: 'pointer' }}
                    onClick={() => openTab(w.address)}
                  >
                    <a href={`${explorerBase(chain)}/address/${w.address}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {w.address.slice(0, 10)}...{w.address.slice(-6)}
                    </a>
                    <span>{w.interactionCount}</span>
                    <span style={{ color: 'var(--destructive)' }}>{w.sent?.toFixed(4)}</span>
                    <span style={{ color: 'var(--accent)' }}>{w.received?.toFixed(4)}</span>
                    <span style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>{w.category || '—'}</span>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12, alignItems: 'center' }}>
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    style={{ padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', background: 'var(--card)', color: 'var(--fg)', cursor: page === 0 ? 'default' : 'pointer', fontSize: 11 }}
                  >
                    Prev
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)' }}>{page + 1} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    style={{ padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', background: 'var(--card)', color: 'var(--fg)', cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontSize: 11 }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'shared-funding' && (
            <div style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--card-border)', background: 'var(--card)', padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>
                Shared Funding Groups ({sharedFundingGroups.length})
              </div>
              {sharedFundingGroups.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--fg-tertiary)' }}>No shared funding groups found from current dataset.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sharedFundingGroups.map((g, i) => (
                    <div key={i} style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-lg)', padding: '10px 12px', background: 'var(--bg-secondary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <a href={`${explorerBase(chain)}/address/${g.fundingSource}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
                          {g.fundingSource.slice(0, 10)}...{g.fundingSource.slice(-6)}
                        </a>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>{g.count} wallets</span>
                          <button
                            onClick={() => openTab(g.fundingSource, chain)}
                            style={{ fontSize: 10, border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', background: 'var(--card)', color: 'var(--fg)', padding: '3px 7px', cursor: 'pointer' }}
                          >
                            Analyze Source
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6, marginBottom: 8 }}>
                        <MiniStat label="Interactions" value={String(g.totalInteractions)} />
                        <MiniStat label="Sent" value={g.totalSent.toFixed(2)} color="var(--destructive)" />
                        <MiniStat label="Received" value={g.totalReceived.toFixed(2)} color="var(--accent)" />
                      </div>

                      {g.categories.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                          {g.categories.map((cat) => (
                            <span key={cat} style={{ fontSize: 10, color: 'var(--fg-secondary)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-full)', padding: '2px 7px', background: 'var(--card)' }}>
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {g.wallets.slice(0, 18).map((wallet) => (
                          <div
                            key={wallet}
                            style={{ display: 'inline-flex', gap: 4, alignItems: 'center', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-full)', padding: '3px 7px', background: 'var(--card)' }}
                          >
                            <a href={`${explorerBase(chain)}/address/${wallet}`} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: 'var(--fg-secondary)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
                              {wallet.slice(0, 6)}...{wallet.slice(-4)}
                            </a>
                            <button
                              onClick={() => openTab(wallet, chain)}
                              style={{ fontSize: 9, border: 'none', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}
                              title="Open in Analyze"
                            >
                              +
                            </button>
                          </div>
                        ))}
                        {g.wallets.length > 18 && (
                          <span style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>+{g.wallets.length - 18} more</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ContractInlineAiAnalysis({
  chain,
  contractAddress,
  analysisData,
  cachedMessages,
  onMessagesChange,
}: {
  chain: string;
  contractAddress: string;
  analysisData: unknown;
  cachedMessages: AiMessage[];
  onMessagesChange: (messages: AiMessage[]) => void;
}) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState('');
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current || !analysisData) return;
    loadedRef.current = true;
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages);
      return;
    }
    void runInitialAnalysis();
  }, [analysisData, cachedMessages]);

  useEffect(() => {
    onMessagesChange(messages);
  }, [messages, onMessagesChange]);

  const runInitialAnalysis = async () => {
    setLoading(true);
    try {
      const prompt = `Analyze contract ${contractAddress} on ${chain} with this scan data and provide: risk summary, suspicious indicators, top interacting wallets behavior, and investigation next steps.`;
      let fullReply = '';
      await sendChatMessage(
        'inline-contract-analysis',
        prompt,
        { address: contractAddress, chain, analysisData: JSON.stringify(analysisData).slice(0, 20000) },
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
      const msg = err instanceof Error ? err.message : 'Failed to generate contract AI analysis';
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
        'inline-contract-analysis',
        q,
        { address: contractAddress, chain, analysisData: JSON.stringify(analysisData).slice(0, 20000) },
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
    <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-xl)', background: 'var(--card)', padding: 12, minHeight: 250, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>AI Analysis</div>
      <div style={{ flex: 1, overflow: 'auto', marginBottom: 8 }}>
        {loading && messages.length === 0 && !streaming && <div style={{ fontSize: 12, color: 'var(--fg-tertiary)' }}>Analyzing contract scan...</div>}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            {msg.role === 'assistant'
              ? <div style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.55 }}><MarkdownContent text={msg.content} /></div>
              : <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{msg.content}</div>}
          </div>
        ))}
        {streaming && <div style={{ fontSize: 12, color: 'var(--fg)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{streaming}</div>}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleFollowUp(); }}
          placeholder="Ask follow-up..." disabled={loading}
          style={{ flex: 1, padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', background: 'var(--bg-secondary)', color: 'var(--fg)', fontSize: 12, outline: 'none' }} />
        <button onClick={handleFollowUp} disabled={loading || !input.trim()}
          style={{ padding: '7px 10px', borderRadius: 'var(--radius-md)', border: 'none', background: input.trim() && !loading ? 'var(--accent)' : 'var(--card-border)', color: input.trim() && !loading ? '#000' : 'var(--fg-tertiary)', fontSize: 12, cursor: input.trim() && !loading ? 'pointer' : 'default' }}>
          Ask
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid var(--hairline)' }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: color || 'var(--fg)' }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '7px 8px', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', background: 'var(--card)' }}>
      <div style={{ fontSize: 9, color: 'var(--fg-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: color || 'var(--fg)' }}>{value}</div>
    </div>
  );
}
