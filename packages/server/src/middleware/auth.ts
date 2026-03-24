// ============================================================
// Authentication Middleware - Verify JWT (Email, Google, Wallet, or Admin) or API Keys
// ============================================================

import express, { Response, NextFunction } from 'express';
import { getFirestore } from '../firebase.js';
import jwt from 'jsonwebtoken';
import { incrementAPIKeyUsage } from '../models/apiKey.js';

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
        return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    // If API key middleware already authenticated, skip JWT verification
    if (req.user) {
        return next();
    }

    // Skip JWT verification if this is an API key prefix (not a JWT)
    if (token.startsWith('ft_')) {
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

        // Fetch latest user data from Firestore
        const db = getFirestore();
        let userDoc;
        
        try {
            // Use uid to fetch user data
            userDoc = await db.collection('users').doc(uid).get();
        } catch (dbError) {
            console.error('Firestore fetch failed in authMiddleware:', dbError);
            userDoc = null;
        }

        const userData = userDoc?.exists ? userDoc.data() : null;

        // Check Blacklist (Fail Closed)
        if (userData?.blacklisted === true) {
            console.warn(`[AUTH] Blocked blacklisted user: ${uid}`);
            return res.status(403).json({
                error: 'Account suspended',
                message: 'Your account has been blacklisted. Please contact support.'
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
// API Key Authentication Middleware
// Validates ft_live_xxxx and ft_test_xxxx keys from Firestore
// ============================================================

export async function apiKeyAuthMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers.authorization;
    console.log('[API-KEY-MIDDLEWARE] Auth header:', authHeader ? authHeader.substring(0, 30) + '...' : 'none');
    
    // Check if this is an API key (starts with ft_live_ or ft_test_)
    if (authHeader && authHeader.startsWith('Bearer ft_')) {
        const apiKey = authHeader.split('Bearer ')[1];
        console.log('[API-KEY-MIDDLEWARE] API key detected:', apiKey.substring(0, 20) + '...');
        console.log('[API-KEY-MIDDLEWARE] Full key:', apiKey);
        
        try {
            const db = getFirestore();
            console.log('[API-KEY-MIDDLEWARE] Searching Firestore for key...');
            
            // Search for the API key in all users' apiKeys subcollections
            // This is a simplified approach - in production you might want to index keys
            const usersSnapshot = await db.collection('users').get();
            console.log('[API-KEY-MIDDLEWARE] Total users:', usersSnapshot.size);
            
            for (const userDoc of usersSnapshot.docs) {
                const userId = userDoc.id;
                const apiKeysSnapshot = await db
                    .collection('users')
                    .doc(userId)
                    .collection('apiKeys')
                    .where('key', '==', apiKey)
                    .limit(1)
                    .get();
                
                if (!apiKeysSnapshot.empty) {
                    const keyData = apiKeysSnapshot.docs[0].data();
                    const userData = userDoc.data();
                    
                    // Check if key is active (not expired/revoked)
                    if (keyData.active === false) {
                        return res.status(401).json({ 
                            error: 'API key has been revoked',
                            code: 'KEY_REVOKED'
                        });
                    }
                    
                    // Populate request with user data
                    req.user = {
                        uid: userId,
                        email: userData?.email || null,
                        name: userData?.displayName || userId.slice(0, 8),
                        photoURL: userData?.profilePicture || null,
                        type: 'user'
                    };
                    
                    // Set tier and other data
                    res.locals.tier = userData?.tier || 'max'; // API key users get max tier
                    res.locals.isVerified = userData?.isVerified || false;
                    res.locals.authProvider = 'api_key';
                    res.locals.walletAddress = userData?.walletAddress || null;
                    res.locals.apiKeyId = apiKeysSnapshot.docs[0].id;
                    res.locals.apiKeyOwnerId = userId;

                    const apiKeyDocId = apiKeysSnapshot.docs[0].id;
                    incrementAPIKeyUsage(userId, apiKeyDocId).catch(err =>
                        console.error('[API-KEY] Failed to track usage:', err)
                    );
                    
                    console.log(`[API-KEY] Authenticated: ${userId} (key: ${apiKey.slice(0, 15)}...)`);
                    next();
                    return;
                }
            }
            
            // API key not found in any user's collection
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
