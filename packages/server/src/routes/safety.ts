import { Router, Request, Response } from 'express';
import { quickNodeService } from '../services/QuickNodeService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/safety/check
router.post('/check', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { contractAddress } = req.body;

    if (!contractAddress || !contractAddress.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid contract address' });
    }

    // Get safety check from QuickNode
    const safety = await quickNodeService.checkTokenSafety(contractAddress);

    res.json({
      contractAddress,
      ...safety,
    });
  } catch (error: any) {
    console.error('[Safety Route] Error:', error);
    res.status(500).json({ 
      error: 'Failed to check token safety',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export { router as safetyRoutes };
