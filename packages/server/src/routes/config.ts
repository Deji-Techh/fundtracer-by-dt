import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getFirestore } from '../firebase.js';

const router = Router();

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
  const authHeader = req.headers.authorization;
  const secret = process.env.JWT_SECRET;
  if (!authHeader?.startsWith('Bearer ') || !secret) return null;

  try {
    const decoded = jwt.verify(authHeader.slice('Bearer '.length), secret) as any;
    return decoded?.uid || decoded?.address?.toLowerCase() || null;
  } catch {
    return null;
  }
}

router.post('/cookie-consent', async (req: Request, res: Response) => {
  const { choice, categories, decidedAt, version } = req.body || {};

  if (!['necessary', 'all'].includes(choice)) {
    return res.status(400).json({ success: false, error: 'Invalid cookie consent choice' });
  }

  try {
    const userId = getOptionalUserId(req);
    const db = getFirestore();
    const record = {
      userId,
      choice,
      categories: categories || {},
      decidedAt: decidedAt || new Date().toISOString(),
      version: Number(version) || 1,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
      updatedAt: Date.now(),
    };

    const id = userId || `anonymous_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await db.collection('cookie_consents').doc(id).set(record, { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error('[Config] Failed to record cookie consent:', error);
    res.status(500).json({ success: false, error: 'Failed to record cookie consent' });
  }
});

export default router;
