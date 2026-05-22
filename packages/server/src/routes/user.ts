// ============================================================
// User Routes - Profile, Alchemy API Key & Wallet Management
// ============================================================

import { Router, Response } from 'express';
import { AuthenticatedRequest, requireWallet } from '../middleware/auth.js';
import { requireTwoFactor } from '../middleware/twoFactor.js';
import { getFirestore, getAuth } from '../firebase.js';
import { cacheDel, cacheDelPattern, getRedis, isRedisConnected } from '../utils/redis.js';
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

        // Fetch per-minute usage from Redis
        let usedMinute = 0;
        try {
            if (isRedisConnected()) {
                const redis = getRedis();
                if (redis) {
                    const d = new Date();
                    const minuteKey = `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}${String(d.getUTCHours()).padStart(2,'0')}${String(d.getUTCMinutes()).padStart(2,'0')}`;
                    const minuteStr = await redis.get<string>(`usage:${req.user.uid}:minute:${minuteKey}`);
                    usedMinute = minuteStr ? parseInt(minuteStr, 10) : 0;
                }
            }
        } catch {
            // Redis unavailable, per-minute stays 0
        }

        const tier = userData?.tier || 'free';
        const hasAlchemyKey = !!userData?.alchemyApiKey;

        // Check active subscription for API rate limit purposes
        // Web tier can be 'max' but API rate limits still apply unless paid
        const subscriptionExpiry = userData?.subscriptionExpiry;
        const hasActiveSubscription = typeof subscriptionExpiry === 'number' && subscriptionExpiry > Date.now();
        const isApiUnlimited = (tier === 'max' && hasActiveSubscription) || hasAlchemyKey;

        // Tier-based limits (matching usage middleware — respects payment status)
        let dayLimit: number | 'unlimited' = 1000;  // free
        let minuteLimit: number | 'unlimited' = 100;
        if (isApiUnlimited) {
            dayLimit = 'unlimited';
            minuteLimit = 'unlimited';
        } else if (tier === 'pro' && hasActiveSubscription) {
            dayLimit = 10000;
            minuteLimit = 200;
        }

        let remaining: number | 'unlimited' = 'unlimited';
        if (dayLimit !== 'unlimited') {
            remaining = Math.max(0, dayLimit - usageToday);
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
                limit: dayLimit,
                remaining,
                minuteLimit,
                dayLimit,
                usedMinute,
            },
            bannedAt: userData?.bannedAt || null,
            banReason: userData?.banReason || null,
            createdAt: userData?.createdAt,
            profilePicture: userData?.profilePicture || req.user.photoURL || null,
            photoURL: userData?.profilePicture || req.user.photoURL || null,
            walletAddress: userData?.walletAddress || req.user.walletAddress || null,
            authProvider: userData?.authProvider || 'wallet',
            onboardingCompleted: userData?.onboardingCompleted ?? false
        });

        //Track login (async, don't await)
        const { trackVisitor } = await import('../utils/analytics.js');
        trackVisitor(req.user.uid).catch(err => console.error('Failed to track login:', err));
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Mark onboarding as complete
router.put('/onboarding-complete', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        await userRef.update({ onboardingCompleted: true });
        res.json({ success: true });
    } catch (error) {
        console.error('Onboarding complete error:', error);
        res.status(500).json({ error: 'Failed to update onboarding status' });
    }
});

