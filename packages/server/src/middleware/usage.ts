// ============================================================
// Usage Tracking Middleware - Enforce 4-Hour Window Limits
// OPTIMIZED: Uses Redis with TTL instead of Firestore transactions
// Reduces Firestore writes from ~200/day to 0
// ============================================================

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { getFirestore } from '../firebase.js';
import { isRedisConnected, cacheGet, cacheSet, getRedis } from '../utils/redis.js';

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const FOUR_HOURS_SECONDS = 4 * 60 * 60; // 4 hours in seconds

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

interface UsageWindow {
    windowStart: number;
    operations: number;
    tier: string;
}

interface UsageResult {
    success: boolean;
    error?: string;
    status?: number;
    message?: string;
    tier?: string;
    operationLimit?: number;
    remaining?: number;
    limit?: number;
    used?: number;
    resetsAt?: string;
}

async function getUserTierFromRedis(uid: string): Promise<string> {
    // First try to get tier from user cache
    const userCacheKey = `auth:user:${uid}`;
    const cached = await cacheGet<{ tier?: string }>(userCacheKey);
    if (cached?.tier) {
        return cached.tier;
    }
    
    // Fallback to Firestore if not cached
    try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        return userData?.tier || 'free';
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
        // OPTIMIZATION: Use Redis with TTL for usage tracking
        // Key format: usage:{uid}:{current_window}
        const now = Date.now();
        const windowKey = `usage:${uid}:${Math.floor(now / FOUR_HOURS_MS)}`;
        
        let tier = 'free';
        let operationLimit = 7;
        
        // Get tier from cache or Firestore
        if (isRedisConnected()) {
            const tierCacheKey = `auth:user:${uid}`;
            const cachedUser = await cacheGet<{ tier?: string }>(tierCacheKey);
            tier = cachedUser?.tier || 'free';
        } else {
            tier = await getUserTierFromRedis(uid);
        }
        
        // Determine limit based on tier
        operationLimit = tier === 'free' ? 7 : tier === 'pro' ? 25 : 999999;

        // Check chain access based on tier
        const chain = req.body.chain;
        if (chain) {
            const normalizedChain = normalizeChainId(chain);
            
            if (!ALLOWED_CHAINS.includes(normalizedChain)) {
                return res.status(400).json({ error: 'Invalid chain' });
            }

            const isAllowed = tier === 'max' ||
                (tier === 'pro' && ['linea', 'arbitrum', 'base'].includes(normalizedChain)) ||
                (tier === 'free' && normalizedChain === 'linea');

            if (!isAllowed) {
                return res.status(403).json({
                    error: 'Chain restricted',
                    message: `The ${chain} chain is not available on the ${tier} tier. Please upgrade.`
                });
            }
        }

        // If Redis is available, use it
        if (redis && isRedisConnected()) {
            // Get current usage from Redis
            const currentUsageStr = await redis.get<string>(windowKey);
            let currentOperations = currentUsageStr ? parseInt(currentUsageStr, 10) : 0;
            
            // Check if we need a new window (check previous window)
            if (currentUsageStr === null) {
                // Check if previous window exists (user just crossed into new 4-hour window)
                const prevWindowKey = `usage:${uid}:${Math.floor((now - FOUR_HOURS_MS) / FOUR_HOURS_MS)}`;
                const prevUsageStr = await redis.get(prevWindowKey);
                if (prevUsageStr) {
                    // Previous window expired, reset
                    currentOperations = 0;
                }
            }
            
            // Check limit
            if (currentOperations >= operationLimit) {
                const resetsAt = new Date(Math.floor(now / FOUR_HOURS_MS) * FOUR_HOURS_MS + FOUR_HOURS_MS);
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: `You have reached your limit of ${operationLimit} analyses per 4 hours.`,
                    limit: operationLimit,
                    used: currentOperations,
                    resetsAt: resetsAt.toISOString(),
                });
            }
            
            // Increment usage counter
            await redis.incr(windowKey);
            // Set TTL to 4 hours + 1 minute buffer
            await redis.expire(windowKey, FOUR_HOURS_SECONDS + 60);
            
            // Attach remaining usage to response
            res.locals.usageRemaining = operationLimit - currentOperations - 1;
            res.locals.tier = tier;
            
            // Update user cache with lastActive timestamp (async, non-blocking)
            const userCacheKey = `auth:user:${uid}`;
            cacheSet(userCacheKey, { tier }, 60).catch(() => {});
            
            console.log(`[USAGE] Redis: ${uid} - ${currentOperations + 1}/${operationLimit}`);
            next();
            return;
        }

        // FALLBACK: Firestore if Redis unavailable
        console.log('[USAGE] Redis unavailable, using Firestore fallback');
        
        const db = getFirestore();
        const userRef = db.collection('users').doc(uid);

        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const userData = userDoc.data();

            tier = (userData?.tier || 'free') as 'free' | 'pro' | 'max';
            operationLimit = tier === 'free' ? 7 : tier === 'pro' ? 25 : Infinity;

            const usageData = userData?.usageWindow || {};
            const windowStart = usageData.windowStart || 0;
            let currentOperations = usageData.operations || 0;
            let currentWindowStart = windowStart;
            
            if (now - windowStart >= FOUR_HOURS_MS) {
                currentOperations = 0;
                currentWindowStart = now;
            }

            if (currentOperations >= operationLimit) {
                const resetTime = new Date(currentWindowStart + FOUR_HOURS_MS);
                return {
                    error: 'Rate limit exceeded',
                    status: 429,
                    message: `Limit reached. Reset at ${resetTime.toLocaleTimeString()}`,
                    limit: operationLimit,
                    used: currentOperations,
                    resetsAt: resetTime.toISOString(),
                };
            }

            transaction.update(userRef, {
                'usageWindow.windowStart': currentWindowStart,
                'usageWindow.operations': currentOperations + 1,
                'lastActive': new Date().toISOString(),
            });

            return {
                success: true,
                tier,
                operationLimit,
                remaining: operationLimit === Infinity ? 9999 : operationLimit - currentOperations - 1,
            };
        });

        if (result.error) {
            return res.status(result.status || 400).json({
                error: result.error,
                message: result.message,
                limit: result.limit,
                used: result.used,
                resetsAt: result.resetsAt,
            });
        }

        res.locals.usageRemaining = result.remaining;
        res.locals.tier = result.tier;

        console.log(`[USAGE] Firestore: ${uid} - ${result.remaining} remaining`);
        next();
    } catch (error) {
        console.error('Usage tracking error:', error);
        next();
    }
}