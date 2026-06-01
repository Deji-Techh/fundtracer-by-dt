import { useState, useEffect } from 'react';
import { useTabs } from '../../contexts/TabsContext';
import { useChain } from '../../contexts/ChainContext';
import { useNotify } from '../../contexts/ToastContext';
import { analyzeWallet, fetchFundingTree, streamWalletTimestamps } from '../../api/analyze';
import { extractAddress } from '../../hooks/useClipboardDetection';
import { addHistory } from '../../stores/history';
import { AnalysisView } from './AnalysisView';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { AnalysisTab, ChainId } from '../../types';

export function WalletInput({ tab }: { tab: AnalysisTab }) {
  const [address, setAddress] = useState(tab.address || '');
  const { chain, setChain } = useChain();
  const [dragOver, setDragOver] = useState(false);
  const { updateTab } = useTabs();
  const notify = useNotify();
  const isMobile = useIsMobile();

  useEffect(() => {
    setAddress(tab.address || '');
    if (tab.chain) setChain(tab.chain);
  }, [tab.id, tab.address, tab.chain]);

  const runAnalysis = async (addr: string, ch: ChainId) => {
    updateTab(tab.id, { address: addr, chain: ch, loading: true, error: undefined, label: undefined });
    try {
      const [result, funding] = await Promise.all([
        analyzeWallet(addr, ch),
        fetchFundingTree(addr, ch, 3),
      ]);

      const analysisData = (result.result || result) as any;
      const transactions = analysisData.transactions || [];
      const taskId = analysisData.taskId || analysisData.pagination?.taskId;

      updateTab(tab.id, {
        loading: false,
        result: analysisData,
        transactions,
        fundingData: funding as AnalysisTab['fundingData'],
      });

      // Stream timestamps progressively via SSE (analysis returns tx with timestamp=0 for speed)
      if (taskId) {
        streamWalletTimestamps(
          taskId,
          (batch) => {
            // Patch timestamps onto the transactions we already have
            const tsMap = new Map(batch.hashes.map((h, i) => [h.toLowerCase(), batch.timestamps[i]]));
            const updated = (transactions as any[]).map((tx: any) => {
              const ts = tsMap.get(tx.hash?.toLowerCase());
              return ts != null ? { ...tx, timestamp: ts } : tx;
            });
            updateTab(tab.id, { transactions: updated });
          },
          () => { /* done */ },
          (err) => { console.error('[Timestamp stream]', err.message); },
        );
      }

      // Record in scan history (syncs to server + localStorage)
      addHistory({
        address: addr,
        chain: ch,
        type: tab.type || 'wallet',
        riskLevel: analysisData?.riskLevel || analysisData?.risk_level,
        riskScore: analysisData?.riskScore || analysisData?.risk_score || analysisData?.overallRiskScore,
        totalTransactions: analysisData?.totalTransactions || analysisData?.transactionCount || analysisData?.summary?.totalTransactions || transactions.length,
        totalValueSentEth: analysisData?.totalValueSentEth || analysisData?.totalValueSent || analysisData?.summary?.totalValueSentEth,
        totalValueReceivedEth: analysisData?.totalValueReceivedEth || analysisData?.totalValueReceived || analysisData?.summary?.totalValueReceivedEth,
        activityPeriodDays: analysisData?.activityPeriodDays || analysisData?.summary?.activityPeriodDays,
        balanceInEth: analysisData?.balanceInEth || analysisData?.balance || analysisData?.wallet?.balanceInEth,
      });
    } catch (err) {
      updateTab(tab.id, { loading: false, error: err instanceof Error ? err.message : 'Analysis failed' });
      notify.error(err instanceof Error ? err.message : 'Analysis failed');
    }
  };

  const handleAnalyze = () => {
    const trimmed = address.trim();
    if (!trimmed) { notify.error('Please enter a wallet address'); return; }
    runAnalysis(trimmed, chain);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAnalyze();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const text = e.dataTransfer.getData('text/plain');
    if (!text) return;
    const addr = extractAddress(text);
    if (!addr) return;
    const lower = text.toLowerCase();
    let detected: ChainId = 'ethereum';
    if (lower.includes('etherscan')) detected = 'ethereum';
    else if (lower.includes('arbiscan')) detected = 'arbitrum';
    else if (lower.includes('basescan')) detected = 'base';
    else if (lower.includes('polygonscan')) detected = 'polygon';
    else if (lower.includes('bscscan')) detected = 'bsc';
    else if (lower.includes('lineascan')) detected = 'linea';
    else if (lower.includes('optimistic')) detected = 'optimism';
    else if (lower.includes('solscan') || lower.includes('solana')) detected = 'solana';
    setAddress(addr); setChain(detected);
    runAnalysis(addr, detected);
  };

  const hasResult = tab.result && !tab.loading;
  const showInput = !hasResult;

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', position: 'relative' }}
    >
      {/* Input area */}
      <div style={{
        display: showInput ? 'flex' : 'none',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isMobile ? 'flex-start' : 'center',
        flex: 1,
        padding: isMobile ? '22px 14px 118px' : '40px 24px',
        maxWidth: isMobile ? 460 : 600,
        margin: '0 auto',
        width: '100%',
      }}>
        {/* Label */}
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--fg-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: isMobile ? 14 : 20,
        }}>
          Wallet Analysis
        </div>

        {isMobile && (
          <div style={{
            width: '100%',
            padding: '14px 14px 12px',
            border: '1px solid var(--hairline)',
            borderRadius: 18,
            background: 'linear-gradient(180deg, rgba(0,230,122,0.08), transparent)',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 18, fontWeight: 750, color: 'var(--fg)', lineHeight: 1.15 }}>
              Trace a wallet
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 5, lineHeight: 1.45 }}>
              Paste an address, ENS, Solana account, or explorer URL.
            </div>
          </div>
        )}

        {/* Input card */}
        <div style={{
          width: '100%',
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: isMobile ? 18 : 'var(--radius-xl)',
          padding: isMobile ? 6 : 4,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          gap: isMobile ? 6 : 4,
          boxShadow: isMobile ? '0 16px 42px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.04)' : undefined,
        }}>
          {/* Address input */}
          <div style={{ flex: 1, position: 'relative', width: '100%' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              type="text"
              aria-label="Wallet address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste wallet address, ENS name, or Solana address"
              autoFocus
              spellCheck={false}
              style={{
                width: '100%',
                padding: isMobile ? '14px 14px 14px 38px' : '12px 14px 12px 36px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--fg)',
                fontSize: isMobile ? 12 : 13,
                fontFamily: 'var(--font-mono)',
                minHeight: isMobile ? 48 : undefined,
              }}
            />
          </div>

          {/* Analyze button */}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={tab.loading}
            style={{
              width: isMobile ? '100%' : undefined,
              minHeight: isMobile ? 46 : undefined,
              padding: isMobile ? '12px 18px' : '10px 20px',
              borderRadius: isMobile ? 14 : 'var(--radius-lg)',
              border: 'none',
              background: tab.loading ? 'var(--bg-secondary)' : 'var(--accent)',
              color: tab.loading ? 'var(--fg-tertiary)' : '#000',
              fontSize: isMobile ? 13 : 12,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              cursor: tab.loading ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'opacity 150ms',
            }}
            onMouseEnter={e => { if (!tab.loading) e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {tab.loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 10, height: 10, border: '2px solid var(--fg-tertiary)',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  display: 'inline-block', animation: 'spin 0.6s linear infinite',
                }} />
                Analyzing
              </span>
            ) : (
              'Analyze'
            )}
          </button>
        </div>

        {/* Hint */}
        <p style={{
          fontSize: isMobile ? 10 : 11,
          color: 'var(--fg-tertiary)',
          marginTop: 12,
          textAlign: 'center',
        }}>
          Drop a blockchain explorer link anywhere to auto-detect chain and address
        </p>
      </div>

      {/* Loading state (while input is hidden) */}
      {tab.loading && !hasResult && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10, color: 'var(--fg-tertiary)', fontSize: 13 }}>
          <div style={{
            width: 16, height: 16, border: '2px solid var(--card-border)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          Fetching analysis data...
        </div>
      )}

      {/* Error state */}
      {tab.error && !tab.loading && (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div style={{
            padding: '14px 18px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--destructive)',
            color: 'var(--destructive)', fontSize: 13, background: 'var(--card)',
          }}>
            {tab.error}
          </div>
          <button onClick={() => updateTab(tab.id, { error: undefined })}
            type="button"
            style={{
              marginTop: 12, padding: '8px 20px', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--card-border)', background: 'var(--card)',
              color: 'var(--fg)', fontSize: 13, cursor: 'pointer',
            }}>
            Try Again
          </button>
        </div>
      )}

      {/* Results */}
      {hasResult && <AnalysisView tab={tab} />}

      {/* Drag overlay */}
      {dragOver && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,230,122,0.06)',
          border: '2px dashed var(--accent)', borderRadius: 'var(--radius-xl)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, pointerEvents: 'none',
        }}>
          <div style={{
            padding: '14px 28px', borderRadius: 'var(--radius-lg)',
            background: 'var(--card)', color: 'var(--accent)',
            fontSize: 13, fontWeight: 600,
          }}>
            Drop address to analyze
          </div>
        </div>
      )}
    </div>
  );
}
