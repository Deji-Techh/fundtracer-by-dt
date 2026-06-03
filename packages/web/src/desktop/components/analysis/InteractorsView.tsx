import { useEffect, useState } from 'react';
import { analyzeContract } from '../../api/analyze';
import { useNotify } from '../../contexts/ToastContext';
import { useTabs } from '../../contexts/TabsContext';
import { ChainSelector } from '../common/ChainSelector';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { Users, ExternalLink, AlertTriangle, Shield, Download } from 'lucide-react';
import type { ChainId } from '../../types';
import { getInteractorsState, saveInteractorsState } from '../../stores/interactorsState';
import { CompactSearchForm, InputStage } from './CompactSearchForm';
import { ProgressiveLoader } from './ProgressiveLoader';

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

  useEffect(() => {
    const next = getInteractorsState(scopeKey);
    setAddress(next.address);
    setChain(next.chain);
    setResult((next.result as ContractResult | null) || null);
    setError(null);
    setLoading(false);
  }, [scopeKey]);

  useEffect(() => {
    saveInteractorsState({ address, chain, result: result as Record<string, unknown> | null }, scopeKey);
  }, [address, chain, result, scopeKey]);

  const handleAnalyze = async () => {
    const addr = address.trim();
    if (!addr) { notify.error('Please enter a wallet or contract address'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await analyzeContract(addr, chain, { maxInteractors: 1000, analyzeFunding: true });
      const data = (res.result || res) as ContractResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      notify.error(err instanceof Error ? err.message : 'Analysis failed');
    } finally { setLoading(false); }
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

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!result && !loading && !error && (
        <InputStage
          title="Interactors Analysis"
          maxWidth={760}
          hint="0x.. or ENS"
        >
          <CompactSearchForm
            value={address}
            onChange={setAddress}
            onSubmit={handleAnalyze}
            placeholder="0x.. or ENS"
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

          {/* Interactors table */}
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
