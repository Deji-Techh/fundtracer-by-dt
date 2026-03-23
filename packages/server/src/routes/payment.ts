import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { getFirestore } from '../firebase.js';
import * as lemonSqueezy from '@lemonsqueezy/lemonsqueezy.js';
import crypto from 'crypto';

const router = Router();

const LEMON_SQUEEZY_STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID;
const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const LEMON_SQUEEZY_WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
const PRO_VARIANT_ID = process.env.LEMON_SQUEEZY_PRO_VARIANT_ID;
const MAX_VARIANT_ID = process.env.LEMON_SQUEEZY_MAX_VARIANT_ID;

if (LEMON_SQUEEZY_API_KEY) {
    lemonSqueezy.lemonSqueezySetup({ apiKey: LEMON_SQUEEZY_API_KEY });
}

const TIER_PRICES: Record<string, string> = {
    pro: PRO_VARIANT_ID || '',
    max: MAX_VARIANT_ID || ''
};

function verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!LEMON_SQUEEZY_WEBHOOK_SECRET) return false;
    const hmac = crypto.createHmac('sha256', LEMON_SQUEEZY_WEBHOOK_SECRET);
    const digest = hmac.update(payload).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch {
        return false;
    }
}

router.post('/create-checkout', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.uid;
        const userEmail = req.user?.email;
        const { tier } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }

        if (!['pro', 'max'].includes(tier)) {
            return res.status(400).json({ success: false, error: 'Invalid tier' });
        }

        if (!LEMON_SQUEEZY_API_KEY || !LEMON_SQUEEZY_STORE_ID) {
            return res.status(500).json({
                success: false,
                error: 'Payment provider not configured. Please contact support.'
            });
        }

        const variantId = TIER_PRICES[tier];
        if (!variantId) {
            return res.status(500).json({
                success: false,
                error: 'Plan not configured. Please contact support.'
            });
        }

        const frontendUrl = process.env.FRONTEND_URL || 'https://fundtracer.xyz';

        const result = await lemonSqueezy.createCheckout(LEMON_SQUEEZY_STORE_ID, variantId, {
            checkoutOptions: {
                embed: false,
                media: true,
                logo: true
            },
            checkoutData: {
                email: userEmail || undefined,
                custom: {
                    user_id: userId,
                    user_email: userEmail || '',
                    tier
                }
            },
            productOptions: {
                redirectUrl: `${frontendUrl}/app-evm?subscription=success`,
                receiptButtonText: 'Go to Dashboard',
                receiptThankYouNote: 'Thank you for subscribing to FundTracer! Your premium tier is now active.'
            }
        });

        if (result.error) {
            console.error('[Payment] LemonSqueezy error:', result.error);
            return res.status(500).json({ success: false, error: 'Failed to create checkout' });
        }

        const checkoutData = result.data as any;
        const checkoutUrl = checkoutData?.attributes?.url;
        const checkoutId = checkoutData?.id;

        if (!checkoutUrl) {
            return res.status(500).json({ success: false, error: 'Failed to get checkout URL' });
        }

        res.json({
            success: true,
            checkoutUrl,
            checkoutId
        });

    } catch (error: any) {
        console.error('[Payment] Create checkout error:', error);
        res.status(500).json({ success: false, error: 'Failed to create checkout session' });
    }
});

router.post('/webhook', async (req: Request, res: Response) => {
    const signature = req.headers['x-signature'] as string;

    if (!signature) {
        return res.status(400).json({ error: 'Missing signature' });
    }

    try {
        const rawBody = (req as any).rawBody as string;
        if (!rawBody) {
            console.error('[Payment] Raw body not found on request');
            return res.status(400).json({ error: 'Missing raw body' });
        }

        if (!verifyWebhookSignature(rawBody, signature)) {
            console.warn('[Payment] Invalid webhook signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.meta && payload.meta['event_name'];

        console.log(`[Payment] Webhook received: ${eventName}`);

        if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
            const subscription = payload.data && payload.data.attributes;
            const customData = payload.meta && payload.meta['custom_data'];
            const userId = customData && customData['user_id'];
            const tier = customData && customData['tier'];
            const status = subscription && subscription.status;

            if (status === 'active' && userId && tier) {
                const db = getFirestore();
                const renewsAt = subscription['renews_at'] ? new Date(subscription['renews_at']) : null;

                await db.collection('users').doc(userId).set({
                    tier,
                    tierStatus: status,
                    tierExpiresAt: renewsAt ? renewsAt.toISOString() : null,
                    tierUpdatedAt: new Date().toISOString(),
                    subscriptionId: payload.data && payload.data.id,
                    lemonSqueezySubscriptionId: payload.data && payload.data.id
                }, { merge: true });

                console.log(`[Payment] Subscription activated for user ${userId}, tier: ${tier}`);
            }

            if (status === 'cancelled' && userId) {
                const db = getFirestore();
                await db.collection('users').doc(userId).set({
                    tierStatus: 'cancelled',
                    tierCancelledAt: new Date().toISOString()
                }, { merge: true });

                console.log(`[Payment] Subscription cancelled for user ${userId}`);
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('[Payment] Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

router.get('/subscription-status', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }

        const db = getFirestore();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        res.json({
            success: true,
            tier: userData?.tier || 'free',
            tierStatus: userData?.tierStatus || null,
            tierExpiresAt: userData?.tierExpiresAt || null,
            hasActiveSubscription: userData?.tierStatus === 'active'
        });
    } catch (error) {
        console.error('[Payment] Subscription status error:', error);
        res.status(500).json({ success: false, error: 'Failed to get subscription status' });
    }
});

export default router;
