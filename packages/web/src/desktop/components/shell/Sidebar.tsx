import { useState, useEffect } from 'react';
import { useTabs } from '../../contexts/TabsContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getTorqueStats, type TorqueStats } from '../../api/torque';
import type { AppView } from '../../types';

interface SidebarProps {
  currentView: AppView;
  onViewChange: (v: AppView) => void;
  collapsed: boolean;
  onOpenCommand: () => void;
}

function Collapsible({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <span style={{
      opacity: show ? 1 : 0,
      maxWidth: show ? undefined : 0,
      transition: show ? 'opacity 150ms ease 100ms, max-width 0ms 150ms' : 'opacity 80ms ease, max-width 0ms 80ms',
      pointerEvents: show ? 'auto' : 'none',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      display: 'inline-block',
      verticalAlign: 'middle',
    }}>
      {children}
    </span>
  );
}

function CollapsibleBlock({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      opacity: show ? 1 : 0,
      transition: show ? 'opacity 200ms ease 120ms' : 'opacity 80ms ease',
      pointerEvents: show ? 'auto' : 'none',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

export function Sidebar({ currentView, onViewChange, collapsed, onOpenCommand }: SidebarProps) {
  const { tabs, openTab, closeTab, setActiveTab, activeTabId } = useTabs();
  const { theme, toggleTheme } = useTheme();
  const { profile } = useAuth();
  const [torque, setTorque] = useState<TorqueStats | null>(null);

  useEffect(() => {
    if (profile?.uid) {
      getTorqueStats(profile.uid).then(setTorque).catch(() => {});
    }
  }, [profile?.uid]);

  const width = collapsed ? 64 : 240;

  return (
    <aside style={{
      width,
      minWidth: width,
      transition: 'width 250ms ease',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--sidebar-bg)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderRight: '1px solid var(--sidebar-border)',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Search */}
      <div style={{ padding: '12px 10px 8px' }}>
        <button
          onClick={onOpenCommand}
          style={{
            width: '100%',
            padding: collapsed ? '8px 0' : '7px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--card-border)',
            background: 'var(--card)',
            color: 'var(--fg-tertiary)',
            fontSize: 12,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <Collapsible show={!collapsed}>
            <>
              <span style={{ flex: 1 }}>Search or type a command</span>
              <span style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)' }}>
                ⌘K
              </span>
            </>
          </Collapsible>
        </button>
      </div>

      {/* New Analysis */}
      <div style={{ padding: '0 10px 10px' }}>
        <button
          onClick={() => openTab()}
          style={{
            width: '100%',
            padding: '8px 0',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'var(--accent)',
            color: '#000',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <Collapsible show={!collapsed}>New Analysis</Collapsible>
        </button>
      </div>

      <div style={{ height: 1, background: 'var(--hairline)', margin: '0 12px' }} />

      {/* Open Tabs */}
      {tabs.length > 0 && (
        <CollapsibleBlock show={!collapsed}>
          <div style={{ padding: '14px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Open Tabs
            </span>
            <span style={{ fontSize: 9, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)' }}>{tabs.length}</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '0 6px' }}>
            {tabs.map(tab => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); onViewChange('analyze'); }}
                  title={tab.address || 'New Tab'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px 6px 10px',
                    margin: '1px 0',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    background: isActive ? 'var(--hover-overlay)' : 'transparent',
                    transition: 'background 120ms',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--hover-overlay)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 6,
                      bottom: 6,
                      width: 2,
                      borderRadius: '0 2px 2px 0',
                      background: 'var(--accent)',
                    }} />
                  )}
                  {/* Chain dot */}
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: tab.chain === 'ethereum' ? '#627eea'
                      : tab.chain === 'base' ? '#0052ff'
                      : tab.chain === 'arbitrum' ? '#28a0f0'
                      : tab.chain === 'optimism' ? '#ff0420'
                      : tab.chain === 'polygon' ? '#8247e5'
                      : tab.chain === 'bsc' ? '#f0b90b'
                      : tab.chain === 'linea' ? '#00e67a'
                      : 'var(--accent)',
                    boxShadow: isActive ? `0 0 6px ${
                      tab.chain === 'ethereum' ? '#627eea'
                      : tab.chain === 'base' ? '#0052ff'
                      : tab.chain === 'arbitrum' ? '#28a0f0'
                      : tab.chain === 'optimism' ? '#ff0420'
                      : tab.chain === 'polygon' ? '#8247e5'
                      : tab.chain === 'bsc' ? '#f0b90b'
                      : tab.chain === 'linea' ? '#00e67a'
                      : 'var(--accent)'
                    }` : 'none',
                  }} />
                  {/* Label */}
                  <span style={{
                    flex: 1,
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: tab.loading ? 'var(--fg-tertiary)' : isActive ? 'var(--fg)' : 'var(--fg-secondary)',
                    fontWeight: isActive ? 500 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 0,
                  }}>
                    {tab.label || (tab.address ? `${tab.address.slice(0, 6)}...${tab.address.slice(-4)}` : 'New Tab')}
                    {tab.loading && <span style={{ color: 'var(--accent)' }}> ...</span>}
                  </span>
                  {/* Close button */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    title="Close tab"
                    style={{
                      width: 18,
                      height: 18,
                      padding: 0,
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      color: 'var(--fg-tertiary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 13,
                      lineHeight: 1,
                      opacity: 0.5,
                      transition: 'opacity 120ms, background 120ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--hover-overlay)'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    &times;
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ height: 1, background: 'var(--hairline)', margin: '0 12px' }} />
        </CollapsibleBlock>
      )}

      {/* Navigation */}
      <div style={{ padding: '8px 8px' }}>
        <NavItem icon={AnalyzeIcon} label="Analyze" collapsed={collapsed} active={currentView === 'analyze'} onClick={() => onViewChange('analyze')} />
        <NavItem icon={CompareIcon} label="Compare" collapsed={collapsed} active={currentView === 'compare'} onClick={() => onViewChange('compare')} />
        <NavItem icon={ContractIcon} label="Contract Scanner" collapsed={collapsed} active={currentView === 'contract-scanner'} onClick={() => onViewChange('contract-scanner')} />
        <NavItem icon={InteractorsIcon} label="Interactors" collapsed={collapsed} active={currentView === 'interactors'} onClick={() => onViewChange('interactors')} />
        <NavItem icon={SybilIcon} label="Sybil Detection" collapsed={collapsed} active={currentView === 'sybil-detection'} onClick={() => onViewChange('sybil-detection')} />
        <NavItem icon={CEXIcon} label="CEX Flow" collapsed={collapsed} active={currentView === 'cex-flow'} onClick={() => onViewChange('cex-flow')} />
        <NavItem icon={MarketIcon} label="Polymarket" collapsed={collapsed} active={currentView === 'polymarket'} onClick={() => onViewChange('polymarket')} />
        <NavItem icon={ChatIcon} label="AI Chat" collapsed={collapsed} active={currentView === 'ai-chat'} onClick={() => onViewChange('ai-chat')} />
        <NavItem icon={RoomsIcon} label="Rooms" collapsed={collapsed} active={currentView === 'rooms'} onClick={() => onViewChange('rooms')} />
        <NavItem icon={SettingsIcon} label="Settings" collapsed={collapsed} active={currentView === 'settings'} onClick={() => onViewChange('settings')} />
      </div>

      <div style={{ flex: 1 }} />

      {/* Torque Rewards */}
      {torque && !collapsed && (
        <div style={{ padding: '0 12px 8px' }}>
          <div style={{
            padding: '8px 10px', borderRadius: 'var(--radius-lg)',
            background: 'rgba(0,230,122,0.06)', border: '1px solid rgba(0,230,122,0.12)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Rewards
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                {torque.points.toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 9, color: 'var(--fg-tertiary)' }}>Rank #{torque.rank || '—'}</span>
              <span style={{ fontSize: 9, color: 'var(--fg-tertiary)' }}>{torque.streak}d streak</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom: theme toggle */}
      <div style={{
        padding: '10px',
        borderTop: '1px solid var(--hairline)',
        display: 'flex',
        justifyContent: collapsed ? 'center' : 'flex-end',
      }}>
        <button
          onClick={toggleTheme}
          title={`Theme: ${theme}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 'var(--radius-md)',
            color: 'var(--fg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; e.currentTarget.style.color = 'var(--fg)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--fg-tertiary)'; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {theme === 'dark' ? (
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            ) : theme === 'dim' ? (
              <><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></>
            ) : (
              <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>
            )}
          </svg>
        </button>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, collapsed, active, onClick }: {
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: collapsed ? '8px 0' : '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 10,
        border: 'none',
        borderRadius: 'var(--radius-md)',
        background: active ? 'var(--hover-overlay)' : 'transparent',
        color: active ? 'var(--sidebar-active)' : 'var(--sidebar-fg)',
        fontSize: 12,
        fontWeight: active ? 500 : 400,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        transition: 'all 150ms',
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.background = 'var(--hover-overlay)';
        e.currentTarget.style.color = 'var(--fg)';
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = active ? 'var(--sidebar-active)' : 'var(--sidebar-fg)';
      }}
    >
      {icon}
      <span style={{
        opacity: collapsed ? 0 : 1,
        maxWidth: collapsed ? 0 : undefined,
        transition: collapsed ? 'opacity 80ms ease, max-width 0ms 80ms' : 'opacity 150ms ease 100ms, max-width 0ms 150ms',
        pointerEvents: collapsed ? 'none' : 'auto',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}>
        {label}
      </span>
    </button>
  );
}

const svgProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const AnalyzeIcon = <svg {...svgProps}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const CompareIcon = <svg {...svgProps}><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/></svg>;
const ContractIcon = <svg {...svgProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const ChatIcon = <svg {...svgProps}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const RoomsIcon = <svg {...svgProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const SettingsIcon = <svg {...svgProps}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const InteractorsIcon = <svg {...svgProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const SybilIcon = <svg {...svgProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const CEXIcon = <svg {...svgProps}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></svg>;
