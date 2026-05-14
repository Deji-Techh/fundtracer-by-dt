import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();

function getHeliusKeys(): string[] {
  return [
    process.env.HELIUS_KEY_1,
    process.env.HELIUS_KEY_2,
    process.env.HELIUS_KEY_3,
  ].filter((k): k is string => !!k);
}

let keyIndex = 0;

function getNextKey(): string {
  const keys = getHeliusKeys();
  if (keys.length === 0) throw new Error('No Helius API keys configured');
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return key;
}

// JSON-RPC proxy: POST /api/proxy/helius
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const apiKey = getNextKey();
    const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

    const response = await fetch(heliusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('[Helius Proxy] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to proxy Helius request' });
    }
  }
});

// REST API proxy: GET /api/proxy/helius/rest/*
router.get('/rest/*', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const apiKey = getNextKey();
    const apiPath = req.params[0];
    const query = new URLSearchParams(req.query as Record<string, string>).toString();
    const heliusUrl = `https://api.helius.xyz/v0/${apiPath}?api-key=${apiKey}${query ? '&' + query : ''}`;

    const response = await fetch(heliusUrl);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('[Helius Proxy REST] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to proxy Helius REST request' });
    }
  }
});

export default router;
