/**
 * Polymarket Watcher Service
 * Monitors markets for volume spikes, price alerts, and trader activity
 * 
 * Collections:
 * - polymarket_alerts: User price alerts
 * - polymarket_follows: Users following traders
 * - polymarket_spikes: Detected volume spikes (for history)
 * - polymarket_snapshots: Market snapshots for spike detection
 */

import { getFirestore, admin } from '../firebase.js';
import { polymarketService, PolymarketMarket, PolymarketTrader } from './PolymarketService.js';
import { sendPolymarketAlert } from './TelegramBot.js';

// Types for Firestore documents
export interface PolymarketPriceAlert {
  id?: string;
  telegramId: number;
  userId: string;
  marketId: string;
  marketSlug: string;
  marketQuestion: string;
  outcome: 'yes' | 'no';
  condition: 'above' | 'below';
  targetPrice: number;
  currentPrice?: number;
  triggered: boolean;
  triggeredAt?: number;
  createdAt: number;
}

export interface PolymarketFollow {
  id?: string;
  telegramId: number;
  userId: string;
  traderAddress: string;
  traderUsername?: string;
  notifyOnTrade: boolean;
  notifyOnNewPosition: boolean;
  addedAt: number;
  lastNotified?: number;
}

export interface PolymarketSpike {
  id?: string;
  marketId: string;
  marketSlug: string;
  marketQuestion: string;
  volume24hr: number;
  volumeSpike: number; // Multiplier (e.g., 3.5x)
  priceChange: number;
  currentPrice: number;
  detectedAt: number;
  notifiedUsers: string[];
}

export interface PolymarketSnapshot {
  marketId: string;
  volume24hr: number;
  volume1wk: number;
  price: number;
  liquidity: number;
  timestamp: number;
}

// Watcher state
let isRunning = false;
let watcherInterval: NodeJS.Timeout | null = null;
let alertCheckInterval: NodeJS.Timeout | null = null;
let traderWatchInterval: NodeJS.Timeout | null = null;

// In-memory cache for snapshot comparison
const marketSnapshots: Map<string, PolymarketSnapshot> = new Map();

// Configuration
const CONFIG = {
  SPIKE_CHECK_INTERVAL: 5 * 60 * 1000,     // Check every 5 minutes
  ALERT_CHECK_INTERVAL: 60 * 1000,          // Check price alerts every minute
  TRADER_CHECK_INTERVAL: 10 * 60 * 1000,    // Check followed traders every 10 minutes
  VOLUME_SPIKE_THRESHOLD: 2.0,              // 2x average is a spike
  MIN_VOLUME_FOR_SPIKE: 10000,              // $10k minimum volume
  MAX_SPIKE_NOTIFICATIONS_PER_DAY: 10,      // Per user
};

/**
 * Start the Polymarket watcher service
 */
export async function startPolymarketWatcher(): Promise<void> {
  if (isRunning) {
    console.log('[PolymarketWatcher] Already running');
    return;
  }

  console.log('[PolymarketWatcher] Starting...');
  isRunning = true;

  // Initial load of market snapshots
  await loadMarketSnapshots();

  // Start periodic checks
  watcherInterval = setInterval(checkVolumeSpikes, CONFIG.SPIKE_CHECK_INTERVAL);
  alertCheckInterval = setInterval(checkPriceAlerts, CONFIG.ALERT_CHECK_INTERVAL);
  traderWatchInterval = setInterval(checkFollowedTraders, CONFIG.TRADER_CHECK_INTERVAL);

  // Run initial checks after a short delay
  setTimeout(checkVolumeSpikes, 10000);
  setTimeout(checkPriceAlerts, 5000);

  console.log('[PolymarketWatcher] Started successfully');
}

/**
 * Stop the watcher service
 */
export function stopPolymarketWatcher(): void {
  if (!isRunning) return;

  console.log('[PolymarketWatcher] Stopping...');
  isRunning = false;

  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
  }
  if (alertCheckInterval) {
    clearInterval(alertCheckInterval);
    alertCheckInterval = null;
  }
  if (traderWatchInterval) {
    clearInterval(traderWatchInterval);
    traderWatchInterval = null;
  }

  console.log('[PolymarketWatcher] Stopped');
}

