// ============================================================
// FundTracer by DT - Torque Routes
// Leaderboard and rewards endpoints
// ============================================================

import { Router, Response, Request } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { torqueService, TORQUE_CAMPAIGNS, getCampaignStats, getOverallStats } from '../services/TorqueService.js';

const router = Router();

// Get leaderboard for a campaign (public - no auth required)
router.get('/leaderboard/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const entries = await torqueService.getLeaderboard(campaignId);
    
    // Mark current user's entry if authenticated
    const userId = (req as any).user?.uid;
    const entriesWithUserFlag = entries.map(entry => ({
      ...entry,
      isCurrentUser: userId ? entry.userId === userId : false
    }));
    
    res.json({
      success: true,
      campaignId,
      entries: entriesWithUserFlag,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[Torque] Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get detailed user stats for Settings page - userId passed as query param
router.get('/stats/detailed', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.json({
        success: true,
        stats: { points: 0, rank: 0, streak: 0, walletsAnalyzed: 0, sybilsDetected: 0, referrals: 0 }
      });
    }
    
    const stats = await torqueService.getDetailedUserStats(userId);
    
    res.json({ success: true, stats });
  } catch (error: any) {
    console.error('[Torque] Detailed stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get current user's stats (public - no auth required)
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Get userId from auth header if available (optional)
    const userId = (req as any).user?.uid || null;
    
    const stats = userId ? await torqueService.getUserStats(userId) : null;
    
    res.json({
      success: true,
      stats: stats || {
        points: 0,
        rank: 0,
        streak: 0
      }
    });
  } catch (error: any) {
    console.error('[Torque] Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all available campaigns
router.get('/campaigns', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    campaigns: [
      {
        id: TORQUE_CAMPAIGNS.EARLY_ADOPTER,
        name: 'Early Adopter Rewards',
        description: 'First 50 users get equity rewards',
        type: 'raffle',
        endsAt: null // No end date
      },
      {
        id: TORQUE_CAMPAIGNS.SYBIL_HUNTER,
        name: 'Sybil Hunter Leaderboard',
        description: 'Top sybil detectors win equity',
        type: 'leaderboard',
        endsAt: null
      },
      {
        id: TORQUE_CAMPAIGNS.ANALYZER_STREAK,
        name: 'Active Analyst Streak',
        description: 'Maintain a 7-day streak for weekly rewards',
        type: 'raffle',
        endsAt: null
      },
      {
        id: TORQUE_CAMPAIGNS.TOP_ANALYZER,
        name: 'Top Analyzer Championship',
        description: 'Most wallets analyzed wins big',
        type: 'leaderboard',
        endsAt: null
      },
      {
        id: TORQUE_CAMPAIGNS.VIRAL_SHARE,
        name: 'Viral Share Bonus',
        description: 'Share results on X for equity rewards',
        type: 'instant',
        endsAt: null
      }
    ]
  });
});

// Submit share on X event
router.post('/share', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { postUrl } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    // Track the share event
    await torqueService.trackEvent({
      userId,
      event: 'share_on_twitter',
      metadata: {
        postUrl,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
    
    // Trigger reward if eligible
    await torqueService.triggerReward({
      campaignId: TORQUE_CAMPAIGNS.VIRAL_SHARE,
      recipient: userId,
      amount: '0.05%',
      reason: 'Shared analysis on X'
    });
    
    res.json({
      success: true,
      message: 'Share recorded, reward pending (6-month cliff)'
    });
  } catch (error: any) {
    console.error('[Torque] Share error:', error);
    res.status(500).json({ error: 'Failed to record share' });
  }
});

// Submit referral
router.post('/referral', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const referrerId = req.user?.uid;
    const { refereeAddress } = req.body;
    
    if (!referrerId || !refereeAddress) {
      return res.status(400).json({ error: 'Invalid referral data' });
    }
    
    // Track referral event
    await torqueService.trackEvent({
      userId: referrerId,
      event: 'invite_friend',
      metadata: {
        referee: refereeAddress,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
    
    res.json({
      success: true,
      message: 'Referral recorded'
    });
  } catch (error: any) {
    console.error('[Torque] Referral error:', error);
    res.status(500).json({ error: 'Failed to record referral' });
  }
});

// Get campaign stats (public - no auth required)
router.get('/campaign-stats/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const stats = await getCampaignStats(campaignId);
    
    res.json({
      success: true,
      campaignId,
      ...stats
    });
  } catch (error: any) {
    console.error('[Torque] Campaign stats error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign stats' });
  }
});

// Get overall stats (public - no auth required)
router.get('/overall-stats', async (req: Request, res: Response) => {
  try {
    const stats = await getOverallStats();
    
    res.json({
      success: true,
      ...stats
    });
  } catch (error: any) {
    console.error('[Torque] Overall stats error:', error);
    res.status(500).json({ error: 'Failed to fetch overall stats' });
  }
});

export { router as torqueRoutes };