/**
 * Analytics tracking utilities
 * Logs user activity and platform usage to Firestore
 */
import { getFirestore } from '../firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

// Lazy getter for Firestore to avoid initialization order issues
const getDb = () => getFirestore();

export interface AnalyticsEvent {
    userId?: string;
    userEmail?: string;
    chain?: string;
    feature?: 'wallet' | 'compare' | 'sybil' | 'contract';
    timestamp: number;
}

/**
 * Track wallet analysis
 */
export async function trackAnalysis(event: AnalyticsEvent) {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const dailyStatsRef = getDb().collection('analytics').doc('daily_stats').collection('records').doc(today);

        // Update daily stats
        await dailyStatsRef.set({
            date: today,
            analysisCount: FieldValue.increment(1),
            [`chainUsage.${event.chain}`]: FieldValue.increment(1),
            [`featureUsage.${event.feature}`]: FieldValue.increment(1),
            lastUpdated: Date.now(),
        }, { merge: true });

        // Update user stats
        if (event.userId) {
            const userRef = getDb().collection('users').doc(event.userId);
            await userRef.update({
                analysisCount: FieldValue.increment(1),
                lastActive: Date.now(),
            });
        }
    } catch (error) {
        console.error('Failed to track analytics:', error);
    }
}

/**
 * Track payment/revenue
 */
export async function trackPayment(data: {
    userId: string;
    userEmail: string;
    walletAddress: string;
    amount: number;
    txHash: string;
    tierUnlocked: string;
    chain: string;
}) {
    try {
        await getDb().collection('analytics').doc('revenue').collection('payments').add({
            ...data,
            timestamp: Date.now(),
        });
    } catch (error) {
        console.error('Failed to track payment:', error);
    }
}

/**
 * Track visitor (page view)
 */
/**
 * Track Try Now preview (public, no auth)
 */
export async function trackPreview(chain: string) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const dailyStatsRef = getDb().collection('analytics').doc('daily_stats').collection('records').doc(today);

        await dailyStatsRef.set({
            date: today,
            previewCount: FieldValue.increment(1),
            [`previewChainUsage.${chain}`]: FieldValue.increment(1),
            lastUpdated: Date.now(),
        }, { merge: true });
    } catch (error) {
        console.error('Failed to track preview:', error);
    }
}

export async function trackVisitor(userId?: string) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const dailyStatsRef = getDb().collection('analytics').doc('daily_stats').collection('records').doc(today);

        await dailyStatsRef.set({
            date: today,
            visitors: FieldValue.increment(1),
            lastUpdated: Date.now(),
        }, { merge: true });

        if (userId) {
            const userActivityRef = getDb().collection('analytics').doc('user_activity').collection('logins');
            await userActivityRef.add({
                userId,
                event: 'login',
                timestamp: Date.now(),
            });
        }
    } catch (error) {
        console.error('Failed to track visitor:', error);
    }
}
