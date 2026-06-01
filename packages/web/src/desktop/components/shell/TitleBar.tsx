import { useState, useEffect, useCallback, useRef } from 'react';
import { useChain } from '../../contexts/ChainContext';
import { useTabs } from '../../contexts/TabsContext';
import { ChainSelector } from '../common/ChainSelector';
import { CHAINS } from '../../contexts/ChainContext';
import type { AppView, ChainId } from '../../types';

interface TitleBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
  currentView: AppView;
}

const chainAbbr: Record<string, string> = {
  ethereum: 'ETH', linea: 'LNA', arbitrum: 'ARB', base: 'BASE',
  optimism: 'OP', polygon: 'POL', bsc: 'BSC', solana: 'SOL',
};

const chainColor: Record<string, string> = {
  ethereum: '#627eea', linea: '#61dfff', arbitrum: '#28a0f0', base: '#0052ff',
  optimism: '#ff0420', polygon: '#8247e5', bsc: '#f0b90b', solana: '#9945ff',
};

const VIEW_LABELS: Record<string, string> = {
  analyze: 'Analyze', compare: 'Compare', 'ai-chat': 'AI Chat',
  rooms: 'Rooms', settings: 'Settings', 'contract-scanner': 'Contract Scanner',
  interactors: 'Interactors', 'sybil-detection': 'Sybil Detection',
  'cex-flow': 'CEX Flow', polymarket: 'Polymarket',
};

export function TitleBar({ onToggleSidebar, isMobile, currentView }: TitleBarProps) {
  const { chain, setChain } = useChain();
  const { tabs, activeTabId, setActiveTab, openTab } = useTabs();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTabs, setShowTabs] = useState(false);
  const [showNetworks, setShowNetworks] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const netRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tabsRef.current && !tabsRef.current.contains(e.target as Node)) setShowTabs(false);
      if (netRef.current && !netRef.current.contains(e.target as Node)) setShowNetworks(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {}
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Center text: active tab address trumps view label
  const centerLabel = activeTab?.address
    ? `${activeTab.address.slice(0, 6)}...${activeTab.address.slice(-4)}`
    : (VIEW_LABELS[currentView] || 'FundTracer');

  const windowBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--fg-secondary)',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <div
      data-tauri-drag-region
      style={{
        height: isMobile ? 44 : 'var(--titlebar-height)',
        minHeight: isMobile ? 44 : 'var(--titlebar-height)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--hairline)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        flexShrink: 0,
        gap: 6,
      }}
    >
      <button
        onClick={onToggleSidebar}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--fg-secondary)',
          cursor: 'pointer',
          padding: isMobile ? 8 : 5,
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
      >
        <svg width={isMobile ? 20 : 16} height={isMobile ? 20 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {!isMobile && <ChainSelector value={chain} onChange={setChain} compact />}

      {/* Centered tab name (mobile) */}
      {isMobile && (
        <div style={{
          flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600,
          color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', fontFamily: activeTab?.address ? 'var(--font-mono)' : 'var(--font-sans)',
        }}>
          {centerLabel}
        </div>
      )}

      {!isMobile && <div style={{ flex: 1 }} data-tauri-drag-region />}

      {/* Mobile: tab switcher + network switcher */}
      {isMobile && (
        <>
          {/* Tab switcher */}
          <div ref={tabsRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowTabs(!showTabs); setShowNetworks(false); }}
              style={{
                background: 'none', border: 'none', color: 'var(--fg-secondary)',
                cursor: 'pointer', padding: 6, borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </button>

          {/* New tab button */}
          <button
            onClick={() => { openTab(); setShowTabs(false); }}
            style={{
              background: 'none', border: 'none', color: 'var(--fg-secondary)',
              cursor: 'pointer', padding: 6, borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
            {showTabs && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                minWidth: 220, maxHeight: 320, overflow: 'auto',
                background: 'var(--card)', border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-lg)', padding: 4,
                boxShadow: 'var(--shadow-overlay)', zIndex: 300,
              }}>
                {tabs.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--fg-tertiary)', textAlign: 'center' }}>
                    No open tabs
                  </div>
                ) : (
                  tabs.map(tab => {
                    const isActive = tab.id === activeTabId;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setShowTabs(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '8px 10px',
                          borderRadius: 'var(--radius-md)', border: 'none',
                          background: isActive ? 'var(--hover-overlay)' : 'transparent',
                          fontSize: 12, fontFamily: 'var(--font-mono)',
                          color: isActive ? 'var(--fg)' : 'var(--fg-secondary)',
                          cursor: 'pointer', textAlign: 'left' as const,
                        }}
                      >
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                          background: chainColor[tab.chain] || 'var(--fg-tertiary)',
                        }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tab.address ? `${tab.address.slice(0, 8)}...${tab.address.slice(-6)}` : tab.label || 'New Tab'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Network switcher */}
          <div ref={netRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNetworks(!showNetworks); setShowTabs(false); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 6, borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center',
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: chainColor[chain] || 'var(--fg-tertiary)',
                boxShadow: `0 0 6px ${chainColor[chain] || 'var(--fg-tertiary)'}`,
              }} />
            </button>
            {showNetworks && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                minWidth: 170,
                background: 'var(--card)', border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-lg)', padding: 4,
                boxShadow: 'var(--shadow-overlay)', zIndex: 300,
              }}>
                {CHAINS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setChain(c.id); setShowNetworks(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '7px 10px',
                      borderRadius: 'var(--radius-md)', border: 'none',
                      background: c.id === chain ? 'var(--hover-overlay)' : 'transparent',
                      color: c.id === chain ? 'var(--fg)' : 'var(--fg-secondary)',
                      fontSize: 12, fontFamily: 'var(--font-sans)', cursor: 'pointer',
                      textAlign: 'left' as const,
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: chainColor[c.id] || 'var(--fg-tertiary)', flexShrink: 0,
                    }} />
                    <span style={{ flex: 1 }}>{c.label}</span>
                    {c.id === chain && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Fullscreen toggle */}
      <button
        onClick={toggleFullscreen}
        style={windowBtnStyle}
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
      >
        {isFullscreen ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        )}
      </button>
    </div>
  );
}
