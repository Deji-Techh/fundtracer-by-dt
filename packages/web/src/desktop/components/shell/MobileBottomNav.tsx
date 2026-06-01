import type { AppView } from '../../types';

interface MobileBottomNavProps {
  currentView: AppView;
  onViewChange: (v: AppView) => void;
}

const NAV_ITEMS: { view: AppView; label: string; icon: React.ReactNode }[] = [
  { view: 'analyze', label: 'Analyze', icon: AnalyzeIcon },
  { view: 'polymarket', label: 'Markets', icon: PolymarketIcon },
  { view: 'ai-chat', label: 'AI Chat', icon: ChatIcon },
  { view: 'rooms', label: 'Rooms', icon: RoomsIcon },
  { view: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function MobileBottomNav({ currentView, onViewChange }: MobileBottomNavProps) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 56,
        paddingBottom: 'env(safe-area-inset-bottom, 4px)',
        background: 'var(--sidebar-bg)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid var(--hairline)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = currentView === item.view;
        return (
          <button
            key={item.view}
            onClick={() => onViewChange(item.view)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              flex: 1,
              minWidth: 0,
              padding: '6px 4px',
              border: 'none',
              background: 'transparent',
              color: active ? 'var(--accent)' : 'var(--fg-tertiary)',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              transition: 'color 150ms',
            }}
          >
            {item.icon}
            <span style={{
              fontSize: 10,
              fontWeight: active ? 600 : 400,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

const svgProps = { width: 20, height: 20, viewBox: '0 0 24 24' as const, fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const AnalyzeIcon = <svg {...svgProps}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const PolymarketIcon = <svg {...svgProps}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
const ChatIcon = <svg {...svgProps}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const RoomsIcon = <svg {...svgProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const SettingsIcon = <svg {...svgProps}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
