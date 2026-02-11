// ============================================================
// Usage Tracking Middleware - Enforce 4-Hour Window Limits
// ============================================================

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { getFirestore, admin } from '../firebase.js';
const { FieldValue } = admin.firestore;

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

// Allowed chains for validation
const ALLOWED_CHAINS = ['ethereum', 'linea', 'arbitrum', 'base', 'optimism', 'polygon', 'bsc'];

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
        const now = Date.now();

        // Use Firestore transaction to prevent race conditions
        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const userData = userDoc.data();

            // Determine user tier and limit
            const tier = (userData?.tier || 'free') as 'free' | 'pro' | 'max';
            
            // Check chain access based on tier
            const chain = req.body.chain;
            if (chain) {
                // Validate chain is in allowed list
                if (!ALLOWED_CHAINS.includes(chain)) {
                    return { error: 'Invalid chain', status: 400 };
                }

                const isAllowed = tier === 'max' ||
                    (tier === 'pro' && ['linea', 'arbitrum', 'base'].includes(chain)) ||
                    (tier === 'free' && chain === 'linea');

                if (!isAllowed) {
                    return { 
                        error: 'Chain restricted', 
                        status: 403,
                        message: `The ${chain} chain is not available on the ${tier} tier. Please upgrade to access this chain.`
                    };
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
                return {
                    error: 'Rate limit exceeded',
                    status: 429,
                    message: `You have reached your limit of ${operationLimit} analyses per 4 hours on the ${tier} tier. Upgrade to increase your limit or wait until ${resetTime.toLocaleTimeString()}.`,
                    limit: operationLimit,
                    used: currentOperations,
                    resetsAt: resetTime.toISOString(),
                };
            }

            // Atomically increment usage counter using FieldValue
            transaction.update(userRef, {
                'usageWindow.windowStart': currentWindowStart,
                'usageWindow.operations': FieldValue.increment(1),
                'lastActive': new Date().toISOString(),
            });

            return {
                success: true,
                tier,
                operationLimit,
                remaining: operationLimit === Infinity ? 9999 : operationLimit - currentOperations - 1,
            };
        });

        // Handle transaction result
        if (result.error) {
            return res.status(result.status || 400).json({
                error: result.error,
                message: result.message,
                limit: result.limit,
                used: result.used,
                resetsAt: result.resetsAt,
            });
        }

        // Attach remaining usage to response
        res.locals.usageRemaining = result.remaining;
        res.locals.tier = result.tier;

        next();
    } catch (error) {
        console.error('Usage tracking error:', error);
        // Allow request to proceed if usage tracking fails
        next();
    }
}
