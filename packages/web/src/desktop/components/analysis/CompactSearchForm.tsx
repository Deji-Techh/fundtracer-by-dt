import type { ReactNode } from 'react';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface InputStageProps {
  title: string;
  hint?: string;
  maxWidth?: number;
  children: ReactNode;
}

export function InputStage({ title, hint, maxWidth = 640, children }: InputStageProps) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      width: '100%',
      maxWidth,
      margin: '0 auto',
      padding: isMobile ? '20px 14px 92px' : '40px 24px',
    }}>
      <div style={{
        fontSize: isMobile ? 10 : 11,
        fontWeight: 700,
        color: 'var(--fg-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: isMobile ? 10 : 14,
      }}>
        {title}
      </div>
      {children}
      {hint && (
        <p style={{
          fontSize: isMobile ? 10 : 11,
          color: 'var(--fg-tertiary)',
          marginTop: 10,
          textAlign: 'center',
          lineHeight: 1.4,
        }}>
          {hint}
        </p>
      )}
    </div>
  );
}

interface CompactSearchFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  ariaLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  submitLabel: string;
  loadingLabel?: string;
  autoFocus?: boolean;
  leftSlot?: ReactNode;
}

export function CompactSearchForm({
  value,
  onChange,
  onSubmit,
  placeholder,
  ariaLabel,
  loading,
  disabled,
  submitLabel,
  loadingLabel,
  autoFocus,
  leftSlot,
}: CompactSearchFormProps) {
  const isMobile = useIsMobile();
  const canSubmit = !disabled && !loading;

  return (
    <div style={{
      width: '100%',
      minHeight: isMobile ? 48 : 46,
      background: 'var(--card)',
      border: '1px solid var(--card-border)',
      borderRadius: isMobile ? 12 : 'var(--radius-lg)',
      padding: 4,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      boxShadow: isMobile ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : undefined,
    }}>
      {leftSlot}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          type="text"
          aria-label={ariaLabel || placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          spellCheck={false}
          style={{
            width: '100%',
            minWidth: 0,
            height: isMobile ? 40 : 38,
            padding: '0 10px 0 32px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--fg)',
            fontSize: isMobile ? 12 : 13,
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        />
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        aria-label={loading ? (loadingLabel || submitLabel) : submitLabel}
        title={loading ? (loadingLabel || submitLabel) : submitLabel}
        style={{
          width: isMobile ? 40 : undefined,
          minWidth: isMobile ? 40 : 84,
          height: isMobile ? 40 : 38,
          padding: isMobile ? 0 : '0 16px',
          borderRadius: isMobile ? 10 : 'var(--radius-md)',
          border: 'none',
          background: canSubmit ? 'var(--accent)' : 'var(--bg-secondary)',
          color: canSubmit ? '#000' : 'var(--fg-tertiary)',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'var(--font-sans)',
          cursor: canSubmit ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {loading ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 10,
              height: 10,
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.6s linear infinite',
            }} />
            {!isMobile && (loadingLabel || submitLabel)}
          </span>
        ) : isMobile ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
}
