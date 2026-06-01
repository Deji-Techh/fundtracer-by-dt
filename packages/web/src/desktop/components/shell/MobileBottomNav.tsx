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
        bottom: 'max(10px, env(safe-area-inset-bottom, 0px))',
        left: 10,
        right: 10,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 60,
        padding: '7px',
        background: 'color-mix(in srgb, var(--sidebar-bg) 92%, transparent)',
        backdropFilter: 'blur(8px) saturate(190%)',
        WebkitBackdropFilter: 'blur(8px) saturate(190%)',
        border: '1px solid color-mix(in srgb, var(--card-border) 70%, transparent)',
        borderRadius: 22,
        boxShadow: '0 18px 45px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = currentView === item.view;
        return (
          <button
            type="button"
            aria-label={item.label}
            key={item.view}
            onClick={() => onViewChange(item.view)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              flex: 1,
              minWidth: 0,
              minHeight: 46,
              padding: '6px 3px',
              border: 'none',
              borderRadius: 16,
              background: active ? 'rgba(0,230,122,0.12)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--fg-secondary)',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background 180ms ease, color 180ms ease, transform 180ms ease',
              transform: active ? 'translateY(-1px)' : 'translateY(0)',
            }}
          >
            <span style={{ display: 'flex', lineHeight: 0, opacity: active ? 1 : 0.78 }}>
              {item.icon}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: active ? 700 : 500,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
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
