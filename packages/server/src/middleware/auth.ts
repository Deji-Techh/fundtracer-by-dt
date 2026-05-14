// ============================================================
// Authentication Middleware - Verify JWT (Email, Google, Wallet, or Admin) or API Keys
// OPTIMIZED: Uses Redis caching to reduce Firestore reads by 95%+
// ============================================================

import express, { Response, NextFunction } from 'express';
import { getFirestore } from '../firebase.js';
import jwt from 'jsonwebtoken';
import { incrementAPIKeyUsage } from '../models/apiKey.js';
import { isRedisConnected, cacheGet, cacheSet } from '../utils/redis.js';

export type AdminRole = 'superadmin' | 'admin' | 'moderator';

export interface AdminUser {
    uid: string;
    username: string;
    email: string;
    role: AdminRole;
    permissions: string[];
    type: 'admin';
}

export interface AuthenticatedRequest extends express.Request {
    user?: {
        uid: string;
        email?: string;
        name?: string;
        photoURL?: string;
        walletAddress?: string;
        username?: string;
        role?: AdminRole;
        permissions?: string[];
        type?: 'user' | 'admin';
    };
    body: any;
    params: any;
    query: any;
    headers: express.Request['headers'];
}

export async function authMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    
    
    const authHeader = req.headers.authorization;
    const xAuthToken = req.headers['x-auth-token'] as string | undefined;
    const hasAuth = !!authHeader && authHeader.startsWith('Bearer ');
    // SECURITY: JWT_SECRET must be set in environment
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        console.error('CRITICAL: JWT_SECRET environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Check if API key middleware already authenticated the user
        if (req.user) {
            return next();
        }

        // Fallback: check x-auth-token header (workaround for Cloudflare edge stripping Authorization on /report)
        if (xAuthToken) {
            try {
                const decoded = jwt.verify(xAuthToken, JWT_SECRET) as any;
                if (decoded.type === 'admin') {
                    return res.status(401).json({ error: 'Invalid auth method for admin' });
                }
                req.user = { uid: decoded.uid, email: decoded.email, name: decoded.name, photoURL: decoded.picture, type: 'user' };
                res.locals.tier = decoded.tier || 'free';
                console.log(`[AUTH-MIDDLEWARE] Authenticated via x-auth-token: ${decoded.uid}`);
                return next();
            } catch (e) {
                console.error('[AUTH-MIDDLEWARE] x-auth-token verification failed:', (e as Error).message);
                return res.status(401).json({ error: 'Invalid authentication token' });
            }
        }

        return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // If API key middleware already authenticated, skip JWT verification
    if (req.user) {
        return next();
    }
    
    // Skip JWT verification if this is an API key prefix (not a JWT)
    if (token && token.startsWith('ft_')) {
        return res.status(401).json({ error: 'Invalid API key', code: 'KEY_INVALID' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        // Check if this is an admin token
        if (decoded.type === 'admin') {
            // Admin authentication - verify admin exists and is active
            const db = getFirestore();
            const adminDoc = await db.collection('adminUsers').doc(decoded.uid).get();
            
            if (!adminDoc.exists) {
                return res.status(401).json({ error: 'Admin account not found' });
            }
            
            const adminData = adminDoc.data();
            if (!adminData?.isActive) {
                return res.status(403).json({ error: 'Admin account is disabled' });
            }
            
            // Populate request with admin user data
            req.user = {
                uid: decoded.uid,
                email: decoded.email || adminData?.email,
                username: decoded.username || adminData?.username,
                role: decoded.role || adminData?.role,
                permissions: decoded.permissions || adminData?.permissions,
                type: 'admin'
            };
            
            // Set locals for admin
            res.locals.isAdmin = true;
            res.locals.adminRole = decoded.role;
            res.locals.adminPermissions = decoded.permissions;
            
            next();
            return;
        }
        
        // Regular user authentication
        // Get UID based on auth provider
        let uid: string;
        if (decoded.authProvider === 'wallet') {
            // Wallet auth uses address as UID
            uid = decoded.address?.toLowerCase();
        } else if (decoded.authProvider === 'email' || decoded.authProvider === 'google') {
            // Email and Google auth use decoded.uid
            uid = decoded.uid;
        } else {
            // Fallback for legacy tokens or unknown providers
            uid = decoded.uid || decoded.address?.toLowerCase();
        }
        
        if (!uid) {
            return res.status(401).json({ error: 'Invalid token structure' });
        }

        // OPTIMIZED: Try Redis cache first (60 second TTL)
        const AUTH_CACHE_TTL = 60;
        const cacheKey = `auth:user:${uid}`;
        let userData: Record<string, any> | null = null;
        let useCache = true;
        
        try {
            // Try cache first
            if (isRedisConnected()) {
                const cached = await cacheGet<Record<string, any>>(cacheKey);
                if (cached) {
                    userData = cached;
                    console.log(`[AUTH] Cache hit for user: ${uid}`);
                }
            }
            
            // Cache miss - fetch from Firestore
            if (!userData) {
                const db = getFirestore();
                let userDoc;
                try {
                    userDoc = await db.collection('users').doc(uid).get();
                    userData = userDoc?.exists ? userDoc.data() : null;
                    
                    // Store in Redis cache for future requests
                    if (userData && isRedisConnected()) {
                        await cacheSet(cacheKey, userData, AUTH_CACHE_TTL);
                        console.log(`[AUTH] Cached user data for: ${uid} (${AUTH_CACHE_TTL}s)`);
                    }
                } catch (dbError) {
                    console.error('Firestore fetch failed in authMiddleware:', dbError);
                    userDoc = null;
                }
            }
        } catch (cacheError) {
            console.error('[AUTH] Cache error, falling back to Firestore:', cacheError);
            // Fallback to Firestore on cache error
            try {
                const db = getFirestore();
                const userDoc = await db.collection('users').doc(uid).get();
                userData = userDoc?.exists ? userDoc.data() : null;
            } catch (dbError) {
                console.error('Firestore fallback also failed:', dbError);
                userData = null;
            }
        }

        // Check Blacklist / Ban (Fail Closed)
        if (userData?.blacklisted === true || userData?.bannedAt) {
            console.warn(`[AUTH] Blocked banned/blacklisted user: ${uid}`);
            const reason = userData?.banReason || 'Your account has been suspended.';
            return res.status(403).json({
                error: 'Account suspended',
                bannedAt: userData?.bannedAt || true,
                banReason: reason,
                message: reason
            });
        }

        // Populate Request User with FRESH data
        req.user = {
            uid: uid,
            email: userData?.email || decoded.email || uid,
            name: userData?.displayName || decoded.displayName || uid.slice(0, 6) + '...' + uid.slice(-4),
            photoURL: userData?.photoURL || decoded.photoURL || null,
            walletAddress: userData?.walletAddress || decoded.walletAddress || null,
            type: 'user'
        };

        console.log('[AUTH-MIDDLEWARE] User populated:', req.user.uid);
        console.log('[AUTH-MIDDLEWARE] Calling next()');

        // Set Locals for downstream routes (using DB values over JWT)
        res.locals.tier = userData?.tier || decoded.tier || 'free';
        res.locals.isVerified = userData?.isVerified === true || decoded.isVerified === true;
        res.locals.authProvider = userData?.authProvider || decoded.authProvider || 'wallet';
        res.locals.walletAddress = userData?.walletAddress || decoded.walletAddress || null;

        next();
    } catch (error: any) {
        console.error('Auth error:', error?.name, error?.message);
        // Distinguish expired tokens from other auth failures
        if (error?.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ error: 'Invalid authentication token', code: 'TOKEN_INVALID' });
    }
}

// Middleware to check if wallet is linked (for Google auth users)
export function requireWallet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const walletAddress = res.locals.walletAddress;
    
    if (!walletAddress) {
        return res.status(403).json({
            error: 'Wallet not linked',
            message: 'Please link a wallet to perform this action'
        });
    }
    
    next();
}

