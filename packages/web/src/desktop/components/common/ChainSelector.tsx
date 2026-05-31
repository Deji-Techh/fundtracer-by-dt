import { useState, useRef, useEffect } from 'react';
import type { ChainId } from '../../types';
import { CHAINS } from '../../contexts/ChainContext';

const chainAbbr: Record<string, string> = {
  ethereum: 'ETH', linea: 'LNA', arbitrum: 'ARB', base: 'BASE',
  optimism: 'OP', polygon: 'POL', bsc: 'BSC', solana: 'SOL',
};

const chainColor: Record<string, string> = {
  ethereum: '#627eea', linea: '#61dfff', arbitrum: '#28a0f0', base: '#0052ff',
  optimism: '#ff0420', polygon: '#8247e5', bsc: '#f0b90b', solana: '#9945ff',
};

interface ChainSelectorProps {
  value: ChainId;
  onChange: (chain: ChainId) => void;
  compact?: boolean;
  style?: React.CSSProperties;
}

export function ChainSelector({ value, onChange, compact, style }: ChainSelectorProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={menuRef} style={{ position: 'relative', ...style }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: compact ? '4px 8px' : '8px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--hairline)',
          background: open ? 'var(--hover-overlay)' : 'transparent',
          color: 'var(--fg)',
          fontSize: compact ? 11 : 13,
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
          outline: 'none',
          transition: 'background 150ms',
        }}
      >
        <span style={{
          width: compact ? 7 : 8,
          height: compact ? 7 : 8,
          borderRadius: '50%',
          background: chainColor[value] || 'var(--fg-tertiary)',
          flexShrink: 0,
        }} />
        <span style={{ color: 'var(--fg)' }}>{chainAbbr[value] || value}</span>
        <svg width={compact ? 10 : 12} height={compact ? 10 : 12} viewBox="0 0 24 24" fill="none" stroke="var(--fg-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          minWidth: 170,
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 4,
          boxShadow: 'var(--shadow-overlay)',
          zIndex: 300,
        }}>
          {CHAINS.map(c => (
            <button
              key={c.id}
              onClick={() => { onChange(c.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '7px 10px',
                borderRadius: 'var(--radius-md)',
                border: 'none', background: c.id === value ? 'var(--hover-overlay)' : 'transparent',
                color: c.id === value ? 'var(--fg)' : 'var(--fg-secondary)',
                fontSize: 12, fontFamily: 'var(--font-sans)', cursor: 'pointer',
                textAlign: 'left' as const,
              }}
              onMouseEnter={e => { if (c.id !== value) e.currentTarget.style.background = 'var(--hover-overlay)'; }}
              onMouseLeave={e => { if (c.id !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: chainColor[c.id] || 'var(--fg-tertiary)',
                flexShrink: 0,
              }} />
              <span style={{ flex: 1 }}>{c.label}</span>
              {c.id === value && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
