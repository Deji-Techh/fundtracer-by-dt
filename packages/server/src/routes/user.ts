// ============================================================
// User Routes - Profile, Alchemy API Key & Wallet Management
// ============================================================

import { Router, Response } from 'express';
import { AuthenticatedRequest, requireWallet } from '../middleware/auth.js';
import { getFirestore } from '../firebase.js';
import axios from 'axios';

const router = Router();

// Get user profile and usage info
router.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        let userData = userDoc.data();

        // Check PoH verification status - use JWT token value as source of truth
        // The auth middleware already verified this, so we trust res.locals.isVerified
        const isVerified = res.locals.isVerified === true;
        
        // If verified in JWT but not in Firestore, update Firestore
        if (isVerified && userData && !userData.isVerified) {
            await userRef.update({ isVerified: true });
            userData.isVerified = true;
        }

        // Create user document if first time
        if (!userDoc.exists) {
            userData = {
                email: req.user.email,
                displayName: req.user.name,
                tier: 'free',
                isVerified: false,
                blacklisted: false,
                analysisCount: 0,
                createdAt: Date.now(),
                lastActive: Date.now(),
            };
            await userRef.set(userData);
        } else {
            // Update last active
            await userRef.update({ lastActive: Date.now() });
        }

        const today = new Date().toISOString().split('T')[0];
        const usageToday = userData?.dailyUsage?.[today] || 0;
        const freeLimit = parseInt(process.env.FREE_DAILY_LIMIT || '7', 10);
        const proLimit = 25;
        const hasAlchemyKey = !!userData?.alchemyApiKey;

        const tier = userData?.tier || 'free';
        const isUnlimited = tier === 'max' || hasAlchemyKey;

        let limit: number | 'unlimited' = freeLimit;
        if (isUnlimited) {
            limit = 'unlimited';
        } else if (tier === 'pro') {
            limit = proLimit;
        }

        let remaining: number | 'unlimited' = 'unlimited';
        if (limit !== 'unlimited') {
            remaining = Math.max(0, limit - usageToday);
        }

        res.json({
            uid: req.user.uid,
            email: req.user.email,
            username: userData?.displayName || req.user.name || req.user.email?.split('@')[0],
            displayName: userData?.displayName || req.user.name,
            name: userData?.displayName || req.user.name,
            isVerified: !!userData?.isVerified,
            tier,
            hasAlchemyApiKey: hasAlchemyKey,
            hasCustomApiKey: hasAlchemyKey,
            usage: {
                today: usageToday,
                limit,
                remaining,
            },
            createdAt: userData?.createdAt,
            profilePicture: userData?.profilePicture || req.user.photoURL || null,
            photoURL: userData?.profilePicture || req.user.photoURL || null,
            walletAddress: userData?.walletAddress || req.user.walletAddress || null,
            authProvider: userData?.authProvider || 'wallet'
        });

        //Track login (async, don't await)
        const { trackVisitor } = await import('../utils/analytics.js');
        trackVisitor(req.user.uid).catch(err => console.error('Failed to track login:', err));
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update user profile (only displayName and profilePicture, email is read-only from Google)
router.post('/profile', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { displayName, profilePicture } = req.body;

    // Validate inputs
    if (displayName && displayName.length > 50) {
        return res.status(400).json({ error: 'Display name too long (max 50 chars)' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);

        const updates: any = {};
        if (displayName) updates.displayName = displayName;
        if (profilePicture !== undefined) updates.profilePicture = profilePicture;

        // Only update if there are changes
        if (Object.keys(updates).length > 0) {
            await userRef.set(updates, { merge: true });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                uid: req.user.uid,
                ...updates
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// NEW: Get wallet info
router.get('/wallet', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        res.json({
            walletAddress: userData?.walletAddress || null,
            isVerified: userData?.isVerified || false,
            linkedAt: userData?.walletLinkedAt || null
        });
    } catch (error) {
        console.error('Wallet fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch wallet info' });
    }
});

// NEW: Update wallet info (after linking via /auth/link-wallet)
router.post('/wallet', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { walletAddress, isVerified } = req.body;

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);

        await userRef.set({
            walletAddress: walletAddress?.toLowerCase(),
            isVerified: isVerified || false,
            walletLinkedAt: Date.now()
        }, { merge: true });

        res.json({
            success: true,
            walletAddress,
            isVerified
        });
    } catch (error) {
        console.error('Wallet update error:', error);
        res.status(500).json({ error: 'Failed to update wallet' });
    }
});

// NEW: Unlink wallet (soft delete - just removes the link)
router.delete('/wallet', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const { FieldValue } = await import('firebase-admin/firestore');

        await userRef.update({
            walletAddress: FieldValue.delete(),
            isVerified: false,
            walletUnlinkedAt: Date.now()
        });

        res.json({ success: true, message: 'Wallet unlinked successfully' });
    } catch (error) {
        console.error('Wallet unlink error:', error);
        res.status(500).json({ error: 'Failed to unlink wallet' });
    }
});

