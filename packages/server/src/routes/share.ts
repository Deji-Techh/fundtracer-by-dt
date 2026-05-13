import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import admin from 'firebase-admin';
import { getFirestore } from '../firebase.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/share — store analysis result, return share ID (auth required)
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address, chain, result } = req.body;

    if (!address || !chain || !result) {
      return res.status(400).json({ error: 'Missing required fields: address, chain, result' });
    }

    const id = crypto.randomBytes(4).toString('hex'); // 8-char hex ID
    const now = admin.firestore.Timestamp.now();

    const db = getFirestore();
    await db.collection('shared_analyses').doc(id).set({
      id,
      address,
      chain,
      result,
      userId: req.user?.uid || 'anonymous',
      createdAt: now,
      expiresAt: new admin.firestore.Timestamp(now.seconds + 30 * 24 * 60 * 60, 0), // 30 days
      viewCount: 0,
    });

    console.log(`[Share] Created shared analysis ${id} for ${address} on ${chain}`);

    res.json({ success: true, id, url: `https://www.fundtracer.xyz/share/${id}` });
  } catch (error: any) {
    console.error('[Share] Error creating share:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// GET /api/share/:id — return stored analysis result (public, no auth)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id.length !== 8) {
      return res.status(400).json({ error: 'Invalid share ID' });
    }

    const db = getFirestore();
    const doc = await db.collection('shared_analyses').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Shared analysis not found or expired' });
    }

    const data = doc.data();

    // Check if expired
    if (data?.expiresAt && data.expiresAt.toMillis() < Date.now()) {
      await doc.ref.delete();
      return res.status(404).json({ error: 'Shared analysis has expired' });
    }

    // Increment view count (fire-and-forget)
    doc.ref.update({ viewCount: admin.firestore.FieldValue.increment(1) }).catch(() => {});

    res.json({
      success: true,
      result: {
        id: data?.id,
        address: data?.address,
        chain: data?.chain,
        analysis: data?.result,
        createdAt: data?.createdAt?.toMillis(),
      },
    });
  } catch (error: any) {
    console.error('[Share] Error fetching share:', error);
    res.status(500).json({ error: 'Failed to fetch shared analysis' });
  }
});

export { router as shareRoutes };
