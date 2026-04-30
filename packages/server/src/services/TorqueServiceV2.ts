// ============================================================
// FundTracer by DT - Torque Service (Fresh Start v2)
// Clean architecture: single collection, rank on write, no count queries
// ============================================================

import { getFirestore } from '../firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { isRedisConnected, cacheGet, cacheSet, cacheDel } from '../utils/redis.js';

const getDb = () => getFirestore();

interface WalletScan {
  userId: string;
  walletAddress: string;
  walletsScanned: number;
  totalPoints: number;
  rank: number;
  firstScanAt: number;
  lastScanAt: number;
  displayName: string;
  createdAt: number;
  updatedAt: number;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  walletsScanned: number;
  totalPoints: number;
}

interface ActivityEntry {
  id: string;
  userId: string;
  displayName: string;
  walletAddress: string;
  chain: string;
  points: number;
  timestamp: number;
}

class TorqueServiceV2 {
  private apiKey: string;
  private ingestUrl: string;
  private isEnabled: boolean;
  private collection = 'torque_wallets';
  private activityCollection = 'torque_activity';
  private maxActivityEntries = 20;

  constructor() {
    this.apiKey = process.env.TORQUE_API_KEY || '';
    this.ingestUrl = process.env.TORQUE_INGEST_URL || 'https://ingest.torque.so/events';
    this.isEnabled = !!this.apiKey;
    
    if (this.isEnabled) {
      console.log('[TorqueV2] Service enabled with ingestion API');
    } else {
      console.log('[TorqueV2] Service disabled - running local only');
    }
  }

