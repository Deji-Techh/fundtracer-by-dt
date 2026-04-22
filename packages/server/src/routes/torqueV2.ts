// ============================================================
// FundTracer by DT - Torque Routes v2
// Clean API: leaderboard + my stats only
// ============================================================

import { Router, Response, Request } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { torqueServiceV2 } from '../services/TorqueServiceV2.js';

const router = Router();

// Get leaderboard (public)
router.get('/v2/leaderboard', async (req: Request, res: Response) => {
  try {
    const entries = await torqueServiceV2.getLeaderboard();
    const total = await torqueServiceV2.getTotalScanned();
    
    // Map backend fields to frontend fields
    const mappedEntries = entries.map(entry => ({
      rank: entry.rank,
      userId: entry.userId,
      displayName: entry.displayName,
      score: entry.totalPoints || 0,
      walletsScanned: entry.walletsScanned || 0,
      change: 0,
      isCurrentUser: false
    }));
    
    res.json({
      success: true,
      entries: mappedEntries,
      totalScanned: total,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[TorqueV2] Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get my stats (requires auth)
router.get('/v2/mystats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const stats = await torqueServiceV2.getMyStats(userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('[TorqueV2] Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Increment scan (called after wallet analysis)
router.post('/v2/scan', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get display name from user doc
    const db = require('../firebase.js').getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const displayName = userDoc.data()?.displayName || userDoc.data()?.name || '';
    
    await torqueServiceV2.incrementScan(userId, displayName);
    
    res.json({
      success: true,
      message: 'Scan recorded'
    });
  } catch (error: any) {
    console.error('[TorqueV2] Scan error:', error);
    res.status(500).json({ error: 'Failed to record scan' });
  }
});

// Get groups leaderboard (public)
router.get('/v2/groups', async (req: Request, res: Response) => {
  try {
    const db = require('../firebase.js').getFirestore();
    const snapshot = await db.collection('torque_groups')
      .orderBy('totalPoints', 'desc')
      .limit(20)
      .get();
    
    const groups = snapshot.docs.map(doc => ({
      groupId: doc.id,
      groupName: doc.data().groupName,
      totalScans: doc.data().totalScans || 0,
      totalPoints: doc.data().totalPoints || 0,
      memberCount: doc.data().memberCount || 0,
      members: doc.data().members || []
    }));
    
    res.json({
      success: true,
      groups,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[TorqueV2] Groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Admin: Reset all data
router.post('/v2/admin/reset', async (req: Request, res: Response) => {
  try {
    const secretKey = req.query.secret as string;
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'fundtracer-admin-2024';
    
    if (secretKey !== ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const result = await torqueServiceV2.resetAll();
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('[TorqueV2] Reset error:', error);
    res.status(500).json({ error: 'Failed to reset' });
  }
});

export { router as torqueRoutesV2 };