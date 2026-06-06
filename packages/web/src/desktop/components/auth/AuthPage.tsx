import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { extractAddress } from '../../hooks/useClipboardDetection';
import { isTauri } from '../../lib/tauri-commands';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { ChainId } from '../../types';

export function AuthPage() {
  const [submitting, setSubmitting] = useState(false);
  const { loginWithToken } = useAuth();
  const notify = useNotify();
  const pendingTokenRef = useRef<string | null>(null);
  const loginAttemptedRef = useRef(false);
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  const runWindowAction = async (action: 'minimize' | 'toggleMaximize' | 'close') => {
    if (!isTauri()) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow()[action]();
    } catch {}
  };

  // Try Now — interactive wallet analysis demo on auth page
  const [tryAddress, setTryAddress] = useState('');
  const [tryChain, setTryChain] = useState<ChainId>('ethereum');
  const [tryDragOver, setTryDragOver] = useState(false);

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    if (!isTauri()) {
      const redirect = '/app-evm';
      try { sessionStorage.setItem('postLoginRedirect', redirect); } catch {}
      window.location.href = `/api/auth/google/start?redirect=${encodeURIComponent(redirect)}`;
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('start_oauth_popup');
    } catch {
      // Fallback: open in system browser if popup fails
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_in_browser', {
          url: 'https://www.fundtracer.xyz/api/auth/google/start?ref=desktop',
        });
      } catch {
        window.open('https://www.fundtracer.xyz/api/auth/google/start?ref=desktop', '_blank');
      }
    }
    setSubmitting(false);
  };

  const handleTryNow = () => {
    const trimmed = tryAddress.trim();
    if (!trimmed) { notify.error('Please enter a wallet address'); return; }
    try {
      sessionStorage.setItem('try_now_address', trimmed);
      sessionStorage.setItem('try_now_chain', tryChain);
    } catch {}
    handleGoogleSignIn();
  };

  const handleTryDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setTryDragOver(false);
    const text = e.dataTransfer.getData('text/plain');
    if (!text) return;
    const addr = extractAddress(text);
    if (!addr) return;
    const lower = text.toLowerCase();
    let detected: ChainId = 'ethereum';
    if (lower.includes('etherscan')) detected = 'ethereum';
    else if (lower.includes('arbiscan')) detected = 'arbitrum';
    else if (lower.includes('basescan')) detected = 'base';
    else if (lower.includes('polygonscan')) detected = 'polygon';
    else if (lower.includes('bscscan')) detected = 'bsc';
    else if (lower.includes('lineascan')) detected = 'linea';
    else if (lower.includes('optimistic')) detected = 'optimism';
    else if (lower.includes('solscan') || lower.includes('solana')) detected = 'solana';
    setTryAddress(addr);
    setTryChain(detected);
  };

  const handleTryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTryNow();
  };

  // Poll for OAuth token from Rust backend (fallback for event listener)
  useEffect(() => {
    let cancelled = false;

    const tryLogin = async (token: string) => {
      try {
        await loginWithToken(token);
        pendingTokenRef.current = null;
      } catch (err: any) {
        const msg = err?.message || 'Unknown error';
        if (msg === 'in-flight') return; // event listener is handling it, retry next poll
        notify.error(`Sign in failed: ${msg}. Try pasting the token manually.`);
        pendingTokenRef.current = null; // give up on this token
      }
    };

    const poll = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');

        // Retry pending token from previous poll
        if (pendingTokenRef.current && !cancelled) {
          await tryLogin(pendingTokenRef.current);
          return;
        }

        // Already successfully logged in via event listener
        if (loginAttemptedRef.current) return;

        const token = await invoke<string | null>('get_pending_oauth_token');
        if (token && !cancelled) {
          pendingTokenRef.current = token;
          loginAttemptedRef.current = true;
          await tryLogin(token);
        }
      } catch {
        // Not in Tauri — skip
      }
    };

    const interval = setInterval(poll, 1500);
    poll();
    return () => { cancelled = true; clearInterval(interval); };
  }, [loginWithToken, notify]);

  const windowBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: 'var(--fg-secondary)',
    cursor: 'pointer', padding: '6px 10px', borderRadius: 'var(--radius-md)',
    display: 'flex', alignItems: 'center',
  };

  return (
    <div className="desktop-auth-xai">
      {isTauri() && (
        <div className="desktop-auth-xai__titlebar" data-tauri-drag-region>
          <span>FundTracer</span>
          <div data-tauri-drag-region />
          <button type="button" aria-label="Minimize window" onClick={() => runWindowAction('minimize')} style={windowBtnStyle}>-</button>
          <button type="button" aria-label="Toggle maximize window" onClick={() => runWindowAction('toggleMaximize')} style={windowBtnStyle}>□</button>
          <button type="button" aria-label="Close window" onClick={() => runWindowAction('close')} style={windowBtnStyle}>×</button>
        </div>
      )}

      <main className="desktop-auth-xai__main">
        <section className="desktop-auth-xai__panel">
          <div className="desktop-auth-xai__copy">
            <div className="desktop-auth-xai__brand">
              <img src="/logo.png" alt="" />
              <span>FundTracer</span>
            </div>
            <span className="desktop-auth-xai__status"><i /> Available</span>
            <h1>
              Get started
              <span>with FundTracer</span>
            </h1>
            <p>
              Sign in to open wallet intelligence, investigation rooms, CLI sync,
              and funding evidence across the desktop workspace.
            </p>
            <div className="desktop-auth-xai__actions">
              <button type="button" onClick={handleGoogleSignIn} disabled={submitting}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {submitting ? 'Opening sign in...' : 'Continue with Google'}
              </button>
              <a href="https://www.fundtracer.xyz/docs/getting-started" target="_blank" rel="noreferrer">Read docs</a>
            </div>
            <small>By signing in, you agree to the Terms and Privacy Policy.</small>
          </div>

          <div className="desktop-auth-xai__console">
            <div className="desktop-auth-xai__tabs">
              <span className="is-active">Try Now</span>
              <span>Explorer link</span>
              <button type="button" onClick={toggleTheme}>Theme</button>
            </div>
            <div
              className={`desktop-auth-xai__try ${tryDragOver ? 'is-dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setTryDragOver(true); }}
              onDragLeave={() => setTryDragOver(false)}
              onDrop={handleTryDrop}
            >
              <label htmlFor="desktop-auth-wallet">Wallet address</label>
              <div>
                <input
                  id="desktop-auth-wallet"
                  type="text"
                  value={tryAddress}
                  onChange={e => setTryAddress(e.target.value)}
                  onKeyDown={handleTryKeyDown}
                  placeholder="Paste wallet address or drop explorer link"
                  spellCheck={false}
                />
                <button type="button" onClick={handleTryNow} disabled={submitting}>
                  {submitting ? 'Signing in...' : 'Try Now'}
                </button>
              </div>
              <p>Drop an explorer URL to detect the chain and open the scan after sign-in.</p>
            </div>
            <pre>{`case: seed funding review
chain: ${tryChain}
input: ${tryAddress || 'waiting for wallet'}

> read labels and balances
> trace funding depth=4
> open room with pinned evidence`}</pre>
          </div>
        </section>
      </main>
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: isMobile ? 'var(--bg)' : '#f5f5f7',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
    }}>
      {/* Title bar — desktop only */}
      {isTauri() && (
      <div
        data-tauri-drag-region
        style={{
          height: 'var(--titlebar-height)',
          minHeight: 'var(--titlebar-height)',
          display: 'flex', alignItems: 'center',
          padding: '0 8px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--hairline)',
          userSelect: 'none', WebkitUserSelect: 'none',
          flexShrink: 0,
        }}
      >
        <span style={{
          fontSize: 13, fontWeight: 600, color: 'var(--fg)',
          fontFamily: 'var(--font-sans)', marginLeft: 8,
        }}>
          FundTracer
        </span>
        <div style={{ flex: 1 }} data-tauri-drag-region />
        <button type="button" aria-label="Minimize window" onClick={() => runWindowAction('minimize')} style={windowBtnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button type="button" aria-label="Toggle maximize window" onClick={() => runWindowAction('toggleMaximize')} style={windowBtnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
          </svg>
        </button>
        <button type="button" aria-label="Close window" onClick={() => runWindowAction('close')} style={windowBtnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--destructive)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--fg-secondary)'; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
          </svg>
        </button>
      </div>
      )}

      {/* Content */}
      <div style={{ display: 'flex', flex: 1, overflow: isMobile ? 'auto' : 'hidden' }}>
      {/* ─── LEFT PANEL ─── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isMobile ? 'flex-start' : 'center',
        padding: isMobile ? '28px 16px 42px' : '64px 56px',
        background: isMobile
          ? 'linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 74%, var(--bg)), var(--bg) 44%)'
          : '#ffffff',
        position: 'relative',
        minHeight: isMobile ? '100%' : undefined,
      }}>
        {/* Subtle top accent line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--accent-border), transparent)',
        }} />

        <div style={{ width: '100%', maxWidth: isMobile ? 440 : 400 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isMobile ? 28 : 40 }}>
            <div style={{
              width: isMobile ? 40 : 36,
              height: isMobile ? 40 : 36,
              borderRadius: isMobile ? 14 : 10,
              background: isMobile ? 'var(--card)' : '#000',
              border: isMobile ? '1px solid var(--card-border)' : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <img
                src="/logo.png"
                alt=""
                style={{ width: 22, height: 22 }}
              />
            </div>
            <span style={{
              fontSize: 16,
              fontWeight: 650,
              color: isMobile ? 'var(--fg)' : '#1d1d1f',
              letterSpacing: '-0.02em',
            }}>
              FundTracer
            </span>
          </div>

          {/* Heading */}
          <h1 style={{
            fontSize: isMobile ? 30 : 36,
            fontWeight: 700,
            color: isMobile ? 'var(--fg)' : '#1d1d1f',
            letterSpacing: 0,
            lineHeight: 1.1,
            marginBottom: 10,
          }}>
            Welcome to{' '}
            <span style={{ color: 'var(--accent)' }}>FundTracer</span>
          </h1>

          <p style={{
            fontSize: isMobile ? 14 : 15,
            color: isMobile ? 'var(--fg-secondary)' : '#86868b',
            lineHeight: 1.55,
            marginBottom: isMobile ? 22 : 36,
            maxWidth: 380,
          }}>
            Blockchain intelligence and forensics platform. Trace funding sources,
            detect sybil clusters, and investigate on-chain activity.
          </p>

          {/* Google Sign In Card */}
          <div style={{
            background: isMobile ? 'var(--card)' : '#ffffff',
            border: isMobile ? '1px solid var(--card-border)' : '1px solid #d2d2d7',
            borderRadius: isMobile ? 18 : 14,
            padding: isMobile ? 18 : 28,
            marginBottom: 20,
            boxShadow: isMobile ? '0 18px 48px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.04)' : undefined,
          }}>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '12px 0',
                minHeight: isMobile ? 48 : undefined,
                borderRadius: isMobile ? 14 : 10,
                border: isMobile ? '1px solid var(--card-border)' : '1px solid #d2d2d7',
                background: isMobile ? 'var(--bg-secondary)' : '#ffffff',
                color: isMobile ? 'var(--fg)' : '#1d1d1f',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: submitting ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'background 150ms, border-color 150ms',
                opacity: submitting ? 0.6 : 1,
              }}
              onMouseEnter={e => {
                if (!submitting) {
                  e.currentTarget.style.background = isMobile ? 'var(--hover-overlay)' : '#f5f5f7';
                  e.currentTarget.style.borderColor = isMobile ? 'var(--fg-tertiary)' : '#aeaeb2';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isMobile ? 'var(--bg-secondary)' : '#ffffff';
                e.currentTarget.style.borderColor = isMobile ? 'var(--card-border)' : '#d2d2d7';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {submitting ? 'Opening sign in...' : 'Sign in with Google'}
            </button>

            <p style={{
              fontSize: 12,
              color: isMobile ? 'var(--fg-tertiary)' : '#aeaeb2',
              textAlign: 'center',
              marginTop: 16,
              lineHeight: 1.5,
            }}>
              A sign-in window will open. Complete Google authentication
              <br />and you'll be signed in automatically.
            </p>
          </div>

        </div>

        {/* Footer */}
        <p style={{
          position: isMobile ? 'static' : 'absolute',
          bottom: isMobile ? undefined : 28,
          fontSize: 11,
          color: isMobile ? 'var(--fg-tertiary)' : '#aeaeb2',
          marginTop: isMobile ? 24 : undefined,
          textAlign: 'center',
        }}>
          By signing in, you agree to our{' '}
          <a href="https://www.fundtracer.xyz/terms" target="_blank" rel="noreferrer"
            style={{ color: '#86868b', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Terms
          </a>
          {' '}and{' '}
          <a href="https://www.fundtracer.xyz/privacy" target="_blank" rel="noreferrer"
            style={{ color: '#86868b', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Privacy Policy
          </a>
        </p>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="auth-preview-panel" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme === 'light' ? '#f0f0f2' : 'var(--bg-secondary)',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative background grid */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />

        {/* Try Now interactive input */}
        <div
          onDragOver={e => { e.preventDefault(); setTryDragOver(true); }}
          onDragLeave={() => setTryDragOver(false)}
          onDrop={handleTryDrop}
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            maxWidth: 480,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Label */}
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: theme === 'light' ? '#86868b' : 'var(--fg-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 20,
          }}>
            Try Now
          </div>

          {/* Input card */}
          <div style={{
            width: '100%',
            background: theme === 'light' ? '#ffffff' : 'var(--card)',
            border: theme === 'light' ? '1px solid #d2d2d7' : '1px solid var(--card-border)',
            borderRadius: 14,
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            boxShadow: theme === 'light'
              ? '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)'
              : '0 1px 3px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.2)',
          }}>
            {/* Address input */}
            <div style={{ flex: 1, position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme === 'light' ? '#aeaeb2' : 'var(--fg-tertiary)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                type="text"
                aria-label="Wallet address to try"
                value={tryAddress}
                onChange={e => setTryAddress(e.target.value)}
                onKeyDown={handleTryKeyDown}
                placeholder="Paste wallet address or drop an explorer link"
                spellCheck={false}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 36px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: theme === 'light' ? '#1d1d1f' : 'var(--fg)',
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                }}
              />
            </div>

            {/* Try Now button */}
            <button
              type="button"
              onClick={handleTryNow}
              disabled={submitting}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                border: 'none',
                background: submitting ? (theme === 'light' ? '#f5f5f7' : 'var(--bg-secondary)') : 'var(--accent)',
                color: submitting ? (theme === 'light' ? '#aeaeb2' : 'var(--fg-tertiary)') : '#fff',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: submitting ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'opacity 150ms',
              }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {submitting ? 'Signing in...' : 'Try Now'}
            </button>
          </div>

          {/* Hint */}
          <p style={{
            fontSize: 11,
            color: theme === 'light' ? '#aeaeb2' : 'var(--fg-tertiary)',
            marginTop: 12,
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            Drop a blockchain explorer link anywhere to auto-detect chain and address
          </p>
        </div>

        {/* Theme toggle — bottom right */}
        <button
          onClick={toggleTheme}
          type="button"
          title={`Theme: ${theme}`}
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            width: 36,
            height: 36,
            borderRadius: 18,
            border: theme === 'light' ? '1px solid #d2d2d7' : '1px solid var(--card-border)',
            background: theme === 'light' ? '#ffffff' : 'var(--card)',
            color: theme === 'light' ? '#1d1d1f' : 'var(--fg-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            transition: 'background 150ms, border-color 150ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = theme === 'light' ? '#f5f5f7' : 'var(--hover-overlay)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = theme === 'light' ? '#ffffff' : 'var(--card)';
          }}
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          ) : theme === 'dim' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          )}
        </button>

        {/* Drag overlay */}
        {tryDragOver && (
          <div style={{
            position: 'absolute', inset: 0, background: 'var(--accent-soft)',
            border: '2px dashed var(--accent)', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, pointerEvents: 'none',
          }}>
            <div style={{
              padding: '14px 28px', borderRadius: 10,
              background: theme === 'light' ? '#ffffff' : 'var(--card)',
              color: 'var(--accent)', fontSize: 13, fontWeight: 600,
            }}>
              Drop address to try
            </div>
          </div>
        )}

        {/* Ambient glow behind the card */}
        <div style={{
          position: 'absolute',
          width: 400,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />
      </div>
      </div>
    </div>
  );
}
