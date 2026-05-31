export function Loader({ fullScreen }: { fullScreen?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: fullScreen ? '100vh' : '100%',
      width: fullScreen ? '100vw' : '100%',
      background: 'var(--bg)',
    }}>
      <div className="animate-fade-in" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--fg-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--fg-tertiary)' }}>
          FundTracer
        </span>
      </div>
    </div>
  );
}
