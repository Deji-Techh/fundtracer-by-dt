import { useEffect, useState } from 'react';
import { API_BASE, getAuthToken } from '../api';
import {
  buildCookieConsentState,
  getCookieConsent,
  saveCookieConsent,
  type CookieConsentChoice,
  type CookieConsentState,
} from '../utils/cookieConsent';
import './CookieConsentBanner.css';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!getCookieConsent());
  }, []);

  const recordConsent = async (state: CookieConsentState) => {
    try {
      const token = getAuthToken();
      await fetch(`${API_BASE}/api/config/cookie-consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(state),
      });
    } catch (error) {
      console.warn('[CookieConsent] Failed to record consent:', error);
    }
  };

  const choose = (choice: CookieConsentChoice) => {
    const state = buildCookieConsentState(choice);
    saveCookieConsent(state);
    if (choice === 'all') {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref) {
        localStorage.setItem('referral_ref', ref);
      }
    }
    setVisible(false);
    void recordConsent(state);
  };

  if (!visible) return null;

  return (
    <aside className="cookie-consent" aria-label="Cookie consent">
      <div className="cookie-consent__content">
        <span className="cookie-consent__eyebrow">Privacy choices</span>
        <h2>Choose how FundTracer uses cookies</h2>
        <p>
          Necessary cookies keep login, security, consent, and core app flows working.
          All cookies add analytics, performance diagnostics, referrals, and product improvement.
        </p>
      </div>
      <div className="cookie-consent__actions">
        <button type="button" className="cookie-consent__btn cookie-consent__btn--ghost" onClick={() => choose('necessary')}>
          Necessary only
        </button>
        <button type="button" className="cookie-consent__btn cookie-consent__btn--primary" onClick={() => choose('all')}>
          Allow all cookies
        </button>
      </div>
    </aside>
  );
}
