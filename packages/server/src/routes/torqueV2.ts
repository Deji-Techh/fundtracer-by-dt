// ============================================================
// FundTracer by DT - Torque Routes v2
// Clean API: leaderboard + my stats only
// ============================================================

import { Router, Response, Request } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { torqueServiceV2 } from '../services/TorqueServiceV2.js';
import { sendEmail, buildClaimConfirmationEmail } from '../services/EmailService.js';
import { getFirestore } from '../firebase.js';

const router = Router();

// Link code helper
function generateLinkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'FT-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getAdminAuth() {
  const { getAuth } = require('../firebase.js');
  return getAuth();
}

// CLI Link: Generate code (requires auth from web)
router.post('/cli/link/generate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = require('../firebase.js').getFirestore();
    const LINK_CODE_EXPIRY = 5 * 60 * 1000;
    
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const code = generateLinkCode();
    await db.collection('torque_cli_links').doc(code).set({
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + LINK_CODE_EXPIRY,
      used: false
    });
    
    res.json({ success: true, code, expiresIn: 300 });
  } catch (error: any) {
    console.error('[TorqueV2] CLI Link Generate error:', error);
    res.status(500).json({ error: 'Failed to generate link code' });
  }
});

// CLI Link: Verify code (no auth - used by CLI user)
router.post('/cli/link/verify', async (req: Request, res: Response) => {
  try {
    const { linkCode } = req.body;
    const db = require('../firebase.js').getFirestore();
    
    if (!linkCode) {
      return res.status(400).json({ error: 'Link code required' });
    }
    
    const linkDoc = await db.collection('torque_cli_links').doc(linkCode).get();
    
    if (!linkDoc.exists) {
      return res.status(404).json({ error: 'Invalid code' });
    }
    
    const data = linkDoc.data();
    if (!data) {
      return res.status(404).json({ error: 'Invalid code' });
    }
    
    if (data.used) {
      return res.status(400).json({ error: 'Code already used' });
    }
    
    if (Date.now() > data.expiresAt) {
      return res.status(400).json({ error: 'Code expired' });
    }
    
    // Mark as used
    await db.collection('torque_cli_links').doc(linkCode).update({
      used: true,
      linkedAt: Date.now(),
      cliUserId: data.userId
    });
    
    // Get user display name
    const userDoc = await db.collection('users').doc(data.userId).get();
    const displayName = userDoc.data()?.displayName || userDoc.data()?.name || 'User';
    
    res.json({
      success: true,
      userId: data.userId,
      displayName
    });
  } catch (error: any) {
    console.error('[TorqueV2] CLI Link Verify error:', error);
    res.status(500).json({ error: 'Failed to verify link code' });
  }
});

// CLI Scan: Track scan without full authentication (uses link code)
router.post('/cli/scan', async (req: Request, res: Response) => {
  try {
    const { linkCode, walletAddress } = req.body;
    
    if (!linkCode) {
      return res.status(400).json({ error: 'Link code required' });
    }
    
    const db = require('../firebase.js').getFirestore();
    
    // Verify link code
    const linkDoc = await db.collection('torque_cli_links').doc(linkCode).get();
    
    if (!linkDoc.exists) {
      return res.status(401).json({ error: 'Invalid link code' });
    }
    
    const linkData = linkDoc.data();
    if (!linkData || linkData.used === false && !linkData.cliUserId) {
      // Not yet linked - check if it's a fresh code from this session
      // Allow the scan anyway, link on first use
    }
    
    // Get user ID (either from verified link or create guest)
    let userId = linkData?.userId || linkData?.cliUserId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Please link CLI first: fundtracer link' });
    }
    
    // Get display name
    const userDoc = await db.collection('users').doc(userId).get();
    const displayName = userDoc.data()?.displayName || userDoc.data()?.name || '';
    
    // Add 10 points
    await torqueServiceV2.incrementScan(userId, displayName);
    
    // Also add to activity feed
    await torqueServiceV2.addActivity(userId, displayName, walletAddress || 'unknown', 'cli').catch(() => {});
    
    res.json({
      success: true,
      message: 'Scan recorded'
    });
  } catch (error: any) {
    console.error('[TorqueV2] CLI Scan error:', error);
    res.status(500).json({ error: 'Failed to record scan' });
  }
});

