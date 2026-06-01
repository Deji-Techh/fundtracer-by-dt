import { useChain } from '../../contexts/ChainContext';
import { ChainSelector } from '../common/ChainSelector';
import { isTauri } from '../../lib/tauri-commands';

interface TitleBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
}

export function TitleBar({ onToggleSidebar, isMobile }: TitleBarProps) {
  const { chain, setChain } = useChain();

  const runWindowAction = async (action: 'minimize' | 'toggleMaximize' | 'close') => {
    if (!isTauri()) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow()[action]();
    } catch {
      // Browser build: keep the desktop chrome visible, but inactive.
    }
  };

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

      {/* Window controls — desktop only */}
      {!isMobile && (
        <>
          <button
            onClick={() => runWindowAction('minimize')}
            style={windowBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button
            onClick={() => runWindowAction('toggleMaximize')}
            style={windowBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
          </button>
          <button
            onClick={() => runWindowAction('close')}
            style={windowBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--destructive)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--fg-secondary)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