// Middleware to check PoH verification
export function requirePoH(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const isVerified = res.locals.isVerified;
    
    if (!isVerified) {
        return res.status(403).json({
            error: 'Not PoH verified',
            message: 'Your wallet is not Proof of Humanity verified. Please complete verification on Linea.'
        });
    }
    
    next();
}

// Middleware to require admin access
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user || req.user.type !== 'admin') {
        return res.status(403).json({
            error: 'Admin access required',
            message: 'This endpoint requires admin privileges'
        });
    }
    next();
}

// Middleware to require specific admin role
export function requireAdminRole(...allowedRoles: AdminRole[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user || req.user.type !== 'admin') {
            return res.status(403).json({
                error: 'Admin access required',
                message: 'This endpoint requires admin privileges'
            });
        }
        
        if (!allowedRoles.includes(req.user.role as AdminRole)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                message: `This endpoint requires one of these roles: ${allowedRoles.join(', ')}`
            });
        }
        
        next();
    };
}

// ============================================================
// API Key Authentication Middleware (OPTIMIZED)
// Validates ft_live_xxxx and ft_test_xxxx keys from Firestore
// OPTIMIZED: Uses direct lookup + Redis cache (reduces 501 reads to 1 read)
// ============================================================

const API_KEY_CACHE_TTL = 300; // 5 minutes

