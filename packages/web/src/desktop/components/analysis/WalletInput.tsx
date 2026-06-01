import { useState, useEffect } from 'react';
import { useTabs } from '../../contexts/TabsContext';
import { useChain } from '../../contexts/ChainContext';
import { useNotify } from '../../contexts/ToastContext';
import { analyzeWallet, fetchFundingTree, streamWalletTimestamps } from '../../api/analyze';
import { extractAddress } from '../../hooks/useClipboardDetection';
import { addHistory } from '../../stores/history';
import { AnalysisView } from './AnalysisView';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { CompactSearchForm, InputStage } from './CompactSearchForm';
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
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: hasResult ? 'hidden' : 'auto', position: 'relative' }}
    >
      {/* Input area */}
      <div style={{
        display: showInput ? 'flex' : 'none',
        flex: 1,
      }}>
        <InputStage
          title="Wallet Analysis"
          maxWidth={isMobile ? 470 : 620}
          hint="Drop a blockchain explorer link anywhere to auto-detect chain and address"
        >
          <CompactSearchForm
            value={address}
            onChange={setAddress}
            onSubmit={handleAnalyze}
            placeholder="Paste wallet address, ENS name, or Solana address"
            ariaLabel="Wallet address"
            loading={tab.loading}
            disabled={tab.loading}
            submitLabel="Analyze"
            loadingLabel="Analyzing"
            autoFocus
          />
        </InputStage>
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
      {hasResult && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}>
          <AnalysisView tab={tab} />
        </div>
      )}

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
