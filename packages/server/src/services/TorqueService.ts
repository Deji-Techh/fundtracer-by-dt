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
      switch (eventType) {
        case 'wallet_analyzed':
          pointsToAdd = 10;
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
      }

      if (pointsToAdd > 0) {
        if (userStatsDoc.exists) {
          await userStatsRef.update({
            points: FieldValue.increment(pointsToAdd),
            totalEvents: FieldValue.increment(1),
            lastEventType: eventType,
            lastEventAt: new Date()
          });
        } else {
          await userStatsRef.set({
            userId,
            points: pointsToAdd,
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
      
      // Map campaignId to event type
      let eventTypeFilter: string | null = null;
      switch (campaignId) {
        case 'sybil-hunter-leaderboard':
        case 'sybil-hunter':
          eventTypeFilter = 'sybil_detected';
          break;
        case 'top-analyzer-championship':
        case 'top-analyzer':
          eventTypeFilter = 'wallet_analyzed';
          break;
        case 'active-analyst-streak':
        case 'streak':
          eventTypeFilter = null; // All events count
          break;
        default:
          eventTypeFilter = null;
      }

      // Query user stats ordered by points
      const snapshot = await db.collection('torque_user_stats')
        .orderBy('points', 'desc')
        .limit(50)
        .get();

      const entries: LeaderboardEntry[] = [];
      let rank = 1;
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Filter by event type if needed
        if (eventTypeFilter && data.lastEventType !== eventTypeFilter) {
          continue;
        }

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

  // Get detailed user stats for Settings page
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
      
      // Get base stats
      const stats = await this.getUserStats(userId);
      
      // Get event counts by type
      const walletEventsSnap = await db.collection('torque_events')
        .where('userId', '==', userId)
        .where('event', '==', 'wallet_analyzed')
        .count()
        .get();
      const walletsAnalyzed = walletEventsSnap.data().count || 0;

      const sybilEventsSnap = await db.collection('torque_events')
        .where('userId', '==', userId)
        .where('event', '==', 'sybil_detected')
        .count()
        .get();
      const sybilsDetected = sybilEventsSnap.data().count || 0;

      const referralEventsSnap = await db.collection('torque_events')
        .where('userId', '==', userId)
        .where('event', '==', 'invite_friend')
        .count()
        .get();
      const referrals = referralEventsSnap.data().count || 0;

      return {
        points: stats?.points || 0,
        rank: stats?.rank || 0,
        streak: stats?.streak || 0,
        walletsAnalyzed,
        sybilsDetected,
        referrals
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
    
    let eventTypeFilter: string | null = null;
    switch (campaignId) {
      case 'top-analyzer':
        eventTypeFilter = 'wallet_analyzed';
        break;
      case 'sybil-hunter':
        eventTypeFilter = 'sybil_detected';
        break;
      default:
        eventTypeFilter = null;
    }

    // Count unique participants who have events
    const eventsSnapshot = await db.collection('torque_events')
      .orderBy('timestamp', 'desc')
      .limit(1000)
      .get();

    const uniqueUsers = new Set<string>();
    let totalEvents = 0;
    
    for (const doc of eventsSnapshot.docs) {
      const data = doc.data();
      if (eventTypeFilter && data.event !== eventTypeFilter) continue;
      
      uniqueUsers.add(data.userId);
      totalEvents++;
    }

    // Calculate rewards claimed (simplified - just calc 0.3% as placeholder)
    const participants = uniqueUsers.size || 0;
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