/**
 * Load market snapshots from Firestore or fetch fresh
 */
async function loadMarketSnapshots(): Promise<void> {
  try {
    const db = getFirestore();
    const snapshotsRef = db.collection('polymarket_snapshots');
    const snapshot = await snapshotsRef.orderBy('timestamp', 'desc').limit(100).get();

    snapshot.docs.forEach(doc => {
      const data = doc.data() as PolymarketSnapshot;
      marketSnapshots.set(data.marketId, data);
    });

    console.log(`[PolymarketWatcher] Loaded ${marketSnapshots.size} market snapshots`);
  } catch (error) {
    console.error('[PolymarketWatcher] Error loading snapshots:', error);
  }
}

/**
 * Check for volume spikes across active markets
 */
async function checkVolumeSpikes(): Promise<void> {
  if (!isRunning) return;

  try {
    console.log('[PolymarketWatcher] Checking for volume spikes...');

    const spikes = await polymarketService.detectVolumeSpikes(
      CONFIG.VOLUME_SPIKE_THRESHOLD,
      CONFIG.MIN_VOLUME_FOR_SPIKE
    );

    if (spikes.length === 0) {
      console.log('[PolymarketWatcher] No volume spikes detected');
      return;
    }

    console.log(`[PolymarketWatcher] Detected ${spikes.length} volume spikes`);

    // Get users who have spike notifications enabled
    const db = getFirestore();
    
    for (const market of spikes.slice(0, 5)) { // Top 5 spikes
      // Check if we already notified about this spike recently
      // Use simple query and filter in memory to avoid composite index
      const recentSpikes = await db.collection('polymarket_spikes')
        .where('marketId', '==', market.id)
        .limit(10)
        .get();

      let alreadyNotified = false;
      recentSpikes.docs.forEach(doc => {
        const data = doc.data();
        if (data.detectedAt > Date.now() - 6 * 60 * 60 * 1000) {
          alreadyNotified = true;
        }
      });

      if (alreadyNotified) {
        continue; // Already notified
      }

      // Record the spike
      const spikeDoc: PolymarketSpike = {
        marketId: market.id,
        marketSlug: market.slug,
        marketQuestion: market.question,
        volume24hr: market.volume24hr,
        volumeSpike: market.volumeSpike,
        priceChange: market.oneDayPriceChange || 0,
        currentPrice: parseFloat(market.outcomePrices[0]) || 0,
        detectedAt: Date.now(),
        notifiedUsers: []
      };

      await db.collection('polymarket_spikes').add(spikeDoc);

      // Update snapshot
      await updateMarketSnapshot(market);

      // Send notifications to subscribed users
      await notifyVolumeSpikeSubscribers(market);
    }
  } catch (error) {
    console.error('[PolymarketWatcher] Error checking volume spikes:', error);
  }
}

/**
 * Check price alerts and trigger notifications
 */
async function checkPriceAlerts(): Promise<void> {
  if (!isRunning) return;

  try {
    const db = getFirestore();
    const alertsRef = db.collection('polymarket_alerts');
    const activeAlerts = await alertsRef
      .where('triggered', '==', false)
      .limit(50)
      .get();

    if (activeAlerts.empty) return;

    console.log(`[PolymarketWatcher] Checking ${activeAlerts.size} price alerts...`);

    // Group alerts by market
    const alertsByMarket: Map<string, Array<{ id: string; alert: PolymarketPriceAlert }>> = new Map();
    
    activeAlerts.docs.forEach(doc => {
      const alert = doc.data() as PolymarketPriceAlert;
      const existing = alertsByMarket.get(alert.marketId) || [];
      existing.push({ id: doc.id, alert });
      alertsByMarket.set(alert.marketId, existing);
    });

    // Check each market
    for (const [marketId, alerts] of Array.from(alertsByMarket.entries())) {
      try {
        const market = await polymarketService.getMarket(alerts[0].alert.marketSlug);
        if (!market) continue;

        const prices = market.outcomePrices.map(p => parseFloat(p));
        const yesPrice = prices[0] || 0;
        const noPrice = prices[1] || 0;

        for (const { id, alert } of alerts) {
          const currentPrice = alert.outcome === 'yes' ? yesPrice : noPrice;
          let triggered = false;

          if (alert.condition === 'above' && currentPrice >= alert.targetPrice) {
            triggered = true;
          } else if (alert.condition === 'below' && currentPrice <= alert.targetPrice) {
            triggered = true;
          }

          if (triggered) {
            // Update alert as triggered
            await alertsRef.doc(id).update({
              triggered: true,
              triggeredAt: Date.now(),
              currentPrice
            });

            // Send notification
            await sendPriceAlertNotification(alert, currentPrice, market);
          }
        }
      } catch (error) {
        console.error(`[PolymarketWatcher] Error checking alerts for market ${marketId}:`, error);
      }
    }
  } catch (error) {
    console.error('[PolymarketWatcher] Error checking price alerts:', error);
  }
}