// Save Alchemy API key
router.post('/alchemy-api-key', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { apiKey } = req.body;

    if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({ error: 'API key is required' });
    }

    // Alchemy keys are typically 32 characters
    if (apiKey.length < 20 || apiKey.length > 50) {
        return res.status(400).json({ error: 'Invalid Alchemy API key format' });
    }

    try {
        // Validate Alchemy API key by making a test RPC request
        const isValid = await validateAlchemyApiKey(apiKey);

        if (!isValid) {
            return res.status(400).json({
                error: 'Invalid Alchemy API key',
                message: 'The API key could not be verified. Please ensure you entered a valid Alchemy API key.'
            });
        }

        // Save API key
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);

        await userRef.set({
            alchemyApiKey: apiKey,
            alchemyKeyAddedAt: new Date().toISOString(),
        }, { merge: true });

        res.json({
            success: true,
            message: 'Alchemy API key saved successfully. Your queries will now be much faster!'
        });
    } catch (error: any) {
        console.error('Alchemy API key save error:', error);
        res.status(500).json({
            error: 'Failed to save Alchemy API key',
            details: error.message
        });
    }
});

// Remove Alchemy API key
router.delete('/alchemy-api-key', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const { FieldValue } = await import('firebase-admin/firestore');

        await userRef.update({
            alchemyApiKey: FieldValue.delete(),
            alchemyKeyAddedAt: FieldValue.delete(),
        });

        res.json({ success: true, message: 'Alchemy API key removed' });
    } catch (error) {
        console.error('Alchemy API key delete error:', error);
        res.status(500).json({ error: 'Failed to remove Alchemy API key' });
    }
});

// Validate Alchemy API key by making a test RPC request
async function validateAlchemyApiKey(apiKey: string): Promise<boolean> {
    try {
        const response = await axios.post(
            `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
            {
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_blockNumber',
                params: [],
            },
            { timeout: 10000 }
        );

        // Valid response has a result field with the block number
        return !!response.data.result && !response.data.error;
    } catch (error) {
        console.error('Alchemy API key validation error:', error);
        return false;
    }
}

// Increment daily usage counter
router.post('/usage/increment', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        const today = new Date().toISOString().split('T')[0];
        const currentUsage = userData?.dailyUsage?.[today] || 0;
        
        // Increment usage
        await userRef.set({
            dailyUsage: {
                [today]: currentUsage + 1
            }
        }, { merge: true });

        res.json({
            success: true,
            today,
            usage: currentUsage + 1
        });
    } catch (error) {
        console.error('Usage increment error:', error);
        res.status(500).json({ error: 'Failed to increment usage' });
    }
});

const FREE_TIER_API_KEY_LIMIT = 2;

router.get('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.json({ success: true, keys: [] });
        }

        const keysSnapshot = await userRef
            .collection('apiKeys')
            .orderBy('createdAt', 'desc')
            .get();

        const keys = keysSnapshot.docs
            .filter(doc => doc.data().active !== false)
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name || 'Unnamed Key',
                    key: data.key || '',
                    type: data.type || 'test',
                    createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
                    lastUsed: data.lastUsed ? new Date(data.lastUsed).toISOString() : null,
                    requests: data.requests || 0,
                    active: data.active !== false,
                };
            });

        res.json({ success: true, keys });
    } catch (error: any) {
        console.error('[User] listApiKeys error:', error);
        res.status(500).json({ error: 'Failed to load API keys' });
    }
});

router.post('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name, type = 'test' } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Key name is required' });
    }

    if (name.length > 100) {
        return res.status(400).json({ error: 'Key name too long (max 100 characters)' });
    }

    const keyType = type === 'live' ? 'live' : 'test';
    const keyPrefix = keyType === 'live' ? 'ft_live' : 'ft_test';
    const randomPart = Math.random().toString(36).substring(2, 30);
    const suffix = Math.random().toString(36).substring(2, 6);
    const fullKey = `${keyPrefix}_${randomPart}_${suffix}`;

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        const userTier = userData?.tier || 'free';

        if (userTier === 'free') {
            const keysSnapshot = await db
                .collection('users').doc(req.user.uid)
                .collection('apiKeys')
                .where('active', '==', true)
                .count()
                .get();
            const currentKeyCount = keysSnapshot.data().count;

            if (currentKeyCount >= FREE_TIER_API_KEY_LIMIT) {
                return res.status(403).json({
                    error: `Free tier is limited to ${FREE_TIER_API_KEY_LIMIT} API keys. Upgrade to create more.`,
                    limit: FREE_TIER_API_KEY_LIMIT,
                    current: currentKeyCount,
                    upgradeUrl: '/pricing',
                });
            }
        }

        const keysRef = db.collection('users').doc(req.user.uid).collection('apiKeys');
        const now = Date.now();
        const dailyReset = new Date();
        dailyReset.setHours(24, 0, 0, 0);

        const keyData = {
            name: name.trim(),
            key: fullKey,
            type: keyType,
            createdAt: now,
            lastUsed: null,
            requests: 0,
            active: true,
            userId: req.user.uid,
            tier: userTier,
            dailyUsage: 0,
            dailyUsageReset: dailyReset.getTime(),
        };

        const docRef = await keysRef.add(keyData);

        res.status(201).json({
            success: true,
            key: {
                id: docRef.id,
                name: name.trim(),
                key: fullKey,
                type: keyType,
                createdAt: new Date(now),
                lastUsed: null,
                requests: 0,
                active: true,
            },
        });
    } catch (error: any) {
        console.error('[User] createApiKey error:', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
});

router.delete('/api-keys/:keyId', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const db = getFirestore();
        const keyRef = db.collection('users').doc(req.user.uid)
            .collection('apiKeys').doc(req.params.keyId);
        const keyDoc = await keyRef.get();

        if (!keyDoc.exists) {
            return res.status(404).json({ error: 'API key not found' });
        }

        await keyRef.update({ active: false });

        res.json({ success: true });
    } catch (error: any) {
        console.error('[User] deleteApiKey error:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

export { router as userRoutes };