// Get leaderboard (public)
router.get('/leaderboard', async (req: Request, res: Response) => {
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
// Try both inline auth AND path-level check
router.get('/mystats', async (req: AuthenticatedRequest, res: Response) => {
  // If no auth, check if we need to auth manually
  if (!req.user) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    
    // Manual JWT verification
    const { authMiddleware } = require('../middleware/auth.js');
    await new Promise<void>((resolve, reject) => {
      authMiddleware(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('[TORQUE-V2] After manual auth, req.user:', req.user);
  }
  
  const userId = req.user?.uid;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
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
router.post('/scan', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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
router.get('/groups', async (req: Request, res: Response) => {
  try {
    const { isRedisConnected, cacheGet, cacheSet } = require('../utils/redis.js');
    const cacheKey = 'torque:v2:groups';
    
    // Check Redis cache first
    if (isRedisConnected()) {
      const cached = await cacheGet<any>(cacheKey);
      if (cached) return res.json(cached);
    }
    
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
    
    const result = {
      success: true,
      groups,
      timestamp: Date.now()
    };
    
    // Cache for 5 minutes
    if (isRedisConnected()) {
      await cacheSet(cacheKey, result, 300);
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('[TorqueV2] Groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get activity feed (public)
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const activities = await torqueServiceV2.getActivity(Math.min(limit, 20));
    
    res.json({
      success: true,
      activities,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[TorqueV2] Activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Admin: Reset all data
router.post('/admin/reset', async (req: Request, res: Response) => {
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

// Get claim status (requires auth)
router.get('/claim/status', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const status = await torqueServiceV2.getClaimStatus(userId);
    
    res.json({
      success: true,
      ...status
    });
  } catch (error: any) {
    console.error('[TorqueV2] Claim status error:', error);
    res.status(500).json({ error: 'Failed to get claim status' });
  }
});

// Process claim (requires auth)
router.post('/claim', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const result = await torqueServiceV2.processClaim(userId);
    
    // Send confirmation email on successful claim
    if (result.success && userEmail) {
      try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const displayName = userData?.displayName || '';
        
        const { subject, html } = buildClaimConfirmationEmail(
          displayName,
          result.equityPercent,
          result.pointsClaimed
        );
        
        await sendEmail({
          to: userEmail,
          subject,
          html
        });
        
        console.log(`[TorqueV2] Claim confirmation email sent to ${userEmail}`);
      } catch (emailError) {
        console.error('[TorqueV2] Failed to send claim confirmation email:', emailError);
      }
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('[TorqueV2] Claim error:', error);
    res.status(500).json({ error: 'Failed to process claim' });
  }
});

// Get claim history (requires auth)
router.get('/claim/history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const result = await torqueServiceV2.getClaimHistory(userId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('[TorqueV2] Claim history error:', error);
    // Return empty history instead of 500 to avoid breaking UI
    res.json({
      success: true,
      history: [],
      totalClaimed: 0,
      totalEquityClaimed: 0
    });
  }
});

// Get pool stats (public)
router.get('/pool-stats', async (req: Request, res: Response) => {
  try {
    const stats = await torqueServiceV2.getPoolStats();
    
    res.json({
      success: true,
      ...stats
    });
  } catch (error: any) {
    console.error('[TorqueV2] Pool stats error:', error);
    res.status(500).json({ error: 'Failed to get pool stats' });
  }
});

// Legacy /stats endpoint redirect
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await torqueServiceV2.getPoolStats();
    
    res.json({
      success: true,
      totalPoints: stats.totalPoints,
      totalUsers: stats.totalUsers,
      poolSize: stats.poolSize,
      distributed: stats.distributed
    });
  } catch (error: any) {
    console.error('[TorqueV2] Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export { router as torqueRoutesV2 };