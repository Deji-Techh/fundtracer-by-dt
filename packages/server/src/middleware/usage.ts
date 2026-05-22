// ============================================================
// Usage Tracking Middleware - Per-Minute + Per-Day Rate Limits
// Uses Redis with TTL; falls back to Firestore
// ============================================================

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { getFirestore } from '../firebase.js';
import { isRedisConnected, cacheGet, cacheSet, getRedis } from '../utils/redis.js';

// Chain configuration - support both frontend IDs and canonical names
const ALLOWED_CHAINS = [
    'ethereum', 'eth',
    'linea',
    'arbitrum', 'arb',
    'base',
    'optimism', 'opt',
    'bsc', 'binance',
    'solana'
];

// Map frontend chain IDs to canonical names
const normalizeChainId = (chain: string): string => {
    const mapping: Record<string, string> = {
        'eth': 'ethereum',
        'arb': 'arbitrum',
        'opt': 'optimism',
        'binance': 'bsc',
    };
    return mapping[chain.toLowerCase()] || chain.toLowerCase();
};

export interface RateLimitInfo {
    usedMinute: number;
    limitMinute: number;
    remainingMinute: number;
    usedDay: number;
    limitDay: number;
    remainingDay: number;
    tier: string;
}

function getMinuteKey(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}${String(d.getUTCHours()).padStart(2,'0')}${String(d.getUTCMinutes()).padStart(2,'0')}`;
}

function getDayKey(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;
}

function getTierLimits(tier: string): { daily: number; perMinute: number } {
    switch (tier) {
        case 'enterprise': return { daily: 100000, perMinute: 300 };
        case 'pro': return { daily: 10000, perMinute: 60 };
        default: return { daily: 1000, perMinute: 100 };
    }
}

async function getUserTier(uid: string): Promise<string> {
    const userCacheKey = `auth:user:${uid}`;
    if (isRedisConnected()) {
        const cached = await cacheGet<{ tier?: string }>(userCacheKey);
        if (cached?.tier) return cached.tier;
    }
    try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(uid).get();
        return userDoc.data()?.tier || 'free';
    } catch {
        return 'free';
    }
}

export async function usageMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const uid = req.user.uid;
    const redis = getRedis();

    try {
        // Get user tier
        const tier = await getUserTier(uid);
        const limits = getTierLimits(tier);

        // Validate chain (if present in request)
        const chain = req.body.chain;
        if (chain) {
            const normalizedChain = normalizeChainId(chain);
            if (!ALLOWED_CHAINS.includes(normalizedChain)) {
                return res.status(400).json({ error: 'Invalid chain' });
            }
        }

        let usedMinute = 0;
        let usedDay = 0;

        if (redis && isRedisConnected()) {
            // ---- Redis path ----
            const minuteKey = `usage:${uid}:minute:${getMinuteKey()}`;
            const dayKey = `usage:${uid}:day:${getDayKey()}`;

            // Read current counts
            const [minuteStr, dayStr] = await Promise.all([
                redis.get<string>(minuteKey),
                redis.get<string>(dayKey),
            ]);
            usedMinute = minuteStr ? parseInt(minuteStr, 10) : 0;
            usedDay = dayStr ? parseInt(dayStr, 10) : 0;

            // Check minute limit
            if (usedMinute >= limits.perMinute) {
                const retryAfter = 60 - new Date().getUTCSeconds();
                res.setHeader('Retry-After', String(retryAfter));
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: `Minute limit of ${limits.perMinute} reached. Try again shortly.`,
                    rateLimit: {
                        usedMinute,
                        limitMinute: limits.perMinute,
                        remainingMinute: 0,
                        usedDay,
                        limitDay: limits.daily,
                        remainingDay: Math.max(0, limits.daily - usedDay),
                        tier,
                    },
                });
            }

            // Check daily limit
            if (usedDay >= limits.daily) {
                const now = new Date();
                const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
                const retryAfter = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
                res.setHeader('Retry-After', String(retryAfter));
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: `Daily limit of ${limits.daily} reached. Resets at midnight UTC.`,
                    rateLimit: {
                        usedMinute,
                        limitMinute: limits.perMinute,
                        remainingMinute: limits.perMinute - usedMinute - 1,
                        usedDay,
                        limitDay: limits.daily,
                        remainingDay: 0,
                        tier,
                    },
                });
            }

            // Increment counters
            await Promise.all([
                redis.incr(minuteKey),
                redis.incr(dayKey),
            ]);
            // Set TTLs
            await Promise.all([
                redis.expire(minuteKey, 90),
                redis.expire(dayKey, 86400),
            ]);

            usedMinute += 1;
            usedDay += 1;

            // Attach rate limit info
            const rateLimit: RateLimitInfo = {
                usedMinute,
                limitMinute: limits.perMinute,
                remainingMinute: limits.perMinute - usedMinute,
                usedDay,
                limitDay: limits.daily,
                remainingDay: limits.daily - usedDay,
                tier,
            };
            res.locals.rateLimit = rateLimit;

            // Set rate limit response headers
            res.setHeader('X-RateLimit-Limit-Minute', String(limits.perMinute));
            res.setHeader('X-RateLimit-Remaining-Minute', String(limits.perMinute - usedMinute));
            res.setHeader('X-RateLimit-Limit-Day', String(limits.daily));
            res.setHeader('X-RateLimit-Remaining-Day', String(limits.daily - usedDay));
            res.setHeader('X-RateLimit-Tier', tier);

            // Update user cache (non-blocking)
            const userCacheKey = `auth:user:${uid}`;
            cacheSet(userCacheKey, { tier }, 60).catch(() => {});

            console.log(`[USAGE] ${uid} - min: ${usedMinute}/${limits.perMinute} day: ${usedDay}/${limits.daily}`);
            next();
            return;
        }

        // ---- Firestore fallback ----
        console.log('[USAGE] Redis unavailable, using Firestore fallback');
        const db = getFirestore();
        const userRef = db.collection('users').doc(uid);
        const today = getDayKey();

        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const userData = userDoc.data();

            const usageData = userData?.dailyUsage || {};
            const currentDayUsage = usageData[today] || 0;

            if (currentDayUsage >= limits.daily) {
                return { error: 'Daily limit reached', status: 429 as const };
            }

            transaction.update(userRef, {
                [`dailyUsage.${today}`]: (currentDayUsage || 0) + 1,
                lastActive: new Date().toISOString(),
            });

            return { success: true as const, usedDay: currentDayUsage + 1 };
        });

        if ('error' in result) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: 'Daily limit reached.',
            });
        }

        const rateLimit: RateLimitInfo = {
            usedMinute: 0,
            limitMinute: limits.perMinute,
            remainingMinute: limits.perMinute,
            usedDay: result.usedDay,
            limitDay: limits.daily,
            remainingDay: limits.daily - result.usedDay,
            tier,
        };
        res.locals.rateLimit = rateLimit;

        console.log(`[USAGE] Firestore: ${uid} - day: ${result.usedDay}/${limits.daily}`);
        next();
    } catch (error) {
        console.error('[USAGE] Error:', error);
        next();
    }
}
