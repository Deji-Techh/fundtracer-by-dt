/**
 * Alert Service - Firestore CRUD for wallet alerts + Redis cache for activity
 */
import { getFirestore, admin } from '../firebase.js';
import { cacheGet, cacheSet, cacheDel, cacheDelPattern, isRedisConnected } from '../utils/redis.js';

const ALERTS_COLLECTION = 'radar_alerts';
const ACTIVITY_COLLECTION = 'radar_activity';
const ACTIVITY_CACHE_TTL_SECONDS = 300; // 5 minutes

export interface RadarAlert {
    id: string;
    address: string;
    label?: string;
    chain: 'solana' | 'evm';
    alertType: 'any_transaction' | 'large_transfer' | 'suspicious' | 'token_swap' | 'nft_activity' | 'new_position';
    threshold?: number;
    enabled: boolean;
    email: string;
    customMessage?: string;
    userId: string;
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
}

export interface RadarActivity {
    id: string;
    alertId: string;
    address: string;
    userId: string;
    type: 'received' | 'sent' | 'swap' | 'nft' | 'stake' | 'other';
    amount?: number;
    amountUSD?: number;
    token?: string;
    txHash: string;
    timestamp: admin.firestore.Timestamp;
    signature?: string;
    fromAddress?: string;
    toAddress?: string;
}

class AlertService {
    private db: admin.firestore.Firestore;

    constructor() {
        this.db = getFirestore();
    }

    /**
     * Create a new alert for a user
     */
    async createAlert(data: Omit<RadarAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const now = admin.firestore.Timestamp.now();
        
        // Filter out undefined values to prevent Firestore errors
        const cleanedData: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
                cleanedData[key] = value;
            }
        });
        
        const docRef = this.db.collection(ALERTS_COLLECTION).doc();
        
        await docRef.set({
            ...cleanedData,
            createdAt: now,
            updatedAt: now,
        });

        console.log(`[Radar] Created alert ${docRef.id} for address ${data.address}`);
        return docRef.id;
    }

    /**
     * Get all alerts for a user
     */
    async getAlertsByUser(userId: string): Promise<RadarAlert[]> {
        const snapshot = await this.db.collection(ALERTS_COLLECTION)
            .where('userId', '==', userId)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as RadarAlert));
    }

    /**
     * Get all enabled alerts for a chain (for monitoring)
     */
    async getEnabledAlerts(chain: 'solana' | 'evm'): Promise<RadarAlert[]> {
        const snapshot = await this.db.collection(ALERTS_COLLECTION)
            .where('chain', '==', chain)
            .where('enabled', '==', true)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as RadarAlert));
    }

    /**
     * Get an alert by ID
     */
    async getAlert(alertId: string): Promise<RadarAlert | null> {
        const doc = await this.db.collection(ALERTS_COLLECTION).doc(alertId).get();
        
        if (!doc.exists) {
            return null;
        }

        return {
            id: doc.id,
            ...doc.data()
        } as RadarAlert;
    }

    /**
     * Get alert by address and user
     */
    async getAlertByAddress(address: string, userId: string): Promise<RadarAlert | null> {
        const snapshot = await this.db.collection(ALERTS_COLLECTION)
            .where('address', '==', address)
            .where('userId', '==', userId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data()
        } as RadarAlert;
    }

    /**
     * Update an alert
     */
    async updateAlert(alertId: string, data: Partial<Omit<RadarAlert, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
        await this.db.collection(ALERTS_COLLECTION).doc(alertId).update({
            ...data,
            updatedAt: admin.firestore.Timestamp.now(),
        });

        console.log(`[Radar] Updated alert ${alertId}`);
    }

    /**
     * Delete an alert
     */
    async deleteAlert(alertId: string): Promise<void> {
        await this.db.collection(ALERTS_COLLECTION).doc(alertId).delete();
        console.log(`[Radar] Deleted alert ${alertId}`);
    }

    /**
     * Toggle alert enabled state
     */
    async toggleAlert(alertId: string, enabled: boolean): Promise<void> {
        await this.db.collection(ALERTS_COLLECTION).doc(alertId).update({
            enabled,
            updatedAt: admin.firestore.Timestamp.now(),
        });

        console.log(`[Radar] Toggled alert ${alertId}: ${enabled}`);
    }

    /**
     * Record activity for an alert - INVALIDATES CACHE
     */
    async recordActivity(data: Omit<RadarActivity, 'id'>): Promise<string> {
        const docRef = this.db.collection(ACTIVITY_COLLECTION).doc();
        
        await docRef.set(data);

        // Invalidate user's activity cache
        if (isRedisConnected()) {
            const userId = data.userId || 'unknown';
            await cacheDel(`radar:activity:${userId}:*`);
            console.log(`[Radar] Invalidated cache for user ${userId}`);
        }

        return docRef.id;
    }

    /**
     * Get recent activity for an alert
     */
    async getRecentActivity(alertId: string, limit: number = 50): Promise<RadarActivity[]> {
        const snapshot = await this.db.collection(ACTIVITY_COLLECTION)
            .where('alertId', '==', alertId)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as RadarActivity));
    }

    /**
     * Get all activity for a user's alerts (for live feed) - WITH REDIS CACHE
     */
    async getLiveActivity(userId: string, limit: number = 100): Promise<RadarActivity[]> {
        const cacheKey = `radar:activity:${userId}:${limit}`;
        
        // Check Redis cache first
        if (isRedisConnected()) {
            const cached = await cacheGet<RadarActivity[]>(cacheKey);
            if (cached && cached.length > 0) {
                console.log(`[Radar] Cache HIT for ${userId}`);
                return cached.slice(0, limit);
            }
            console.log(`[Radar] Cache MISS for ${userId}`);
        }

        // Cache miss - fetch from Firestore
        const alerts = await this.getAlertsByUser(userId);
        const alertIds = alerts.map(a => a.id);

        if (alertIds.length === 0) {
            return [];
        }

        // Get activities for all user's alerts
        const activities: RadarActivity[] = [];
        
        for (const alertId of alertIds.slice(0, 10)) {
            const snapshot = await this.db.collection(ACTIVITY_COLLECTION)
                .where('alertId', '==', alertId)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            snapshot.docs.forEach(doc => {
                activities.push({
                    id: doc.id,
                    ...doc.data()
                } as RadarActivity);
            });
        }

        // Sort by timestamp descending and limit
        activities.sort((a, b) => {
            const timeA = a.timestamp instanceof admin.firestore.Timestamp ? a.timestamp.toDate().getTime() : 0;
            const timeB = b.timestamp instanceof admin.firestore.Timestamp ? b.timestamp.toDate().getTime() : 0;
            return timeB - timeA;
        });

        const result = activities.slice(0, limit);

        // Cache the result
        if (isRedisConnected() && result.length > 0) {
            await cacheSet(cacheKey, result, ACTIVITY_CACHE_TTL_SECONDS);
            console.log(`[Radar] Cached ${result.length} activities for ${userId}`);
        }

        return result;
    }

    /**
     * Check if activity is a duplicate (prevent spam)
     */
    async isDuplicateActivity(alertId: string, txHash: string, withinSeconds: number = 60): Promise<boolean> {
        const cutoff = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - withinSeconds * 1000)
        );

        const snapshot = await this.db.collection(ACTIVITY_COLLECTION)
            .where('alertId', '==', alertId)
            .where('txHash', '==', txHash)
            .where('timestamp', '>=', cutoff)
            .limit(1)
            .get();

        return !snapshot.empty;
    }
}

export const alertService = new AlertService();