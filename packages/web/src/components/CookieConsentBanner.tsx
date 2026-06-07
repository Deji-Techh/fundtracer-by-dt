import React, { useEffect, useState } from 'react';

const CONSENT_KEY = 'fundtracer_cookie_consent';
const CONSENT_COOKIE = 'fundtracer_cookie_consent';

type ConsentChoice = 'necessary' | 'all';

function setConsentCookie(choice: ConsentChoice) {
  const maxAge = 60 * 60 * 24 * 180; // 180 days
  document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure`;
}

async function recordConsent(choice: ConsentChoice) {
  try {
    await fetch('/api/config/cookie-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        choice,
        categories: choice === 'all'
          ? ['necessary', 'preferences', 'analytics', 'performance', 'referrals']
          : ['necessary'],
        path: window.location.pathname,
      }),
    });
  } catch {
    // Consent must still be honored locally if the logging request fails.
  }
}

export function hasCookieConsent(category: 'analytics' | 'performance' | 'referrals' | 'preferences') {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored) as { choice?: ConsentChoice; categories?: string[] };
    return parsed.choice === 'all' || !!parsed.categories?.includes(category);
  } catch {
    return false;
  }
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(CONSENT_KEY));
    } catch {
      setVisible(false);
    }
  }, []);

  const saveChoice = async (choice: ConsentChoice) => {
    const payload = {
      choice,
      categories: choice === 'all'
        ? ['necessary', 'preferences', 'analytics', 'performance', 'referrals']
        : ['necessary'],
      acceptedAt: Date.now(),
      version: '2026-06-07',
    };

    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
      setConsentCookie(choice);
    } catch {
      // Ignore browser storage failures.
    }

    setVisible(false);
    await recordConsent(choice);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '20px',
        transform: 'translateX(-50%)',
        width: 'min(960px, calc(100vw - 32px))',
        zIndex: 9999,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(10,10,10,0.94)',
        color: '#fff',
        borderRadius: '18px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(18px)',
        padding: '18px',
        display: 'grid',
        gap: '14px',
      }}
    >
      <div style={{ display: 'grid', gap: '6px' }}>
        <strong style={{ fontSize: '15px' }}>Cookies on FundTracer</strong>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)', fontSize: '13px', lineHeight: 1.55 }}>
          We use necessary cookies for login, security, consent storage, referrals, and basic app stability.
          With your permission, we also use analytics and performance cookies to find broken flows,
          improve UI, and understand feature usage.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => saveChoice('necessary')}
          style={{
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'transparent',
            color: '#fff',
            borderRadius: '999px',
            padding: '10px 14px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Necessary only
        </button>
        <button
          type="button"
          onClick={() => saveChoice('all')}
          style={{
            border: '1px solid #fff',
            background: '#fff',
            color: '#0a0a0a',
            borderRadius: '999px',
            padding: '10px 14px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          Allow all cookies
        </button>
      </div>
    </div>
  );
}