/**
 * Check activity of followed traders
 */
async function checkFollowedTraders(): Promise<void> {
  if (!isRunning) return;

  try {
    const db = getFirestore();
    const followsRef = db.collection('polymarket_follows');
    const follows = await followsRef.limit(50).get();

    if (follows.empty) return;

    console.log(`[PolymarketWatcher] Checking ${follows.size} followed traders...`);

    // Group by trader
    const traderFollowers: Map<string, Array<{ id: string; follow: PolymarketFollow }>> = new Map();

    follows.docs.forEach(doc => {
      const follow = doc.data() as PolymarketFollow;
      const existing = traderFollowers.get(follow.traderAddress) || [];
      existing.push({ id: doc.id, follow });
      traderFollowers.set(follow.traderAddress, existing);
    });

    for (const [traderAddress, followers] of Array.from(traderFollowers.entries())) {
      try {
        const { trader, positions } = await polymarketService.getTraderProfile(traderAddress);
        
        if (trader && positions.length > 0) {
          // Check for new positions since last notification
          for (const { id, follow } of followers) {
            if (follow.notifyOnNewPosition) {
              // Check for positions added after last notification
              const lastNotified = follow.lastNotified || follow.addedAt;
              
              // For now, just update last checked time
              // In production, you'd compare position changes
              await followsRef.doc(id).update({
                lastNotified: Date.now()
              });
            }
          }
        }
      } catch (error) {
        console.error(`[PolymarketWatcher] Error checking trader ${traderAddress}:`, error);
      }
    }
  } catch (error) {
    console.error('[PolymarketWatcher] Error checking followed traders:', error);
  }
}

/**
 * Update market snapshot for spike detection
 */
async function updateMarketSnapshot(market: PolymarketMarket): Promise<void> {
  const snapshot: PolymarketSnapshot = {
    marketId: market.id,
    volume24hr: market.volume24hr,
    volume1wk: market.volume1wk,
    price: parseFloat(market.outcomePrices[0]) || 0,
    liquidity: market.liquidity,
    timestamp: Date.now()
  };

  marketSnapshots.set(market.id, snapshot);

  try {
    const db = getFirestore();
    await db.collection('polymarket_snapshots').doc(market.id).set(snapshot);
  } catch (error) {
    console.error('[PolymarketWatcher] Error saving snapshot:', error);
  }
}

/**
 * Notify users subscribed to volume spike alerts
 */
async function notifyVolumeSpikeSubscribers(market: PolymarketMarket & { volumeSpike: number }): Promise<void> {
  try {
    const db = getFirestore();
    
    // Get users with spike notifications enabled
    // For now, we'll use a simple flag in the user's telegram settings
    const usersRef = db.collection('polymarket_users');
    const subscribers = await usersRef
      .where('notifySpikes', '==', true)
      .limit(100)
      .get();

    if (subscribers.empty) return;

    const message = formatVolumeSpikeMessage(market);

    for (const doc of subscribers.docs) {
      const user = doc.data();
      if (user.telegramId) {
        try {
          await sendPolymarketAlert(user.telegramId, message);
        } catch (e) {
          console.error(`[PolymarketWatcher] Failed to notify user ${user.telegramId}:`, e);
        }
      }
    }
  } catch (error) {
    console.error('[PolymarketWatcher] Error notifying spike subscribers:', error);
  }
}

/**
 * Send price alert notification
 */
