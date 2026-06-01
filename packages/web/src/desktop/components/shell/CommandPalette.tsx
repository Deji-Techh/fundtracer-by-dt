import { useState, useEffect, useRef } from 'react';
import { useTabs } from '../../contexts/TabsContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppView } from '../../types';

interface CommandPaletteProps {
  onClose: () => void;
  onNavigate?: (v: AppView) => void;
}

export function CommandPalette({ onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { openTab } = useTabs();
  const { toggleTheme } = useTheme();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAnalyze = () => {
    const addr = query.trim();
    if (addr) {
      openTab(addr);
      onClose();
    }
  };

  const handleCommand = (action: () => void) => {
    action();
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter') {
      const addr = query.trim();
      if (addr && looksLikeAddress) {
        handleAnalyze();
      }
    }
  };

  // Detect if query looks like an address
  const looksLikeAddress = /^(0x[a-fA-F0-9]{40,}|[1-9A-HJ-NP-Za-km-z]{32,44}|.+\.eth)$/.test(query.trim());

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="animate-slide-up"
        style={{
          width: 560,
          maxWidth: '90vw',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-overlay)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px 16px' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search address, ENS, or enter a command..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--fg)',
              fontSize: 15,
              fontFamily: 'var(--font-mono)',
              lineHeight: '24px',
            }}
          />
        </div>

        {query.trim() && looksLikeAddress && (
          <div style={{ borderTop: '1px solid var(--hairline)' }}>
            <div
              onClick={handleAnalyze}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                color: 'var(--fg)',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <span>Analyze <strong style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{query.trim().slice(0, 30)}{query.trim().length > 30 ? '...' : ''}</strong></span>
            </div>
          </div>
        )}

        {!query.trim() && (
          <div style={{ borderTop: '1px solid var(--hairline)', padding: '8px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-tertiary)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>
              Commands
            </div>
            {[
              { label: 'New Analysis', desc: 'Open a new analysis tab', action: () => { openTab(); } },
              { label: 'Contract Scanner', desc: 'Scan contracts for sybil activity', action: () => { onNavigate?.('contract-scanner'); } },
              { label: 'Interactors', desc: 'Find addresses interacting with a contract', action: () => { onNavigate?.('interactors'); } },
              { label: 'Sybil Detection', desc: 'Detect sybil clusters and fake accounts', action: () => { onNavigate?.('sybil-detection'); } },
              { label: 'CEX Flow Analysis', desc: 'Trace exchange fund flows', action: () => { onNavigate?.('cex-flow'); } },
              { label: 'Polymarket', desc: 'Open prediction market intelligence', action: () => { onNavigate?.('polymarket'); } },
              { label: 'AI Chat', desc: 'Chat with FundTracer AI', action: () => { onNavigate?.('ai-chat'); } },
              { label: 'Toggle Theme', desc: 'Switch between dark and light mode', action: () => { toggleTheme(); } },
              { label: 'Open Settings', desc: 'Manage API keys and preferences', action: () => { onNavigate?.('settings'); } },
            ].map(cmd => (
              <div
                key={cmd.label}
                onClick={() => handleCommand(cmd.action)}
                style={{
                  padding: '8px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  color: 'var(--fg-secondary)',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-md)',
                  margin: '0 -6px',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; e.currentTarget.style.color = 'var(--fg)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-secondary)'; }}
              >
                <span>{cmd.label}</span>
                <span style={{ fontSize: 10, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)' }}>{cmd.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
