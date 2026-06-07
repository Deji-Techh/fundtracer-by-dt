import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getFirestore } from '../firebase.js';

const router = Router();
const CONSENT_ID_COOKIE = 'fundtracer_consent_id';
const CONSENT_CATEGORIES = ['necessary', 'preferences', 'analytics', 'performance', 'referrals'] as const;

// GET /api/config/firebase
// Serves Firebase client config at runtime (bypasses Vite build-time VITE_ requirement)
router.get('/firebase', (_req: Request, res: Response) => {
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || null,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || null,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || null,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || null,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || null,
    appId: process.env.VITE_FIREBASE_APP_ID || null,
  };

  res.json(config);
});

function getOptionalUserId(req: Request): string | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const authHeader = req.headers.authorization;
    const sessionToken = getCookieValue(req, 'fundtracer_session');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : sessionToken;

    if (!token) return null;

    const decoded = jwt.verify(token, secret) as any;
    return decoded?.uid || decoded?.address?.toLowerCase() || null;
  } catch {
    return null;
  }
}

function getCookieValue(req: Request, name: string): string | undefined {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) return undefined;

  for (const part of rawCookie.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }
  return undefined;
}

function getOrSetConsentId(req: Request, res: Response): string {
  const existing = getCookieValue(req, CONSENT_ID_COOKIE);
  if (existing && /^[a-f0-9-]{32,64}$/i.test(existing)) {
    return existing;
  }

  const id = crypto.randomUUID();
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (process.env.FRONTEND_URL || '').startsWith('https://');
  res.cookie(CONSENT_ID_COOKIE, id, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 180 * 24 * 60 * 60 * 1000,
  });
  return id;
}

function categoriesForChoice(choice: 'necessary' | 'all') {
  return CONSENT_CATEGORIES.reduce((acc, category) => {
    acc[category] = category === 'necessary' || choice === 'all';
    return acc;
  }, {} as Record<(typeof CONSENT_CATEGORIES)[number], boolean>);
}

router.post('/cookie-consent', async (req: Request, res: Response) => {
  const { choice, decidedAt, version } = req.body || {};

  if (!['necessary', 'all'].includes(choice)) {
    return res.status(400).json({ success: false, error: 'Invalid cookie consent choice' });
  }

  try {
    const userId = getOptionalUserId(req);
    const anonymousConsentId = userId ? null : getOrSetConsentId(req, res);
    const db = getFirestore();
    const record = {
      userId,
      choice,
      anonymousConsentId,
      categories: categoriesForChoice(choice),
      decidedAt: typeof decidedAt === 'string' && decidedAt.length <= 64 ? decidedAt : new Date().toISOString(),
      version: Number.isFinite(Number(version)) ? Number(version) : 1,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
      updatedAt: Date.now(),
    };

    const id = userId ? `user_${userId}` : `anonymous_${anonymousConsentId}`;
    await db.collection('cookie_consents').doc(id).set(record, { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error('[Config] Failed to record cookie consent:', error);
    res.status(500).json({ success: false, error: 'Failed to record cookie consent' });
  }
});

export default router;
