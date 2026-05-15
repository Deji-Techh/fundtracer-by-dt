import { Router, Request, Response } from 'express';

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

export default router;