async function sendPriceAlertNotification(
  alert: PolymarketPriceAlert,
  currentPrice: number,
  market: PolymarketMarket
): Promise<void> {
  const direction = alert.condition === 'above' ? '📈 Above' : '📉 Below';
  const outcomeEmoji = alert.outcome === 'yes' ? '✅' : '❌';

  const message = [
    '🔔 *Price Alert Triggered!*',
    '',
    `📊 ${polymarketService.escapeMarkdown(market.question)}`,
    '',
    `${outcomeEmoji} ${alert.outcome.toUpperCase()}: ${(currentPrice * 100).toFixed(1)}¢`,
    `${direction} your target of ${(alert.targetPrice * 100).toFixed(1)}¢`,
    '',
    `🔗 [View Market](${polymarketService.getMarketUrl(market)})`
  ].join('\n');

  try {
    await sendPolymarketAlert(alert.telegramId, message);
  } catch (error) {
    console.error('[PolymarketWatcher] Error sending price alert:', error);
  }
}

/**
 * Format volume spike message
 */
function formatVolumeSpikeMessage(market: PolymarketMarket & { volumeSpike: number }): string {
  const priceChange = market.oneDayPriceChange || 0;
  const changeEmoji = priceChange > 0 ? '📈' : priceChange < 0 ? '📉' : '➖';

  return [
    '🚨 *Volume Spike Detected!*',
    '',
    `📊 ${polymarketService.escapeMarkdown(market.question)}`,
    '',
    `⚡ Volume: ${market.volumeSpike}x normal`,
    `💰 24h Volume: $${polymarketService.formatNumber(market.volume24hr)}`,
    `${changeEmoji} Price Change: ${priceChange > 0 ? '+' : ''}${(priceChange * 100).toFixed(1)}%`,
    '',
    `🔗 [View Market](${polymarketService.getMarketUrl(market)})`
  ].join('\n');
}

// ==========================================
// ALERT MANAGEMENT FUNCTIONS
// ==========================================

/**
 * Create a price alert for a user
 */
export async function createPriceAlert(
  telegramId: number,
  userId: string,
  marketSlug: string,
  outcome: 'yes' | 'no',
  condition: 'above' | 'below',
  targetPrice: number
): Promise<{ success: boolean; error?: string; alert?: PolymarketPriceAlert }> {
  try {
    const market = await polymarketService.getMarket(marketSlug);
    if (!market) {
      return { success: false, error: 'Market not found' };
    }

    // Check existing alerts count
    const db = getFirestore();
    const existingAlerts = await db.collection('polymarket_alerts')
      .where('telegramId', '==', telegramId)
      .where('triggered', '==', false)
      .get();

    if (existingAlerts.size >= 10) {
      return { success: false, error: 'Maximum 10 active alerts allowed' };
    }

    const alert: PolymarketPriceAlert = {
      telegramId,
      userId,
      marketId: market.id,
      marketSlug: market.slug,
      marketQuestion: market.question,
      outcome,
      condition,
      targetPrice,
      currentPrice: parseFloat(market.outcomePrices[outcome === 'yes' ? 0 : 1]),
      triggered: false,
      createdAt: Date.now()
    };

    const docRef = await db.collection('polymarket_alerts').add(alert);
    alert.id = docRef.id;

    return { success: true, alert };
  } catch (error) {
    console.error('[PolymarketWatcher] Error creating alert:', error);
    return { success: false, error: 'Failed to create alert' };
  }
}

/**
 * Get user's active alerts
 */
export async function getUserAlerts(telegramId: number): Promise<PolymarketPriceAlert[]> {
  try {
    const db = getFirestore();
    const alertsRef = db.collection('polymarket_alerts');
    const snapshot = await alertsRef
      .where('telegramId', '==', telegramId)
      .where('triggered', '==', false)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PolymarketPriceAlert));
  } catch (error) {
    console.error('[PolymarketWatcher] Error getting user alerts:', error);
    return [];
  }
}

/**
 * Delete a price alert
 */
export async function deleteAlert(telegramId: number, alertId: string): Promise<boolean> {
  try {
    const db = getFirestore();
    const alertRef = db.collection('polymarket_alerts').doc(alertId);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) return false;

    const alert = alertDoc.data() as PolymarketPriceAlert;
    if (alert.telegramId !== telegramId) return false;

    await alertRef.delete();
    return true;
  } catch (error) {
    console.error('[PolymarketWatcher] Error deleting alert:', error);
    return false;
  }
}