// Update user profile (only displayName, profilePicture, and emailNotifications)
router.post('/profile', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { displayName, profilePicture, emailNotifications } = req.body;

    // Validate inputs
    if (displayName && displayName.length > 50) {
        return res.status(400).json({ error: 'Display name too long (max 50 chars)' });
    }

    if (emailNotifications !== undefined && typeof emailNotifications !== 'boolean') {
        return res.status(400).json({ error: 'emailNotifications must be a boolean' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);

        const updates: any = {};
        if (displayName) updates.displayName = displayName;
        if (profilePicture !== undefined) updates.profilePicture = profilePicture;
        if (emailNotifications !== undefined) updates.emailNotifications = emailNotifications;

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
            error: 'Failed to save Alchemy API key'
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
            // Count ALL keys (not just active ones) to enforce limit
            const keysSnapshot = await db
                .collection('users').doc(req.user.uid)
                .collection('apiKeys')
                .count()
                .get();
            const currentKeyCount = keysSnapshot.data().count;

            console.log(`[API Keys] Free tier user ${req.user.uid} has ${currentKeyCount} keys, limit is ${FREE_TIER_API_KEY_LIMIT}`);

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

        // ALSO store in top-level apiKeys/{rawKey} for middleware validation
        try {
            const topLevelKeyRef = db.collection('apiKeys').doc(fullKey);
            await topLevelKeyRef.set({
                userId: req.user.uid,
                active: true,
                tier: userTier,
                email: userData?.email || null,
                displayName: userData?.displayName || null,
                profilePicture: userData?.profilePicture || null,
                isVerified: userData?.isVerified || false,
                walletAddress: userData?.walletAddress || null,
                createdAt: now,
            });
            console.log(`[User] API key also stored in top-level apiKeys collection: ${fullKey.substring(0, 15)}...`);
        } catch (topLevelErr) {
            console.error('[User] Failed to store key in top-level apiKeys collection:', topLevelErr);
        }

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

        const keyData = keyDoc.data();
        await keyRef.update({ active: false });

        // Also deactivate the top-level apiKeys/{rawKey} doc for middleware consistency
        if (keyData?.key) {
          try {
            const topLevelRef = db.collection('apiKeys').doc(keyData.key);
            const topLevelDoc = await topLevelRef.get();
            if (topLevelDoc.exists) {
              await topLevelRef.update({ active: false });
              console.log(`[User] Also deactivated top-level key: ${keyData.key.substring(0, 15)}...`);
            }
          } catch (topLevelErr) {
            console.error('[User] Failed to deactivate top-level key:', topLevelErr);
          }
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('[User] deleteApiKey error:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

// ============================================================
// MCP API Key endpoints
// ============================================================

router.post('/mcp-keys', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Key name is required' });
    }
    if (name.length > 100) {
        return res.status(400).json({ error: 'Key name too long (max 100 characters)' });
    }

    try {
        const { generateMcpKey, hashAPIKey } = await import('../models/apiKey.js');
        const db = getFirestore();

        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        const userTier = userData?.tier || 'free';

        // Check MCP key limit (2 for free, 10 for pro, unlimited for enterprise)
        const existingSnapshot = await db.collection('apiKeys')
            .where('userId', '==', req.user.uid)
            .where('keyType', '==', 'mcp')
            .where('isActive', '==', true)
            .get();

        const maxKeys = userTier === 'enterprise' ? Infinity : userTier === 'pro' ? 10 : 2;
        if (existingSnapshot.size >= maxKeys) {
            return res.status(403).json({
                error: `MCP key limit (${maxKeys}) reached for ${userTier} tier.`,
                limit: maxKeys,
                current: existingSnapshot.size,
            });
        }

        const rawKey = generateMcpKey();
        const keyHash = hashAPIKey(rawKey);
        const now = Date.now();

        // Store in users/{uid}/apiKeys subcollection
        const keyData = {
            name: name.trim(),
            key: rawKey,
            type: 'mcp',
            keyType: 'mcp',
            createdAt: now,
            lastUsed: null,
            requests: 0,
            active: true,
            userId: req.user.uid,
            tier: userTier,
        };

        const keysRef = db.collection('users').doc(req.user.uid).collection('apiKeys');
        const docRef = await keysRef.add(keyData);

        // Also store in top-level apiKeys/{rawKey} for middleware validation
        await db.collection('apiKeys').doc(rawKey).set({
            userId: req.user.uid,
            keyHash,
            keyType: 'mcp',
            scopes: ['mcp'],
            tier: userTier,
            isActive: true,
            active: true,
            createdAt: now,
            email: userData?.email || null,
            displayName: userData?.displayName || null,
        });

        res.status(201).json({
            success: true,
            key: {
                id: docRef.id,
                name: name.trim(),
                key: rawKey,
                type: 'mcp',
                createdAt: new Date(now).toISOString(),
                lastUsed: null,
                requests: 0,
                active: true,
            },
        });
    } catch (error: any) {
        console.error('[User] createMcpKey error:', error);
        res.status(500).json({ error: 'Failed to create MCP API key' });
    }
});

router.get('/mcp-keys', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const db = getFirestore();

        let snapshot;
        try {
            snapshot = await db.collection('apiKeys')
                .where('userId', '==', req.user.uid)
                .where('keyType', '==', 'mcp')
                .orderBy('createdAt', 'desc')
                .get();
        } catch {
            // Fallback if composite index doesn't exist
            snapshot = await db.collection('apiKeys')
                .where('userId', '==', req.user.uid)
                .where('keyType', '==', 'mcp')
                .get();
        }

        const keys = snapshot.docs
            .filter(doc => doc.data().active !== false && doc.data().isActive !== false)
            .map(doc => {
                const data = doc.data();
                const docId = doc.id;
                return {
                    id: docId,
                    name: data.displayName || data.name || 'MCP Key',
                    maskedKey: docId.substring(0, 12) + '...' + docId.slice(-4),
                    key: docId,
                    type: 'mcp',
                    createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : '',
                    lastUsed: data.lastUsed ? new Date(data.lastUsed).toISOString() : null,
                    requests: data.requests || 0,
                    active: data.active !== false,
                };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json({ success: true, keys });
    } catch (error: any) {
        console.error('[User] listMcpKeys error:', error);
        // Fallback: check subcollection
        try {
            const userRef = db.collection('users').doc(req.user.uid);
            let keysSnapshot;
            try {
                keysSnapshot = await userRef
                    .collection('apiKeys')
                    .where('type', '==', 'mcp')
                    .orderBy('createdAt', 'desc')
                    .get();
            } catch {
                keysSnapshot = await userRef
                    .collection('apiKeys')
                    .where('type', '==', 'mcp')
                    .get();
            }

            const keys = keysSnapshot.docs
                .filter(doc => doc.data().active !== false)
                .map(doc => {
                    const k = doc.data();
                    const maskedKey = k.key ? k.key.substring(0, 12) + '...' + k.key.slice(-4) : '';
                    return {
                        id: doc.id,
                        name: k.name || 'MCP Key',
                        maskedKey,
                        key: k.key || '',
                        type: 'mcp',
                        createdAt: k.createdAt ? new Date(k.createdAt).toISOString() : '',
                        lastUsed: k.lastUsed ? new Date(k.lastUsed).toISOString() : null,
                        requests: k.requests || 0,
                        active: k.active !== false,
                    };
                })
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            res.json({ success: true, keys });
        } catch (fallbackErr) {
            console.error('[User] listMcpKeys fallback error:', fallbackErr);
            res.status(500).json({ error: 'Failed to load MCP keys' });
        }
    }
});

router.delete('/mcp-keys/:keyId', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const db = getFirestore();
        const topLevelRef = db.collection('apiKeys').doc(req.params.keyId);
        const topLevelDoc = await topLevelRef.get();

        if (topLevelDoc.exists) {
            const data = topLevelDoc.data();
            if (data?.userId !== req.user.uid) {
                return res.status(403).json({ error: 'Not authorized to revoke this key' });
            }
            await topLevelRef.update({ active: false, isActive: false });
        }

        // Also deactivate in subcollection
        const userRef = db.collection('users').doc(req.user.uid);
        const keysSnapshot = await userRef.collection('apiKeys')
            .where('key', '==', req.params.keyId)
            .limit(1)
            .get();

        if (!keysSnapshot.empty) {
            await keysSnapshot.docs[0].ref.update({ active: false });
        }

        res.json({ success: true, message: 'MCP API key revoked' });
    } catch (error: any) {
        console.error('[User] deleteMcpKey error:', error);
        res.status(500).json({ error: 'Failed to revoke MCP key' });
    }
});

// Delete user account - COMPLETE deletion including all related data
router.delete('/account', requireTwoFactor, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.uid;
    console.log('[User] Account deletion requested for:', userId);

    try {
        const { FieldValue } = await import('firebase-admin/firestore');
        const db = getFirestore();
        const userRef = db.collection('users').doc(userId);

        // 1. Delete scanHistory subcollection (user's search/investigate history)
        const scanHistoryRef = db.collection('scanHistory').doc(userId).collection('items');
        const scanHistorySnapshot = await scanHistoryRef.limit(500).get();
        if (scanHistorySnapshot.size > 0) {
            const scanDeletePromises = scanHistorySnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(scanDeletePromises);
            console.log('[User] Deleted scanHistory items:', scanHistorySnapshot.size);
        }
        
        // Delete the scanHistory user document itself
        await db.collection('scanHistory').doc(userId).delete().catch(() => {});

        // 2. Delete user's notifications
        const notificationsSnapshot = await db.collection('notifications')
            .where('userId', '==', userId)
            .limit(500)
            .get();
        if (notificationsSnapshot.size > 0) {
            const notifDeletePromises = notificationsSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(notifDeletePromises);
        }

        // 3. Delete user's API keys subcollection
        const apiKeysSnapshot = await userRef.collection('apiKeys').get();
        if (apiKeysSnapshot.size > 0) {
            const apiKeyDeletePromises = apiKeysSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(apiKeyDeletePromises);
            console.log('[User] Deleted API keys:', apiKeysSnapshot.size);
        }

        // 4. Delete torque_user_stats (points, rank, streak, referrals)
        await db.collection('torque_user_stats').doc(userId).delete().catch(() => {});
        console.log('[User] Deleted torque_user_stats');

        // 5. Delete torque_events (all events tracked by this user)
        const torqueEventsSnapshot = await db.collection('torque_events')
            .where('userId', '==', userId)
            .limit(500)
            .get();
        if (torqueEventsSnapshot.size > 0) {
            const eventDeletePromises = torqueEventsSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(eventDeletePromises);
            console.log('[User] Deleted torque_events:', torqueEventsSnapshot.size);
        }

        // 6. Clean up referral data - remove this user from other users' referredUsers arrays
        const referredByMeSnapshot = await db.collection('users')
            .where('referredBy', '==', userId)
            .limit(500)
            .get();
        const referredByMeCleanup: any[] = [];
        for (const doc of referredByMeSnapshot.docs) {
            referredByMeCleanup.push(doc.ref.update({
                referredBy: FieldValue.delete(),
                referralCount: FieldValue.increment(-1)
            }));
        }
        if (referredByMeCleanup.length > 0) {
            await Promise.all(referredByMeCleanup);
            console.log('[User] Cleaned up referral references for:', referredByMeSnapshot.size, 'users');
        }

        // 7. Delete referral codes associated with this user
        const referralCodesSnapshot = await db.collection('referral_codes')
            .where('userId', '==', userId)
            .limit(10)
            .get();
        for (const doc of referralCodesSnapshot.docs) {
            await doc.ref.delete();
        }
        console.log('[User] Deleted referral codes');

        // 8. Delete user document
        await userRef.delete();
        console.log('[User] Deleted user document');

        // 8b. Clear Redis cache for this user (so fresh signup gets fresh data)
        await cacheDel(`auth:user:${userId}`).catch(() => {});
        await cacheDelPattern(`referral:code:${userId}*`).catch(() => {}); // Clear referral code cache
        console.log('[User] Cleared Redis cache');

        // 9. Delete Firebase Auth account
        try {
            const auth = getAuth();
            await auth.deleteUser(userId);
            console.log('[User] Deleted Firebase Auth account');
        } catch (authError: any) {
            console.error('[User] Error deleting Firebase Auth:', authError.message);
        }

        console.log('[User] Account fully deleted - fresh start ready:', userId);

        res.json({ 
            success: true, 
            message: 'Account deleted successfully - fresh start ready!' 
        });
    } catch (error: any) {
        console.error('[User] deleteAccount error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// ---------------------------------------------------------------------------
// MCP key validation endpoint (used by stdio MCP server via HTTP fallback)
// ---------------------------------------------------------------------------
router.post('/mcp-validate', async (req, res) => {
  const authHeader = req.headers.authorization;
  const bodyKey = req.body?.key;

  const rawKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : bodyKey;
  if (!rawKey || !rawKey.startsWith('ft_')) {
    return res.status(401).json({ error: 'Invalid MCP API key format' });
  }

  try {
    const db = getFirestore();

    // Direct document lookup
    const keyDoc = await db.collection('apiKeys').doc(rawKey).get();

    if (keyDoc.exists) {
      const data = keyDoc.data();
      if (!data) return res.status(401).json({ error: 'Invalid MCP API key' });
      if (data.expiresAt && data.expiresAt < Date.now()) return res.status(401).json({ error: 'MCP API key has expired' });
      if (data.active === false) return res.status(401).json({ error: 'MCP API key has been revoked' });

      const scopes = data.scopes || [];
      if (data.keyType !== 'mcp' && !scopes.includes('mcp')) {
        return res.status(403).json({ error: 'This API key does not have MCP access' });
      }

      // Track usage
      try {
        const { hashAPIKey, incrementAPIKeyUsage } = await import('../models/apiKey.js');
        await incrementAPIKeyUsage(data.userId, rawKey);
      } catch { /* non-blocking */ }

      return res.json({ valid: true, userId: data.userId, tier: data.tier || 'free' });
    }

    // Hash-based fallback
    const { hashAPIKey } = await import('../models/apiKey.js');
    const keyHash = hashAPIKey(rawKey);
    const snapshot = await db.collection('apiKeys')
      .where('isActive', '==', true)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.keyHash === keyHash) {
        if (data.expiresAt && data.expiresAt < Date.now()) return res.status(401).json({ error: 'MCP API key has expired' });
        if (!data.isActive) return res.status(401).json({ error: 'MCP API key has been revoked' });

        const scopes = data.scopes || [];
        if (data.keyType !== 'mcp' && !scopes.includes('mcp')) {
          return res.status(403).json({ error: 'This API key does not have MCP access' });
        }

        try {
          const { incrementAPIKeyUsage } = await import('../models/apiKey.js');
          await incrementAPIKeyUsage(data.userId, rawKey);
        } catch { /* non-blocking */ }

        return res.json({ valid: true, userId: data.userId, tier: data.tier || 'free' });
      }
    }

    return res.status(401).json({ error: 'Invalid MCP API key' });
  } catch (err: any) {
    console.error('[User] mcp-validate error:', err);
    return res.status(500).json({ error: 'Validation failed' });
  }
});

// ============================================================
// MCP Request History
// ============================================================

router.get('/mcp-history', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { getMcpLogs } = await import('../mcp/mcpLogger.js');
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const startAfter = req.query.startAfter ? parseInt(req.query.startAfter as string) : undefined;
    const tool = req.query.tool as string | undefined;

    const result = await getMcpLogs(req.user.uid, { limit, startAfter, tool });
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[User] mcp-history error:', error);
    res.status(500).json({ error: 'Failed to fetch MCP history' });
  }
});

export { router as userRoutes };