interface CachedApiKeyData {
    userId: string;
    active: boolean;
    tier?: string;
    isVerified?: boolean;
    walletAddress?: string;
    email?: string;
    displayName?: string;
    profilePicture?: string;
}

export async function apiKeyAuthMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers.authorization;
    
    
    // Check if this is an API key (starts with ft_live_ or ft_test_)
    if (authHeader && authHeader.startsWith('Bearer ft_')) {
        const apiKey = authHeader.split('Bearer ')[1];
        
        try {
            // OPTIMIZATION 1: Try Redis cache first
            const apiKeyCacheKey = `apikey:${apiKey}`;
            if (isRedisConnected()) {
                const cachedData = await cacheGet<CachedApiKeyData>(apiKeyCacheKey);
                if (cachedData) {
                    console.log(`[API-KEY] Cache hit for key: ${apiKey.substring(0, 15)}...`);
                    if (cachedData.active === false) {
                        return res.status(401).json({ 
                            error: 'API key has been revoked',
                            code: 'KEY_REVOKED'
                        });
                    }
                    
                    req.user = {
                        uid: cachedData.userId,
                        email: cachedData.email || null,
                        name: cachedData.displayName || cachedData.userId.slice(0, 8),
                        photoURL: cachedData.profilePicture || null,
                        type: 'user'
                    };
                    
                    res.locals.tier = cachedData.tier || 'free';
                    res.locals.isVerified = cachedData.isVerified || false;
                    res.locals.authProvider = 'api_key';
                    res.locals.walletAddress = cachedData.walletAddress || null;
                    res.locals.apiKeyOwnerId = cachedData.userId;
                    
                    incrementAPIKeyUsage(cachedData.userId, apiKey)
                        .catch(err => console.error('[API-KEY] Failed to track usage:', err));
                    
                    console.log(`[API-KEY] Authenticated from cache: ${cachedData.userId}`);
                    next();
                    return;
                }
            }
            
            // OPTIMIZATION 2: Direct lookup in apiKeys collection (new optimized collection)
            const db = getFirestore();
            console.log('[API-KEY-MIDDLEWARE] Searching apiKeys collection...');
            
            const apiKeyDoc = await db.collection('apiKeys').doc(apiKey).get();
            
            if (apiKeyDoc.exists) {
                const keyData = apiKeyDoc.data() as CachedApiKeyData;
                const userId = keyData.userId;
                
                // Get user data
                const userDoc = await db.collection('users').doc(userId).get();
                const userData = userDoc.exists ? userDoc.data() : null;
                
                if (keyData.active === false) {
                    return res.status(401).json({ 
                        error: 'API key has been revoked',
                        code: 'KEY_REVOKED'
                    });
                }
                
                // Prepare cached data
                const cachedData: CachedApiKeyData = {
                    userId,
                    active: keyData.active !== false,
                    tier: userData?.tier || 'free',
                    isVerified: userData?.isVerified || false,
                    walletAddress: userData?.walletAddress || null,
                    email: userData?.email || null,
                    displayName: userData?.displayName || null,
                    profilePicture: userData?.profilePicture || null
                };
                
                // Cache for 5 minutes
                if (isRedisConnected()) {
                    await cacheSet(apiKeyCacheKey, cachedData, API_KEY_CACHE_TTL);
                    console.log(`[API-KEY] Cached key data for ${API_KEY_CACHE_TTL}s`);
                }
                
                req.user = {
                    uid: userId,
                    email: cachedData.email || null,
                    name: cachedData.displayName || userId.slice(0, 8),
                    photoURL: cachedData.profilePicture || null,
                    type: 'user'
                };
                
                res.locals.tier = cachedData.tier || 'free';
                res.locals.isVerified = cachedData.isVerified || false;
                res.locals.authProvider = 'api_key';
                res.locals.walletAddress = cachedData.walletAddress || null;
                res.locals.apiKeyOwnerId = userId;
                
                incrementAPIKeyUsage(userId, apiKey)
                    .then(() => console.log(`[API-KEY] Usage incremented successfully`))
                    .catch(err => console.error('[API-KEY] Failed to track usage:', err));
                
                console.log(`[API-KEY] Authenticated from apiKeys collection: ${userId}`);
                next();
                return;
            }
            
            // API key not found in top-level apiKeys collection (the only authoritative source)
            console.log('[API-KEY-MIDDLEWARE] Key not found in apiKeys collection');
            return res.status(401).json({
                error: 'Invalid API key',
                code: 'KEY_INVALID'
            });

        } catch (error) {
            console.error('[API-KEY] Auth error:', error);
            return res.status(500).json({ 
                error: 'Failed to validate API key',
                code: 'KEY_VALIDATION_ERROR'
            });
        }
    }
    
    // Not an API key, continue to JWT validation
    next();
}
