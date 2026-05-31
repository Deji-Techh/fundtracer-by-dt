import { useTabs } from '../../contexts/TabsContext';
import { WalletInput } from './WalletInput';

export function AnalysisTabs() {
  const { tabs, activeTabId, closeTab, setActiveTab, openTab } = useTabs();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar — admin-style segmented control */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '10px 16px 8px',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: 3,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--card-border)',
          background: 'var(--bg-secondary)',
          flex: 1,
          overflow: 'auto',
          minWidth: 0,
        }}>
          {tabs.map(tab => {
            const isActive = tab.id === activeTabId;
            const label = tab.address
              ? `${tab.address.slice(0, 6)}...${tab.address.slice(-4)}`
              : 'New Analysis';

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: isActive ? 500 : 400,
                  fontFamily: tab.address ? 'var(--font-mono)' : 'var(--font-sans)',
                  color: isActive ? 'var(--bg)' : 'var(--fg-tertiary)',
                  background: isActive ? 'var(--fg)' : 'transparent',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'background 150ms, color 150ms',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--fg-secondary)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--fg-tertiary)'; }}
              >
                {tab.loading && (
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: isActive ? 'var(--bg)' : 'var(--accent)',
                  }} />
                )}
                <span>{label}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                    style={{
                      background: 'none', border: 'none',
                      color: isActive ? 'var(--bg)' : 'var(--fg-tertiary)',
                      cursor: 'pointer', padding: '0 1px', fontSize: 13, lineHeight: '13px',
                      borderRadius: 'var(--radius-md)', opacity: 0.5,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* New tab button */}
        <button
          onClick={() => openTab()}
          style={{
            background: 'none',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--fg-tertiary)',
            cursor: 'pointer',
            padding: '6px 10px',
            fontSize: 14,
            lineHeight: '14px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.borderColor = 'var(--fg-secondary)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-tertiary)'; e.currentTarget.style.borderColor = 'var(--card-border)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <div style={{ height: 1, background: 'var(--hairline)', margin: '0 16px', flexShrink: 0 }} />

      {/* Active tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tabs.map(tab => (
          <div key={tab.id} style={{ display: tab.id === activeTabId ? 'block' : 'none', height: '100%' }}>
            <WalletInput tab={tab} />
          </div>
        ))}
      </div>
    </div>
  );
}