  // Initialize wallet on first scan
  async initWallet(userId: string, displayName: string = ''): Promise<void> {
    const db = getDb();
    const docRef = db.collection(this.collection).doc(userId);
    
    await docRef.set({
      userId,
      walletsScanned: 0,
      totalPoints: 0,
      rank: 0,
      firstScanAt: Date.now(),
      lastScanAt: Date.now(),
      displayName: displayName || '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  // Increment scan count AND update rank atomically
  async incrementScan(userId: string, displayName: string = ''): Promise<boolean> {
    try {
      const db = getDb();
      const docRef = db.collection(this.collection).doc(userId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        // First scan - create new record
        await this.initWallet(userId, displayName);
      }
      
      // Increment wallets scanned
      await docRef.update({
        walletsScanned: FieldValue.increment(1),
        totalPoints: FieldValue.increment(10),
        lastScanAt: Date.now(),
        updatedAt: Date.now()
      });
      
      // Update rank: recalculate all ranks (expensive but only on write)
      await this.recalculateRanks();
      
      // Invalidate caches
      if (isRedisConnected()) {
        await cacheDel('torque:v2:leaderboard').catch(() => {});
        await cacheDel(`torque:v2:user:${userId}`).catch(() => {});
      }
      
      // Send to Torque API (async, don't await)
      this.sendToTorque(userId, 'wallet_scanned', { points: 10 }).catch(() => {});
      
      return true;
    } catch (error) {
      console.error('[TorqueV2] Increment error:', error);
      return false;
    }
  }

  // Recalculate all ranks - called on write only
  private async recalculateRanks(): Promise<void> {
    try {
      const db = getDb();
      
      // Get all users sorted by points
      const snapshot = await db.collection(this.collection)
        .orderBy('totalPoints', 'desc')
        .get();
      
      // Batch update ranks (expensive but one-time per scan)
      const batch = db.batch();
      let rank = 1;
      
      for (const doc of snapshot.docs) {
        batch.update(doc.ref, { rank });
        rank++;
      }
      
      await batch.commit();
      console.log(`[TorqueV2] Recalculated ranks for ${snapshot.size} users`);
    } catch (error) {
      console.error('[TorqueV2] Rank recalculation error:', error);
    }
  }

  // Get leaderboard from cache or Firestore
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const cacheKey = 'torque:v2:leaderboard';
    const cacheTtl = 300; // 5 minutes
    
    try {
      // Redis cache first
      if (isRedisConnected()) {
        const cached = await cacheGet<LeaderboardEntry[]>(cacheKey);
        if (cached && cached.length > 0) {
          return cached;
        }
      }
      
      const db = getDb();
      const snapshot = await db.collection(this.collection)
        .orderBy('totalPoints', 'desc')
        .limit(50)
        .get();
      
      // Batch fetch display names
      const userIds = snapshot.docs.map(d => d.id);
      const userRefs = userIds.map(id => db.collection('users').doc(id));
      const userDocs = await db.getAll(...userRefs);
      
      const displayNameMap: Record<string, string> = {};
      userDocs.forEach(doc => {
        if (doc?.exists) {
          displayNameMap[doc.id] = doc.data()?.displayName || doc.data()?.name || '';
        }
      });
      
      const entries: LeaderboardEntry[] = [];
      let rank = 1;
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        let displayName = displayNameMap[doc.id] || data.displayName || '';
        
        entries.push({
          rank,
          userId: doc.id,
          displayName,
          score: (data.walletsScanned || 0) * 10,
          walletsScanned: data.walletsScanned || 0,
          totalPoints: data.totalPoints || 0
        });
        rank++;
      }
      
      // Cache for 5 minutes
      if (isRedisConnected() && entries.length > 0) {
        await cacheSet(cacheKey, entries, cacheTtl);
      }
      
      return entries;
    } catch (error) {
      console.error('[TorqueV2] Leaderboard error:', error);
      return [];
    }
  }

  // Get user's personal stats
  async getMyStats(userId: string): Promise<{
    walletsScanned: number;
    totalPoints: number;
    rank: number;
    totalScans: number;
  } | null> {
    const cacheKey = `torque:v2:user:${userId}`;
    
    try {
      // Redis cache first
      if (isRedisConnected()) {
        const cached = await cacheGet<any>(cacheKey);
        if (cached) {
          return cached;
        }
      }
      
      const db = getDb();
      const doc = await db.collection(this.collection).doc(userId).get();
      
      if (!doc.exists) {
        return {
          walletsScanned: 0,
          totalPoints: 0,
          rank: 0,
          totalScans: 0
        };
      }
      
      const data = doc.data();
      
      // Get total scans
      const totalSnap = await db.collection(this.collection).count().get();
      const totalScans = totalSnap.data().count || 0;
      
      const stats = {
        walletsScanned: data?.walletsScanned || 0,
        totalPoints: data?.totalPoints || 0,
        rank: data?.rank || 0,
        totalScans
      };
      
      // Cache for 5 minutes
      if (isRedisConnected()) {
        await cacheSet(cacheKey, stats, 300);
      }
      
      return stats;
    } catch (error) {
      console.error('[TorqueV2] Stats error:', error);
      return null;
    }
  }

  // Get total scanned count
  async getTotalScanned(): Promise<number> {
    const cacheKey = 'torque:v2:total';
    
    try {
      if (isRedisConnected()) {
        const cached = await cacheGet<number>(cacheKey);
        if (cached !== null) {
          return cached;
        }
      }
      
      const db = getDb();
      const snapshot = await db.collection(this.collection)
        .where('walletsScanned', '>', 0)
        .count()
        .get();
      
      const total = snapshot.data().count || 0;
      
      if (isRedisConnected()) {
        await cacheSet(cacheKey, total, 300);
      }
      
      return total;
    } catch (error) {
      console.error('[TorqueV2] Total error:', error);
      return 0;
    }
  }

  // Reset all data (admin)
  async resetAll(): Promise<{ deleted: number; cleared: number }> {
    const db = getDb();
    
    // Delete all documents
    const snapshot = await db.collection(this.collection).get();
    const deleted = snapshot.size;
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    // Clear Redis
    let cleared = 0;
    if (isRedisConnected()) {
      await cacheDel('torque:v2:leaderboard').then(() => cleared++).catch(() => {});
      await cacheDel('torque:v2:total').then(() => cleared++).catch(() => {});
      // Clear all user stats
      const keys = ['torque:v2:user:*'];
      // Note: would need SCAN for pattern, simplified here
    }
    
    console.log(`[TorqueV2] Reset: deleted ${deleted} docs`);
    return { deleted, cleared };
  }

  // Send to Torque API (async)
  private async sendToTorque(userId: string, event: string, data: Record<string, any>): Promise<void> {
    if (!this.isEnabled) {
      console.log(`[TorqueV2] Event (simulated): ${event} - ${userId}`);
      return;
    }
    
    try {
      await fetch(this.ingestUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userPubkey: userId,
          eventName: event,
          timestamp: Date.now(),
          data
        })
      });
    } catch (error) {
      console.error('[TorqueV2] API error:', error);
    }
  }

  // Add activity entry (called after group scans)
  async addActivity(userId: string, displayName: string, walletAddress: string, chain: string): Promise<void> {
    try {
      const db = getDb();
      
      // Add new activity entry
      await db.collection(this.activityCollection).add({
        userId,
        displayName: displayName || 'Anonymous',
        walletAddress: walletAddress.toLowerCase(),
        chain: chain.toLowerCase(),
        points: 10,
        timestamp: Date.now()
      });
      
      // Clean up old entries - keep only last 20
      const snapshot = await db.collection(this.activityCollection)
        .orderBy('timestamp', 'desc')
        .get();
      
      if (snapshot.size > this.maxActivityEntries) {
        const toDelete = snapshot.docs.slice(this.maxActivityEntries);
        const batch = db.batch();
        toDelete.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
      
      console.log(`[TorqueV2] Activity added: ${displayName} scanned ${walletAddress.slice(0, 10)}...`);
    } catch (error) {
      console.error('[TorqueV2] Add activity error:', error);
    }
  }

  // Get recent activity (for web and Telegram)
  async getActivity(limit: number = 10): Promise<ActivityEntry[]> {
    try {
      const cacheKey = 'torque:v2:activity';
      
      // Redis cache first (short TTL)
      if (isRedisConnected()) {
        const cached = await cacheGet<ActivityEntry[]>(cacheKey);
        if (cached && cached.length > 0) {
          return cached;
        }
      }
      
      const db = getDb();
      const snapshot = await db.collection(this.activityCollection)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      const activities: ActivityEntry[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        walletAddress: doc.data().walletAddress || ''
      })) as ActivityEntry[];
      
      // Cache for 15 seconds
      if (isRedisConnected() && activities.length > 0) {
        await cacheSet(cacheKey, activities, 15);
      }
      
      return activities;
    } catch (error) {
      console.error('[TorqueV2] Get activity error:', error);
      return [];
    }
  }

  // Get claim status for user
  async getClaimStatus(userId: string): Promise<{
    totalPoints: number;
    claimedPoints: number;
    unclaimedPoints: number;
    equityPercent: number;
    canClaim: boolean;
    claimed: boolean;
  }> {
    const db = getDb();
    const doc = await db.collection(this.collection).doc(userId).get();
    const totalPoints = doc.data()?.totalPoints || 0;
    
    // Check if already claimed
    const claimsnap = await db.collection('torque_claims')
      .where('userId', '==', userId)
      .get();
    const hasClaimed = claimsnap.size > 0;
    const claimedPoints = hasClaimed ? claimsnap.docs[0].data().pointsClaimed || 0 : 0;
    const claimedEquity = hasClaimed ? claimsnap.docs[0].data().equityPercent || 0 : 0;
    
    return {
      totalPoints,
      claimedPoints,
      unclaimedPoints: hasClaimed ? 0 : totalPoints,
      equityPercent: claimedEquity,
      canClaim: !hasClaimed && totalPoints >= 1000,
      claimed: hasClaimed
    };
  }

  // Process claim
  async processClaim(userId: string): Promise<{ success: boolean; equityPercent: number; message: string }> {
    const db = getDb();
    const doc = await db.collection(this.collection).doc(userId).get();
    const totalPoints = doc.data()?.totalPoints || 0;
    
    if (totalPoints < 1000) {
      return { success: false, equityPercent: 0, message: 'Need at least 1,000 points to claim equity' };
    }
    
    // Check if already claimed this month
    const claimsnap = await db.collection('torque_claims')
      .where('userId', '==', userId)
      .orderBy('claimedAt', 'desc')
      .limit(1)
      .get();
    
    if (claimsnap.size > 0) {
      const lastClaim = claimsnap.docs[0].data();
      const lastClaimTime = lastClaim.claimedAt || 0;
      const now = Date.now();
      const oneMonth = 30 * 24 * 60 * 60 * 1000;
      
      if (now - lastClaimTime < oneMonth) {
        return { success: false, equityPercent: 0, message: 'Already claimed this month' };
      }
    }
    
    // Process claim
    const equityPercent = totalPoints * 0.00001;
    
    await db.collection('torque_claims').add({
      userId,
      pointsClaimed: totalPoints,
      equityPercent,
      claimedAt: Date.now()
    });
    
    // Add activity entry for claim
    await db.collection(this.activityCollection).add({
      userId,
      type: 'claim',
      description: `Claimed ${equityPercent.toFixed(5)}% equity`,
      points: totalPoints,
      chain: 'equity',
      timestamp: Date.now()
    });
    
    return {
      success: true,
      equityPercent,
      message: `Claimed ${equityPercent.toFixed(5)}% equity`
    };
  }

  // Get pool stats
  async getPoolStats(): Promise<{
    totalPoints: number;
    totalUsers: number;
    poolSize: number;
    distributed: number;
  }> {
    const db = getDb();
    
    const usersnap = await db.collection(this.collection).where('totalPoints', '>', 0).get();
    const totalUsers = usersnap.size;
    const totalPoints = usersnap.docs.reduce((sum, d) => sum + (d.data().totalPoints || 0), 0);
    
    const claimsnap = await db.collection('torque_claims').get();
    const distributed = claimsnap.docs.reduce((sum, d) => sum + (d.data().equityPercent || 0), 0);
    
    return {
      totalPoints,
      totalUsers,
      poolSize: 5, // 5% equity pool
      distributed
    };
  }
}

export const torqueServiceV2 = new TorqueServiceV2();