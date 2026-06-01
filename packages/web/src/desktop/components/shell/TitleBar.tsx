import { useState, useEffect, useCallback } from 'react';
import { useChain } from '../../contexts/ChainContext';
import { ChainSelector } from '../common/ChainSelector';

interface TitleBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
}

export function TitleBar({ onToggleSidebar, isMobile }: TitleBarProps) {
  const { chain, setChain } = useChain();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen API not supported or denied
    }
  }, []);

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

      <ChainSelector value={chain} onChange={setChain} compact />

      <div style={{ flex: 1 }} data-tauri-drag-region />

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
