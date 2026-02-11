// ============================================================
// Usage Tracking Middleware - Enforce 4-Hour Window Limits
// ============================================================

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { getFirestore } from '../firebase.js';

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

export async function usageMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();

        const now = Date.now();
        const userData = userDoc.data();

        // Determine user tier and limit
        const tier = (userData?.tier || 'free') as 'free' | 'pro' | 'max';

        // Check chain access based on tier
        const chain = req.body.chain;
        if (chain) {
            const isAllowed = tier === 'max' ||
                (tier === 'pro' && ['linea', 'arbitrum', 'base'].includes(chain)) ||
                (tier === 'free' && chain === 'linea');

            if (!isAllowed) {
                return res.status(403).json({
                    error: 'Chain restricted',
                    message: `The ${chain} chain is not available on the ${tier} tier. Please upgrade to access this chain.`
                });
            }
        }

        let operationLimit = 7; // Default Free: 7 per 4 hours
        if (tier === 'pro') operationLimit = 25; // Pro: 25 per 4 hours
        if (tier === 'max') operationLimit = Infinity; // Max: Unlimited

        // Check if user has their own API key (treat as unlimited)
        if (userData?.customApiKey) {
            operationLimit = Infinity;
        }

        // Get usage tracking data
        const usageData = userData?.usageWindow || {};
        const windowStart = usageData.windowStart || 0;
        const operationsInWindow = usageData.operations || 0;

        // Check if we need to reset the window (4 hours passed)
        let currentOperations = operationsInWindow;
        let currentWindowStart = windowStart;
        
        if (now - windowStart >= FOUR_HOURS_MS) {
            // Reset window
            currentOperations = 0;
            currentWindowStart = now;
        }

        // Enforce Limit
        if (currentOperations >= operationLimit) {
            const resetTime = new Date(currentWindowStart + FOUR_HOURS_MS);
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: `You have reached your limit of ${operationLimit} analyses per 4 hours on the ${tier} tier. Upgrade to increase your limit or wait until ${resetTime.toLocaleTimeString()}.`,
                limit: operationLimit,
                used: currentOperations,
                resetsAt: resetTime.toISOString(),
            });
        }

        // Increment usage counter
        await userRef.set({
            usageWindow: {
                windowStart: currentWindowStart,
                operations: currentOperations + 1,
            },
            lastActive: new Date().toISOString(),
        }, { merge: true });

        // Attach remaining usage to response (if unlimited, return -1 or a large number)
        res.locals.usageRemaining = operationLimit === Infinity ? 9999 : operationLimit - currentOperations - 1;

        next();
    } catch (error) {
        console.error('Usage tracking error:', error);
        // Allow request to proceed if usage tracking fails
        next();
    }
}
