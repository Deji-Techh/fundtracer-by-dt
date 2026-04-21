// ============================================================
// FundTracer by DT - Torque Integration Service
// Growth primitives: leaderboards, raffles, rewards
// OPTIMIZED: Uses Redis caching, fixes N+1 queries, uses getAll() batch
// ============================================================

import { getFirestore } from '../firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { isRedisConnected, cacheGet, cacheSet, cacheDel } from '../utils/redis.js';

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

  // Update user's point totals based on event type (public for direct calls)
  async updateUserStats(userId: string, eventType: string, metadata: Record<string, unknown>): Promise<void> {
    try {
      const db = getDb();
      const userStatsRef = db.collection('torque_user_stats').doc(userId);
      const userStatsDoc = await userStatsRef.get();

      let pointsToAdd = 0;
      let walletsToAdd = 0;
      let streakDaysToAdd = 0;
      let sybilsToAdd = 0;
      
      switch (eventType) {
        case 'wallet_analyzed':
          pointsToAdd = 10;
          walletsToAdd = 1;
          break;
        case 'sybil_detected':
          pointsToAdd = 50;
          sybilsToAdd = 1;
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

      if (pointsToAdd > 0 || walletsToAdd > 0 || streakDaysToAdd > 0 || sybilsToAdd > 0) {
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
        if (sybilsToAdd > 0) {
          updateData.sybilCount = FieldValue.increment(sybilsToAdd);
        }
        
        if (userStatsDoc.exists) {
          await userStatsRef.update(updateData);
        } else {
          await userStatsRef.set({
            userId,
            points: pointsToAdd,
            walletsAnalyzed: walletsToAdd,
            streakDays: streakDaysToAdd,
            sybilCount: sybilsToAdd,
            referralCount: 0,
            signupDate: Date.now(),
            totalEvents: 1,
            lastEventType: eventType,
            lastEventAt: new Date(),
            createdAt: new Date()
          });
        }
        
        // Invalidate Redis caches on stats update
        if (isRedisConnected()) {
          await cacheDel(`torque:user:${userId}:stats`).catch(() => {});
          // Invalidate all leaderboard caches (user might appear in any campaign)
          await cacheDel('torque:leaderboard:top-analyzer').catch(() => {});
          await cacheDel('torque:leaderboard:sybil-hunter').catch(() => {});
          await cacheDel('torque:leaderboard:streak').catch(() => {});
          await cacheDel('torque:leaderboard:referral').catch(() => {});
        }
      }
    } catch (error) {
      console.error('[Torque] Failed to update user stats:', error);
    }
  }

  // Get leaderboard rankings from Firestore - campaign-specific sorting
  // OPTIMIZED: Uses getAll() for batch fetch, long TTL cache
  async getLeaderboard(campaignId: string): Promise<LeaderboardEntry[]> {
    try {
      const db = getDb();

      let sortField = 'points';
      let cacheTtl = 1800; // 30 min cache
      switch (campaignId) {
        case 'top-analyzer':
        case 'top-analyzer-championship':
          sortField = 'walletsAnalyzed';
          break;
        case 'sybil-hunter':
        case 'sybil-hunter-leaderboard':
          sortField = 'sybilCount';
          break;
        case 'streak':
        case 'active-analyst-streak':
          sortField = 'streakDays';
          break;
        case 'referral':
          sortField = 'referralCount';
          break;
        case 'early-adopter':
          sortField = 'signupDate';
          break;
        default:
          sortField = 'points';
      }

      // CACHE: Leaderboard sorted results (30 min TTL)
      const cacheKey = `torque:leaderboard:${campaignId}`;
      if (isRedisConnected()) {
        const cached = await cacheGet<LeaderboardEntry[]>(cacheKey);
        if (cached && cached.length > 0) {
          console.log(`[Torque] LB cache hit: ${campaignId} (${cached.length} entries)`);
          return cached;
        }
      }

      let query = db.collection('torque_user_stats').limit(100);
      switch (campaignId) {
        case 'top-analyzer':
        case 'top-analyzer-championship':
          query = db.collection('torque_user_stats').where('walletsAnalyzed', '>', 0);
          break;
        case 'sybil-hunter':
        case 'sybil-hunter-leaderboard':
          query = db.collection('torque_user_stats').where('sybilCount', '>', 0);
          break;
        case 'streak':
        case 'active-analyst-streak':
          query = db.collection('torque_user_stats').where('streakDays', '>', 0);
          break;
        case 'referral':
          query = db.collection('torque_user_stats').where('referralCount', '>', 0);
          break;
        case 'early-adopter':
          query = db.collection('torque_user_stats').where('totalEvents', '>', 0);
          break;
        default:
          query = db.collection('torque_user_stats').where('points', '>', 0);
      }

      const snapshot = await query.orderBy(sortField, 'desc').limit(50).get();
      const userIds = snapshot.docs.map(doc => doc.id);
      
      // OPTIMIZATION: Use getAll() for batch fetch (2 reads instead of 51)
      const userRefs = userIds.map(id => db.collection('users').doc(id));
      const userDocs = await db.getAll(...userRefs);
      
      const displayNameMap: Record<string, string> = {};
      userDocs.forEach(userDoc => {
        if (userDoc?.exists) {
          const userData = userDoc.data();
          displayNameMap[userDoc.id] = userData?.displayName || userData?.name || '';
        }
      });

      const entries: LeaderboardEntry[] = [];
      let rank = 1;
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        let displayName: string | undefined = displayNameMap[data.userId];
        if (!displayName && data.displayName) {
          displayName = data.displayName;
        }

        let score = data.points || 0;
        switch (campaignId) {
          case 'top-analyzer':
          case 'top-analyzer-championship':
            score = data.walletsAnalyzed || 0;
            break;
          case 'sybil-hunter':
          case 'sybil-hunter-leaderboard':
            score = data.sybilCount || 0;
            break;
          case 'streak':
          case 'active-analyst-streak':
            score = data.streakDays || 0;
            break;
          case 'referral':
            score = data.referralCount || 0;
            break;
          case 'early-adopter':
            score = data.signupDate || 0;
            break;
        }

        entries.push({ rank, userId: data.userId, displayName, score, change: 0 });
        rank++;
      }

      // Cache the leaderboard for 30 min
      if (isRedisConnected() && entries.length > 0) {
        await cacheSet(cacheKey, entries, cacheTtl);
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
    
    // Invalidate leaderboard cache on score submission
    if (isRedisConnected()) {
      const cacheKey = `torque:leaderboard:${campaignId}`;
      await cacheDel(cacheKey).catch(() => {});
      // Also invalidate overall stats cache
      await cacheDel('torque:overall:stats').catch(() => {});
    }
    return true;
  }

  // Initialize user stats from existing Google users (run once to populate leaderboard)
  // OPTIMIZED: Stores displayName to eliminate N+1 queries on leaderboard
  async initializeFromExistingUsers(): Promise<number> {
    try {
      const db = getDb();
      
      const usersSnapshot = await db.collection('users')
        .where('authProvider', '==', 'google')
        .get();
      
      let initialized = 0;
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        const existingStats = await db.collection('torque_user_stats').doc(userId).get();
        if (existingStats.exists) {
          // OPTIMIZATION: Add displayName to existing entries if missing
          if (!existingStats.data()?.displayName && userData.displayName) {
            await db.collection('torque_user_stats').doc(userId).update({
              displayName: userData.displayName || userData.name || null
            });
            console.log(`[Torque] Added displayName to existing user: ${userId}`);
          }
          continue;
        }
        
        const signupDate = userData.createdAt || userData.lastLogin || Date.now();
        const referralCount = userData.referralCount || 0;
        
        // OPTIMIZATION: Store displayName to avoid leaderboard N+1 queries
        await db.collection('torque_user_stats').doc(userId).set({
          userId,
          displayName: userData.displayName || userData.name || null, // IMPORTANT: Store for leaderboard
          points: 0,
          walletsAnalyzed: 0,
          streakDays: 0,
          sybilCount: 0,
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
      
      // REDIS CACHE: 30 min TTL
      const cacheKey = `torque:user:${userId}:stats`;
      if (isRedisConnected()) {
        const cached = await cacheGet<{ points: number; rank: number; streak: number }>(cacheKey);
        if (cached) {
          return cached;
        }
      }
      
      const userStatsDoc = await db.collection('torque_user_stats').doc(userId).get();
      
      if (!userStatsDoc.exists) {
        return { points: 0, rank: 0, streak: 0 };
      }

      const userData = userStatsDoc.data()!;
      const points = userData.points || 0;
      const streak = userData.streakDays || 0;

      // Derive rank from cached leaderboard (no .count() query)
      const lbKey = 'torque:leaderboard:all';
      let rank = 0;
      if (isRedisConnected()) {
        const cached = await cacheGet<LeaderboardEntry[]>(lbKey);
        if (cached && cached.length > 0) {
          const pos = cached.findIndex(e => e.userId === userId);
          if (pos >= 0) rank = pos + 1;
        }
      }
      if (rank === 0) {
        // Fallback: use a simple count (cached on its own 30 min TTL)
        const countCacheKey = 'torque:user_count';
        let userCount = 0;
        if (isRedisConnected()) {
          const cached = await cacheGet<number>(countCacheKey);
          if (cached) userCount = cached;
        }
        if (userCount === 0) {
          const countSnap = await db.collection('torque_user_stats').count().get();
          userCount = countSnap.data().count || 0;
          if (isRedisConnected()) {
            await cacheSet(countCacheKey, userCount, 1800).catch(() => {});
          }
        }
        const higherRanked = await db.collection('torque_user_stats')
          .where('points', '>', points)
          .count()
          .get();
        rank = (higherRanked.data().count || 0) + 1;
      }

      const stats = { points, rank, streak };
      
      if (isRedisConnected()) {
        await cacheSet(cacheKey, stats, 1800).catch(() => {});
      }
      
      return stats;
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

      // Derive rank from cached leaderboard
      let rank = 0;
      const lbKey = 'torque:leaderboard:all';
      if (isRedisConnected()) {
        const cached = await cacheGet<LeaderboardEntry[]>(lbKey);
        if (cached && cached.length > 0) {
          const pos = cached.findIndex(e => e.userId === userId);
          if (pos >= 0) rank = pos + 1;
        }
      }
      if (rank === 0) {
        const higherRanked = await db.collection('torque_user_stats')
          .where('points', '>', points)
          .count()
          .get();
        rank = (higherRanked.data().count || 0) + 1;
      }
      
      return {
        points,
        rank,
        streak: userData.streakDays || 0,
        walletsAnalyzed: userData.walletsAnalyzed || 0,
        sybilsDetected: userData.sybilCount || 0,
        referrals: userData.referralCount || 0
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
    
    // Cache for 30 minutes
    const cacheKey = `torque:campaign:${campaignId}`;
    if (isRedisConnected()) {
      const cached = await cacheGet<{ participants: number; totalEvents: number; rewardsClaimed: string }>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Use cached leaderboard data instead of full collection scan
    const allStatsCacheKey = 'torque:leaderboard:all';
    let statsData: Record<string, any>[] = [];
    
    if (isRedisConnected()) {
      const cachedDocs = await cacheGet<Record<string, any>[]>(allStatsCacheKey);
      if (cachedDocs && cachedDocs.length > 0) {
        statsData = cachedDocs;
      }
    }

    if (statsData.length === 0) {
      // Only fetch if cache is cold — use a single aggregate query per campaign
      const countSnap = await db.collection('torque_user_stats').count().get();
      const count = countSnap.data().count || 0;
      const result: { participants: number; totalEvents: number; rewardsClaimed: string } = {
        participants: count,
        totalEvents: 0,
        rewardsClaimed: count > 0 ? '0.3%' : '0%'
      };
      if (isRedisConnected()) {
        await cacheSet(cacheKey, result, 1800).catch(() => {});
      }
      return result;
    }

    const participants = statsData.length || 0;
    
    let totalEvents = 0;
    if (campaignId === 'top-analyzer') {
      for (const data of statsData) {
        totalEvents += data.walletsAnalyzed || 0;
      }
    } else if (campaignId === 'sybil-hunter') {
      for (const data of statsData) {
        totalEvents += data.sybilCount || 0;
      }
    } else if (campaignId === 'streak') {
      for (const data of statsData) {
        totalEvents += data.streakDays || 0;
      }
    } else if (campaignId === 'referral') {
      for (const data of statsData) {
        totalEvents += data.referralCount || 0;
      }
    } else if (campaignId === 'early-adopter') {
      for (const data of statsData) {
        if (data.signupDate) totalEvents++;
      }
    }

    const rewardsClaimed = participants > 0 ? '0.3%' : '0%';
    const result = { participants, totalEvents, rewardsClaimed };
    
    if (isRedisConnected()) {
      await cacheSet(cacheKey, result, 1800);
    }

    return result;
  } catch (error) {
    console.error('[Torque] Failed to get campaign stats:', error);
    return { participants: 0, totalEvents: 0, rewardsClaimed: '0%' };
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
    // OPTIMIZATION: Cache overall stats for 5 minutes
    const cacheKey = 'torque:overall:stats';
    if (isRedisConnected()) {
      const cached = await cacheGet<{ totalEquityPool: string; activeParticipants: number; eventsTracked: number; rewardsClaimed: string }>(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const db = getDb();
    
    const eventsSnapshot = await db.collection('torque_events')
      .count()
      .get();
    const eventsTracked = eventsSnapshot.data().count || 0;

    const userStatsSnapshot = await db.collection('torque_user_stats')
      .count()
      .get();
    const activeParticipants = userStatsSnapshot.data().count || 0;

const result = {
      totalEquityPool: '5%',
      activeParticipants,
      eventsTracked,
      rewardsClaimed: '0.3%'
    };
    
    // Cache result for 30 min
    if (isRedisConnected()) {
      await cacheSet(cacheKey, result, 1800);
    }
    
    return result;
  } catch (error) {
    console.error('[Torque] Failed to get overall stats:', error);
    return { totalEquityPool: '5%', activeParticipants: 0, eventsTracked: 0, rewardsClaimed: '0.3%' };
  }
}