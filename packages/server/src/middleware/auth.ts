// ============================================================
// Authentication Middleware - Verify JWT (Email, Google, Wallet, or Admin)
// ============================================================

import express, { Response, NextFunction } from 'express';
import { getFirestore } from '../firebase.js';
import jwt from 'jsonwebtoken';

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
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

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
            name: userData?.displayName || decoded.name || uid.slice(0, 6) + '...' + uid.slice(-4),
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
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Invalid authentication token' });
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
