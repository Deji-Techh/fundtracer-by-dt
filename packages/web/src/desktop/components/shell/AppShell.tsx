import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TabsProvider, useTabs } from '../../contexts/TabsContext';
import { ChainProvider } from '../../contexts/ChainContext';
import { useClipboardDetection } from '../../hooks/useClipboardDetection';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { CommandPalette } from './CommandPalette';
import { AnalysisTabs } from '../analysis/AnalysisTabs';
import { Loader } from '../common/Loader';
import { syncHistory, startHistoryPolling, stopHistoryPolling } from '../../stores/history';
import { getWindowState, saveWindowState } from '../../stores/windowState';
import type { AppView, ChainId } from '../../types';

const SettingsPage = lazy(() => import('../settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AiChatView = lazy(() => import('../ai-chat/AiChatView').then(m => ({ default: m.AiChatView })));
const RoomsView = lazy(() => import('../rooms/RoomsView').then(m => ({ default: m.RoomsView })));
const ContractScannerView = lazy(() => import('../analysis/ContractScannerView').then(m => ({ default: m.ContractScannerView })));
const SybilView = lazy(() => import('../analysis/SybilView').then(m => ({ default: m.SybilView })));
const CEXFlowView = lazy(() => import('../analysis/CEXFlowView').then(m => ({ default: m.CEXFlowView })));
const InteractorsView = lazy(() => import('../analysis/InteractorsView').then(m => ({ default: m.InteractorsView })));
const CompareView = lazy(() => import('../analysis/CompareView').then(m => ({ default: m.CompareView })));
const WebSolanaView = lazy(() => import('../../../design-system/features/SolanaView').then(m => ({ default: m.SolanaView })));
const WebPortfolioView = lazy(() => import('../../../design-system/features/PortfolioView'));
const WebPolymarketView = lazy(() => import('../../../design-system/features/PolymarketView'));
const WebGraphView = lazy(() => import('../../../design-system/features/GraphView'));
const WebCrossChainView = lazy(() => import('../../../design-system/features/CrossChainView'));
const WebHistoryView = lazy(() => import('../../../design-system/features/HistoryView'));
const WebRadarView = lazy(() => import('../../../design-system/features/RadarView'));
const WebInvestigateView = lazy(() => import('../../../design-system/features/InvestigateView'));

const TAB_TO_VIEW: Record<string, AppView> = {
  analyze: 'analyze',
  investigate: 'analyze',
  compare: 'compare',
  ai: 'ai-chat',
  'ai-chat': 'ai-chat',
  rooms: 'rooms',
  settings: 'settings',
  contracts: 'contract-scanner',
  'contract-scanner': 'contract-scanner',
  interactors: 'interactors',
  sybil: 'sybil-detection',
  'sybil-detection': 'sybil-detection',
  cex: 'cex-flow',
  'cex-flow': 'cex-flow',
  solana: 'solana',
  portfolio: 'portfolio',
  polymarket: 'polymarket',
  sui: 'sui',
  graph: 'graph',
  crosschain: 'crosschain',
  'cross-chain': 'crosschain',
  history: 'history',
  radar: 'radar',
};

function extractAddressFromInput(input: string): { address: string; chain?: string } {
  if (/^0x[a-fA-F0-9]{40}$/.test(input)) return { address: input };
  if (/^[a-zA-Z0-9]{32,44}$/.test(input)) return { address: input };
  try {
    const url = new URL(input);
    const match = url.pathname.match(/(?:address|tx|token|account)\/(0x[a-fA-F0-9]{40}|[a-zA-Z0-9]{32,44})/);
    if (match) {
      const chainMap: Record<string, string> = {
        'etherscan.io': 'ethereum',
        'lineascan.build': 'linea',
        'arbiscan.io': 'arbitrum',
        'basescan.org': 'base',
        'optimistic.etherscan.io': 'optimism',
        'polygonscan.com': 'polygon',
        'bscscan.com': 'bsc',
        'solscan.io': 'solana',
      };
      return { address: match[1], chain: chainMap[url.hostname.replace('www.', '')] };
    }
  } catch {}
  return { address: input };
}

export function AppShell() {
  const savedState = getWindowState();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || '';
  const rawAddress = searchParams.get('address') || '';
  const explicitChain = searchParams.get('chain') || '';
  const prefillMode = searchParams.get('mode') || '';
  const extracted = extractAddressFromInput(rawAddress);
  const prefilledAddress = extracted.address || rawAddress;
  const prefilledChain = explicitChain || extracted.chain || '';

  // If user came from auth page "Try Now", force analyze view
  const hasPendingTryNow = (() => {
    try { return !!sessionStorage.getItem('try_now_address'); } catch { return false; }
  })();

  const [currentView, setCurrentView] = useState<AppView>(
    hasPendingTryNow
      ? 'analyze'
      : (tabParam && TAB_TO_VIEW[tabParam]
        ? TAB_TO_VIEW[tabParam]
        : (prefilledAddress
          ? (prefilledChain === 'solana' ? 'solana' : 'analyze')
          : ((savedState.currentView as AppView) || 'analyze')))
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(savedState.sidebarCollapsed || false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [sybilPrefill, setSybilPrefill] = useState<{ addresses: string[]; chain: ChainId } | null>(null);

  const toggleSidebar = useCallback(() => setSidebarCollapsed(c => !c), []);

  useEffect(() => {
    saveWindowState({ currentView, sidebarCollapsed });
  }, [currentView, sidebarCollapsed]);

  useEffect(() => {
    if (tabParam && TAB_TO_VIEW[tabParam]) {
      setCurrentView(TAB_TO_VIEW[tabParam]);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!prefilledAddress || tabParam) return;
    setCurrentView(prefilledChain === 'solana' ? 'solana' : 'analyze');
  }, [prefilledAddress, prefilledChain, tabParam]);

  // Sync history with server on mount + every 60s
  useEffect(() => {
    syncHistory();
    startHistoryPolling(60_000);
    const onFocus = () => { syncHistory(); };
    window.addEventListener('focus', onFocus);
    return () => {
      stopHistoryPolling();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setCommandOpen(true);
    }
    if (e.key === 'Escape') setCommandOpen(false);
  }, []);

  return (
    <ChainProvider>
    <TabsProvider>
      <div onKeyDown={handleKeyDown} tabIndex={-1} style={{
        display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw',
        background: 'var(--bg)', overflow: 'hidden', outline: 'none',
      }}>
        <TitleBar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar
            currentView={currentView}
            onViewChange={setCurrentView}
            collapsed={sidebarCollapsed}
            onOpenCommand={() => setCommandOpen(true)}
          />

          <main style={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: 'var(--bg)',
          }}>
            {currentView === 'analyze' && <AnalysisContent onViewChange={setCurrentView} />}
            {currentView === 'compare' && <Suspense fallback={<Loader />}><CompareView /></Suspense>}
            {currentView === 'ai-chat' && <Suspense fallback={<Loader />}><AiChatContext /></Suspense>}
            {currentView === 'rooms' && <Suspense fallback={<Loader />}><RoomsView /></Suspense>}
            {currentView === 'settings' && <Suspense fallback={<Loader />}><SettingsPage /></Suspense>}
            {currentView === 'contract-scanner' && <Suspense fallback={<Loader />}><ContractScannerView /></Suspense>}
            {currentView === 'interactors' && <Suspense fallback={<Loader />}><InteractorsView onNavigateToSybil={(addresses, chain) => { setSybilPrefill({ addresses, chain }); setCurrentView('sybil-detection'); }} /></Suspense>}
            {currentView === 'sybil-detection' && <Suspense fallback={<Loader />}><SybilView prefillAddresses={sybilPrefill?.addresses} prefillChain={sybilPrefill?.chain} onPrefillConsumed={() => setSybilPrefill(null)} /></Suspense>}
            {currentView === 'cex-flow' && <Suspense fallback={<Loader />}><CEXFlowView /></Suspense>}
            {currentView === 'solana' && (
              <DesktopFeatureSurface>
                <Suspense fallback={<Loader />}>
                  <WebSolanaView
                    prefillAddress={prefilledAddress || undefined}
                    onPrefillConsumed={() => {
                      const params = new URLSearchParams(searchParams);
                      params.delete('address');
                      params.delete('chain');
                      params.delete('mode');
                      setSearchParams(params, { replace: true });
                    }}
                  />
                </Suspense>
              </DesktopFeatureSurface>
            )}
            {currentView === 'portfolio' && <DesktopFeatureSurface><Suspense fallback={<Loader />}><WebPortfolioView /></Suspense></DesktopFeatureSurface>}
            {currentView === 'polymarket' && <DesktopFeatureSurface><Suspense fallback={<Loader />}><WebPolymarketView /></Suspense></DesktopFeatureSurface>}
            {currentView === 'sui' && (
              <DesktopFeatureSurface>
                <Suspense fallback={<Loader />}>
                  <WebInvestigateView
                    suiMode={true}
                    selectedChain={(prefilledChain as ChainId) || 'sui'}
                    onChainChange={() => {}}
                    prefillAddress={prefilledAddress || undefined}
                    prefillChain={prefilledChain || undefined}
                    prefillType={prefillMode || undefined}
                  />
                </Suspense>
              </DesktopFeatureSurface>
            )}
            {currentView === 'graph' && <DesktopFeatureSurface><Suspense fallback={<Loader />}><WebGraphView selectedChain={(prefilledChain as ChainId) || 'linea'} /></Suspense></DesktopFeatureSurface>}
            {currentView === 'crosschain' && <DesktopFeatureSurface><Suspense fallback={<Loader />}><WebCrossChainView selectedChain={(prefilledChain as ChainId) || 'linea'} /></Suspense></DesktopFeatureSurface>}
            {currentView === 'history' && <DesktopFeatureSurface><Suspense fallback={<Loader />}><WebHistoryView onSelectScan={() => {}} /></Suspense></DesktopFeatureSurface>}
            {currentView === 'radar' && <DesktopFeatureSurface><Suspense fallback={<Loader />}><WebRadarView /></Suspense></DesktopFeatureSurface>}
          </main>
        </div>

        {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} onNavigate={setCurrentView} />}
      </div>
    </TabsProvider>
    </ChainProvider>
  );
}

function AnalysisContent({ onViewChange }: { onViewChange: (v: AppView) => void }) {
  const { openTab } = useTabs();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check for pending "Try Now" address from auth page
  useEffect(() => {
    try {
      const address = sessionStorage.getItem('try_now_address');
      const chain = sessionStorage.getItem('try_now_chain') as ChainId | null;
      if (address) {
        sessionStorage.removeItem('try_now_address');
        sessionStorage.removeItem('try_now_chain');
        // Delay slightly so the view transition completes before opening tab
        const id = setTimeout(() => {
          openTab(address, chain || 'ethereum');
          onViewChange('analyze');
        }, 100);
        return () => clearTimeout(id);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const rawAddress = searchParams.get('address') || '';
    if (!rawAddress) return;
    const explicitChain = searchParams.get('chain') as ChainId | null;
    const extracted = extractAddressFromInput(rawAddress);
    const address = extracted.address || rawAddress;
    const chain = explicitChain || (extracted.chain as ChainId | undefined) || 'ethereum';
    if (chain === 'solana') {
      onViewChange('solana');
      return;
    }
    openTab(address, chain);
    onViewChange('analyze');
    const params = new URLSearchParams(searchParams);
    params.delete('address');
    params.delete('chain');
    params.delete('mode');
    setSearchParams(params, { replace: true });
  }, [openTab, onViewChange, searchParams, setSearchParams]);

  useClipboardDetection({
    enabled: true,
    onAddressDetected: (address) => { openTab(address); onViewChange('analyze'); },
  });
  return <AnalysisTabs />;
}

function DesktopFeatureSurface({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      height: '100%',
      width: '100%',
      overflow: 'auto',
      background: 'var(--bg)',
      color: 'var(--fg)',
    }}>
      {children}
    </div>
  );
}

function AiChatContext() {
  const { tabs, activeTabId } = useTabs();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const context = activeTab?.address ? { address: activeTab.address, chain: activeTab.chain } : undefined;
  return <AiChatView context={context} />;
}

export { AppShell as default };
