export type CookieConsentChoice = 'necessary' | 'all';
export type CookieConsentCategory = 'necessary' | 'preferences' | 'analytics' | 'performance' | 'referrals';

export interface CookieConsentState {
  choice: CookieConsentChoice;
  categories: Record<CookieConsentCategory, boolean>;
  decidedAt: string;
  version: number;
}

export const COOKIE_CONSENT_STORAGE_KEY = 'fundtracer_cookie_consent';
export const COOKIE_CONSENT_COOKIE_NAME = 'fundtracer_cookie_consent';
export const COOKIE_CONSENT_VERSION = 1;

const ALL_CATEGORIES: CookieConsentCategory[] = [
  'necessary',
  'preferences',
  'analytics',
  'performance',
  'referrals',
];

export function buildCookieConsentState(choice: CookieConsentChoice): CookieConsentState {
  const allAllowed = choice === 'all';

  return {
    choice,
    categories: ALL_CATEGORIES.reduce((acc, category) => {
      acc[category] = category === 'necessary' || allAllowed;
      return acc;
    }, {} as Record<CookieConsentCategory, boolean>),
    decidedAt: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
}

export function getCookieConsent(): CookieConsentState | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CookieConsentState;
    if (!parsed?.choice || parsed.version !== COOKIE_CONSENT_VERSION) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function hasCookieConsent(category: CookieConsentCategory): boolean {
  if (category === 'necessary') return true;
  return getCookieConsent()?.categories?.[category] === true;
}

export function saveCookieConsent(state: CookieConsentState): void {
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(state));

  const maxAge = 60 * 60 * 24 * 180;
  document.cookie = [
    `${COOKIE_CONSENT_COOKIE_NAME}=${encodeURIComponent(state.choice)}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'SameSite=Lax',
    window.location.protocol === 'https:' ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}
