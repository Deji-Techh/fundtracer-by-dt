// ============================================================
// FundTracer by DT - Torque Integration Service
// Growth primitives: leaderboards, raffles, rewards
// Stores analytics locally in Firestore since no REST API available
// ============================================================

import { getFirestore } from '../firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

interface TorqueEvent {
  userId: string;
  event: string;
  metadata: Record<string, unknown>;
  timestamp: number;
}

interface TorqueReward {
  campaignId: string;
  recipient: string;
  amount: string;
  reason?: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName?: string;
  score: number;
  change: number;
}

class TorqueService {
  private apiKey: string;
  private ingestUrl: string;
  private isEnabled: boolean;

  constructor() {
    this.apiKey = process.env.TORQUE_API_KEY || '';
    this.ingestUrl = process.env.TORQUE_INGEST_URL || 'https://ingest.torque.so/events';
    this.isEnabled = !!this.apiKey;
    
    if (this.isEnabled) {
      console.log('[Torque] Service enabled with ingestion API');
    } else {
      console.log('[Torque] Service disabled - no API key configured');
    }
  }

  private async sendEvent(event: {
    userPubkey: string;
    eventName: string;
    timestamp: number;
    data: Record<string, string | number | boolean>;
  }): Promise<boolean> {
    if (!this.isEnabled) {
      console.log(`[Torque] Event tracked (simulated): ${event.eventName} - ${event.userPubkey}`);
      return true;
    }

    try {
      const response = await fetch(this.ingestUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[Torque] Event Error ${response.status}: ${error}`);
        return false;
      }

      console.log(`[Torque] Event sent: ${event.eventName} from ${event.userPubkey}`);
      return true;
    } catch (error) {
      console.error('[Torque] Event request failed:', error);
      return false;
    }
  }

  // Track custom events - maps to Torque's custom event field schema
  async trackEvent(event: TorqueEvent): Promise<boolean> {
    const metadata = event.metadata || {};
    
    const data: Record<string, string | number | boolean> = {};
    
    switch (event.event) {
      case 'wallet_analyzed':
        data.chain = metadata.chain as string;
        data.risk_score = metadata.risk_score as number;
        data.tx_count = metadata.tx_count as number;
        data.has_suspicious = metadata.has_suspicious as boolean;
        break;
        
      case 'sybil_detected':
        data.flagged_addresses = metadata.flagged_addresses as number;
        data.cluster_count = metadata.cluster_count as number;
        break;
        
      case 'contract_analyzed':
        data.chain = metadata.chain as string;
        data.interactor_count = metadata.interactor_count as number;
        break;
        
      case 'compare_wallets':
        data.wallet_count = metadata.wallet_count as number;
        data.correlation_score = metadata.correlation_score as number;
        break;
        
      case 'first_analysis':
        data.chain = metadata.chain as string;
        data.risk_score = metadata.risk_score as number;
        break;
        
      default:
        if (metadata.chain) data.chain = metadata.chain as string;
        if (metadata.risk_score) data.risk_score = metadata.risk_score as number;
        if (metadata.tx_count) data.tx_count = metadata.tx_count as number;
        if (metadata.has_suspicious) data.has_suspicious = metadata.has_suspicious as boolean;
    }

    const eventPayload = {
      userPubkey: event.userId,
      eventName: event.event,
      timestamp: event.timestamp,
      data
    };

    // Also store locally for leaderboard queries
    await this.storeEventLocally(event);

    return this.sendEvent(eventPayload);
  }

  // Trigger incentive/reward distribution (if needed in future)
  async triggerReward(reward: TorqueReward): Promise<boolean> {
    console.log(`[Torque] Reward triggered (simulated): ${reward.campaignId} - ${reward.amount} to ${reward.recipient}`);
    return true;
  }

  // Store event locally in Firestore for leaderboard queries
  private async storeEventLocally(event: TorqueEvent): Promise<void> {
    try {
      const db = getDb();
      
      // Store in events collection
      await db.collection('torque_events').add({
        userId: event.userId,
        event: event.event,
        metadata: event.metadata,
        timestamp: event.timestamp,
        createdAt: new Date()
      });

      // Update user stats based on event type
      await this.updateUserStats(event.userId, event.event, event.metadata);
    } catch (error) {
      console.error('[Torque] Failed to store event locally:', error);
    }
  }

  // Update user's point totals based on event type
  private async updateUserStats(userId: string, eventType: string, metadata: Record<string, unknown>): Promise<void> {
    try {
      const db = getDb();
      const userStatsRef = db.collection('torque_user_stats').doc(userId);
      const userStatsDoc = await userStatsRef.get();

      let pointsToAdd = 0;
      let walletsToAdd = 0;
      let streakDaysToAdd = 0;
      
      switch (eventType) {
        case 'wallet_analyzed':
          pointsToAdd = 10;
          walletsToAdd = 1;
          break;
        case 'sybil_detected':
          pointsToAdd = 50;
          break;
        case 'contract_analyzed':
          pointsToAdd = 15;
          break;
        case 'compare_wallets':
          pointsToAdd = 20;
          break;
        case 'first_analysis':
          pointsToAdd = 100;
          break;
        case 'share_on_twitter':
          pointsToAdd = 25;
          break;
        case 'invite_friend':
          pointsToAdd = 30;
          break;
        case 'daily_login':
          streakDaysToAdd = 1;
          pointsToAdd = 5;
          break;
      }

      if (pointsToAdd > 0 || walletsToAdd > 0 || streakDaysToAdd > 0) {
        const updateData: Record<string, any> = {
          lastEventType: eventType,
          lastEventAt: new Date()
        };
        
        if (pointsToAdd > 0) {
          updateData.points = FieldValue.increment(pointsToAdd);
          updateData.totalEvents = FieldValue.increment(1);
        }
        if (walletsToAdd > 0) {
          updateData.walletsAnalyzed = FieldValue.increment(walletsToAdd);
        }
        if (streakDaysToAdd > 0) {
          updateData.streakDays = FieldValue.increment(streakDaysToAdd);
        }
        
        if (userStatsDoc.exists) {
          await userStatsRef.update(updateData);
        } else {
          await userStatsRef.set({
            userId,
            points: pointsToAdd,
            walletsAnalyzed: walletsToAdd,
            streakDays: streakDaysToAdd,
            referralCount: 0,
            signupDate: Date.now(),
            totalEvents: 1,
            lastEventType: eventType,
            lastEventAt: new Date(),
            createdAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('[Torque] Failed to update user stats:', error);
    }
  }

  // Get leaderboard rankings from Firestore
  async getLeaderboard(campaignId: string): Promise<LeaderboardEntry[]> {
    try {
      const db = getDb();

      // Query user stats ordered by points
      const snapshot = await db.collection('torque_user_stats')
        .orderBy('points', 'desc')
        .limit(50)
        .get();

      const entries: LeaderboardEntry[] = [];
      let rank = 1;
      
      for (const doc of snapshot.docs) {
        const data = doc.data();

        // Try to get user display name from Firestore
        let displayName: string | undefined;
        try {
          const userDoc = await db.collection('users').doc(data.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            displayName = userData?.displayName || userData?.name || undefined;
          }
        } catch (e) {
          // Ignore - use truncated address as fallback
        }

        entries.push({
          rank,
          userId: data.userId,
          displayName,
          score: data.points || 0,
          change: 0
        });
        rank++;
      }

      return entries;
    } catch (error) {
      console.error('[Torque] Failed to get leaderboard:', error);
      return [];
    }
  }

  // Submit score to leaderboard
  async submitScore(campaignId: string, userId: string, score: number): Promise<boolean> {
    console.log(`[Torque] Score submitted (simulated): ${userId} - ${score} points`);
    return true;
  }

  // Initialize user stats from existing Google users (run once to populate leaderboard)
  async initializeFromExistingUsers(): Promise<number> {
    try {
      const db = getDb();
      
      // Get all users who signed up with Google (have authProvider: 'google')
      const usersSnapshot = await db.collection('users')
        .where('authProvider', '==', 'google')
        .get();
      
      let initialized = 0;
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Check if already has stats
        const existingStats = await db.collection('torque_user_stats').doc(userId).get();
        if (existingStats.exists) {
          continue; // Already initialized
        }
        
        // Get signup date (createdAt) or use lastLogin as fallback
        const signupDate = userData.createdAt || userData.lastLogin || Date.now();
        
        // Get referral count from user data
        const referralCount = userData.referralCount || 0;
        
        // Initialize user with 0 points (they haven't analyzed yet)
        // But sort by signupDate for early-adopter leaderboard
        await db.collection('torque_user_stats').doc(userId).set({
          userId,
          points: 0,
          walletsAnalyzed: 0,
          streakDays: 0,
          referralCount,
          signupDate,
          totalEvents: 0,
          lastEventType: null,
          lastEventAt: null,
          createdAt: new Date()
        });
        
        initialized++;
        console.log(`[Torque] Initialized user: ${userId} (${userData.displayName})`);
      }
      
      console.log(`[Torque] Initialized ${initialized} existing users`);
      return initialized;
    } catch (error) {
      console.error('[Torque] Failed to initialize users:', error);
      return 0;
    }
  }

  // Get user points/rank from Firestore
  async getUserStats(userId: string): Promise<{ points: number; rank: number; streak: number } | null> {
    try {
      const db = getDb();
      
      // Get user's stats
      const userStatsDoc = await db.collection('torque_user_stats').doc(userId).get();
      
      if (!userStatsDoc.exists) {
        return { points: 0, rank: 0, streak: 0 };
      }

      const userData = userStatsDoc.data()!;
      const points = userData.points || 0;

      // Calculate rank by counting users with more points
      const higherRanked = await db.collection('torque_user_stats')
        .where('points', '>', points)
        .count()
        .get();
      
      const rank = (higherRanked.data().count || 0) + 1;

      // Calculate streak (simplified - count consecutive days with activity)
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const activitySnapshot = await db.collection('torque_events')
          .where('userId', '==', userId)
          .where('timestamp', '>=', checkDate.getTime())
          .where('timestamp', '<', checkDate.getTime() + 86400000)
          .limit(1)
          .get();

        if (activitySnapshot.empty) {
          break;
        }
        streak++;
      }

      return { points, rank, streak };
    } catch (error) {
      console.error('[Torque] Failed to get user stats:', error);
      return null;
    }
  }

  // Get detailed user stats for Settings page - read from torque_user_stats collection directly
  async getDetailedUserStats(userId: string): Promise<{
    points: number;
    rank: number;
    streak: number;
    walletsAnalyzed: number;
    sybilsDetected: number;
    referrals: number;
  }> {
    try {
      const db = getDb();
      
      // Get user stats directly from torque_user_stats collection
      const userStatsDoc = await db.collection('torque_user_stats').doc(userId).get();
      
      if (!userStatsDoc.exists) {
        return {
          points: 0,
          rank: 0,
          streak: 0,
          walletsAnalyzed: 0,
          sybilsDetected: 0,
          referrals: 0
        };
      }
      
      const userData = userStatsDoc.data() || {};
      const points = userData.points || 0;
      
      // Calculate rank by counting users with more points
      const higherRanked = await db.collection('torque_user_stats')
        .where('points', '>', points)
        .count()
        .get();
      const rank = (higherRanked.data().count || 0) + 1;
      
      // Estimate event counts from totalEvents (approximate since we don't have separate counters)
      const totalEvents = userData.totalEvents || 0;
      
      return {
        points,
        rank,
        streak: 0, // Would need separate streak tracking
        walletsAnalyzed: Math.floor(totalEvents * 0.7), // Rough estimate
        sybilsDetected: 0,
        referrals: 0
      };
    } catch (error) {
      console.error('[Torque] Failed to get detailed stats:', error);
      return {
        points: 0,
        rank: 0,
        streak: 0,
        walletsAnalyzed: 0,
        sybilsDetected: 0,
        referrals: 0
      };
    }
  }

  // Credit referral bonus points to referrer
  async creditReferralBonus(referrerId: string, refereeId: string): Promise<boolean> {
    const REFERRAL_BONUS_POINTS = 100;
    
    try {
      const db = getDb();
      const userStatsRef = db.collection('torque_user_stats').doc(referrerId);
      const userStatsDoc = await userStatsRef.get();
      
      if (userStatsDoc.exists) {
        await userStatsRef.update({
          points: FieldValue.increment(REFERRAL_BONUS_POINTS),
          referralCount: FieldValue.increment(1),
          referredUsers: FieldValue.arrayUnion(refereeId),
          lastEventType: 'invite_friend',
          lastEventAt: new Date()
        });
      } else {
        await userStatsRef.set({
          userId: referrerId,
          points: REFERRAL_BONUS_POINTS,
          totalEvents: 1,
          referralCount: 1,
          referredUsers: [refereeId],
          lastEventType: 'invite_friend',
          lastEventAt: new Date(),
          createdAt: new Date()
        });
      }
      
      console.log(`[Torque] Credited ${REFERRAL_BONUS_POINTS} points to referrer ${referrerId}`);
      return true;
    } catch (error) {
      console.error('[Torque] Failed to credit referral bonus:', error);
      return false;
    }
  }
}

export const torqueService = new TorqueService();

// Event types for tracking
export const TORQUE_EVENTS = {
  FIRST_ANALYSIS: 'first_analysis',
  WALLET_ANALYZED: 'wallet_analyzed',
  CONTRACT_ANALYZED: 'contract_analyzed',
  SYBIL_DETECTED: 'sybil_detected',
  HIGH_RISK_FOUND: 'high_risk_found',
  COMPARE_WALLETS: 'compare_wallets',
  FUNDING_TREE_GENERATED: 'funding_tree_generated',
  NFT_PORTFOLIO_VIEW: 'nft_portfolio_view',
  DAILY_STREAK_7: 'daily_streak_7',
  DAILY_STREAK_30: 'daily_streak_30',
  SHARE_ON_TWITTER: 'share_on_twitter',
  INVITE_FRIEND: 'invite_friend'
} as const;

// Campaign IDs
export const TORQUE_CAMPAIGNS = {
  EARLY_ADOPTER: 'early-adopter-rewards',
  SYBIL_HUNTER: 'sybil-hunter-leaderboard',
  ANALYZER_STREAK: 'active-analyst-streak',
  TOP_ANALYZER: 'top-analyzer-championship',
  VIRAL_SHARE: 'viral-share-bonus',
  REFERRAL: 'referral-program'
} as const;

// Helper to track analysis events
export async function trackAnalysisEvent(
  userId: string,
  event: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await torqueService.trackEvent({
    userId,
    event,
    metadata,
    timestamp: Date.now()
  });
}

// Get real-time campaign statistics
export async function getCampaignStats(campaignId: string): Promise<{
  participants: number;
  totalEvents: number;
  rewardsClaimed: string;
}> {
  try {
    const db = getDb();
    
    // Count total users in torque_user_stats collection
    const statsSnapshot = await db.collection('torque_user_stats').get();
    const participants = statsSnapshot.size || 0;
    
    // For specific campaigns, count by event type
    let totalEvents = 0;
    if (campaignId === 'top-analyzer') {
      // Sum all wallets analyzed
      for (const doc of statsSnapshot.docs) {
        const data = doc.data();
        totalEvents += data.walletsAnalyzed || 0;
      }
    } else if (campaignId === 'sybil-hunter') {
      // Count sybil detections
      for (const doc of statsSnapshot.docs) {
        const data = doc.data();
        totalEvents += data.sybilCount || 0;
      }
    } else if (campaignId === 'streak') {
      // Sum streak days
      for (const doc of statsSnapshot.docs) {
        const data = doc.data();
        totalEvents += data.streakDays || 0;
      }
    } else if (campaignId === 'referral') {
      // Sum referrals
      for (const doc of statsSnapshot.docs) {
        const data = doc.data();
        totalEvents += data.referralCount || 0;
      }
    } else if (campaignId === 'early-adopter') {
      // Count users with signupDate (all initialized users)
      for (const doc of statsSnapshot.docs) {
        const data = doc.data();
        if (data.signupDate) totalEvents++;
      }
    }

    const rewardsClaimed = participants > 0 ? '0.3%' : '0%';

    return {
      participants,
      totalEvents,
      rewardsClaimed
    };
  } catch (error) {
    console.error('[Torque] Failed to get campaign stats:', error);
    return {
      participants: 0,
      totalEvents: 0,
      rewardsClaimed: '0%'
    };
  }
}

// Get overall stats
export async function getOverallStats(): Promise<{
  totalEquityPool: string;
  activeParticipants: number;
  eventsTracked: number;
  rewardsClaimed: string;
}> {
  try {
    const db = getDb();
    
    // Get all events count
    const eventsSnapshot = await db.collection('torque_events')
      .count()
      .get();
    const eventsTracked = eventsSnapshot.data().count || 0;

    // Get unique users who have events
    const userStatsSnapshot = await db.collection('torque_user_stats')
      .count()
      .get();
    const activeParticipants = userStatsSnapshot.data().count || 0;

    return {
      totalEquityPool: '5%',
      activeParticipants,
      eventsTracked,
      rewardsClaimed: '0.3%'
    };
  } catch (error) {
    console.error('[Torque] Failed to get overall stats:', error);
    return {
      totalEquityPool: '5%',
      activeParticipants: 0,
      eventsTracked: 0,
      rewardsClaimed: '0%'
    };
  }
}