// ==========================================
// TRADER FOLLOWING FUNCTIONS
// ==========================================

/**
 * Follow a trader
 */
export async function followTrader(
  telegramId: number,
  userId: string,
  traderAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getFirestore();

    // Check if already following
    const existing = await db.collection('polymarket_follows')
      .where('telegramId', '==', telegramId)
      .where('traderAddress', '==', traderAddress.toLowerCase())
      .limit(1)
      .get();

    if (!existing.empty) {
      return { success: false, error: 'Already following this trader' };
    }

    // Check follow limit
    const followCount = await db.collection('polymarket_follows')
      .where('telegramId', '==', telegramId)
      .get();

    if (followCount.size >= 20) {
      return { success: false, error: 'Maximum 20 followed traders allowed' };
    }

    const follow: PolymarketFollow = {
      telegramId,
      userId,
      traderAddress: traderAddress.toLowerCase(),
      notifyOnTrade: true,
      notifyOnNewPosition: true,
      addedAt: Date.now()
    };

    await db.collection('polymarket_follows').add(follow);
    return { success: true };
  } catch (error) {
    console.error('[PolymarketWatcher] Error following trader:', error);
    return { success: false, error: 'Failed to follow trader' };
  }
}

/**
 * Unfollow a trader
 */
export async function unfollowTrader(telegramId: number, traderAddress: string): Promise<boolean> {
  try {
    const db = getFirestore();
    const follows = await db.collection('polymarket_follows')
      .where('telegramId', '==', telegramId)
      .where('traderAddress', '==', traderAddress.toLowerCase())
      .get();

    if (follows.empty) return false;

    const batch = db.batch();
    follows.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return true;
  } catch (error) {
    console.error('[PolymarketWatcher] Error unfollowing trader:', error);
    return false;
  }
}

/**
 * Get user's followed traders
 */
export async function getFollowedTraders(telegramId: number): Promise<PolymarketFollow[]> {
  try {
    const db = getFirestore();
    const follows = await db.collection('polymarket_follows')
      .where('telegramId', '==', telegramId)
      .orderBy('addedAt', 'desc')
      .get();

    return follows.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PolymarketFollow));
  } catch (error) {
    console.error('[PolymarketWatcher] Error getting followed traders:', error);
    return [];
  }
}

// ==========================================
// USER PREFERENCES
// ==========================================

/**
 * Update user's Polymarket notification preferences
 */
export async function updateUserPolymarketPrefs(
  telegramId: number,
  prefs: {
    notifySpikes?: boolean;
    notifyPriceAlerts?: boolean;
    notifyTraderActivity?: boolean;
  }
): Promise<void> {
  try {
    const db = getFirestore();
    await db.collection('polymarket_users').doc(String(telegramId)).set(
      {
        telegramId,
        ...prefs,
        updatedAt: Date.now()
      },
      { merge: true }
    );
  } catch (error) {
    console.error('[PolymarketWatcher] Error updating user prefs:', error);
  }
}

/**
 * Get user's Polymarket preferences
 */
export async function getUserPolymarketPrefs(telegramId: number): Promise<{
  notifySpikes: boolean;
  notifyPriceAlerts: boolean;
  notifyTraderActivity: boolean;
}> {
  const defaults = {
    notifySpikes: true,
    notifyPriceAlerts: true,
    notifyTraderActivity: true
  };

  try {
    const db = getFirestore();
    const doc = await db.collection('polymarket_users').doc(String(telegramId)).get();

    if (!doc.exists) return defaults;

    const data = doc.data() || {};
    return {
      notifySpikes: data.notifySpikes ?? defaults.notifySpikes,
      notifyPriceAlerts: data.notifyPriceAlerts ?? defaults.notifyPriceAlerts,
      notifyTraderActivity: data.notifyTraderActivity ?? defaults.notifyTraderActivity
    };
  } catch (error) {
    console.error('[PolymarketWatcher] Error getting user prefs:', error);
    return defaults;
  }
}

// Export for testing
export { CONFIG as WATCHER_CONFIG };
