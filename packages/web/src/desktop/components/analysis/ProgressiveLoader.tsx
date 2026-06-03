interface ProgressiveLoaderProps {
  title: string;
  steps: string[];
  compact?: boolean;
  message?: string;
}

export function ProgressiveLoader({ title, steps, compact, message }: ProgressiveLoaderProps) {
  return (
    <div style={{
      width: '100%',
      padding: compact ? 18 : 22,
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--hairline)',
      background: 'var(--card)',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      color: 'var(--fg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 16,
          height: 16,
          border: '2px solid var(--card-border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          flexShrink: 0,
        }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>{message || 'Results will fill in as soon as the backend finishes each stage.'}</div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 8,
      }}>
        {steps.map((step, i) => (
          <div key={step} style={{
            minHeight: 42,
            padding: '9px 11px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--card-border)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: i === 0 ? 'rgba(0,230,122,0.12)' : 'var(--hover-overlay)',
              color: i === 0 ? 'var(--accent)' : 'var(--fg-tertiary)',
              fontSize: 10,
              fontWeight: 750,
              flexShrink: 0,
            }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 12, color: 'var(--fg-secondary)', lineHeight: 1.3 }}>{step}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            height: i === 0 ? 12 : 10,
            width: i === 0 ? '88%' : i === 1 ? '64%' : '76%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, var(--bg-secondary), var(--hover-overlay), var(--bg-secondary))',
            backgroundSize: '220% 100%',
            animation: 'shimmer 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.08}s`,
          }} />
        ))}
      </div>
    </div>
  );
}
