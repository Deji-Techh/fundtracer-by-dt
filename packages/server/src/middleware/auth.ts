// ============================================================
// Authentication Middleware - Verify JWT (Wallet or Google)
// ============================================================

import express, { Response, NextFunction } from 'express';
import { getFirestore } from '../firebase.js';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends express.Request {
    user?: {
        uid: string;
        email?: string;
        name?: string;
        walletAddress?: string;
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
        
        // Check if this is a wallet-based or Google-based auth
        const isGoogleAuth = decoded.authProvider === 'google';
        const uid = isGoogleAuth ? decoded.uid : decoded.address?.toLowerCase();
        
        if (!uid) {
            return res.status(401).json({ error: 'Invalid token structure' });
        }

        // Fetch latest user data from Firestore
        const db = getFirestore();
        let userDoc;
        
        try {
            // For Google auth, use uid directly; for wallet auth, use address
            const docId = isGoogleAuth ? uid : uid;
            userDoc = await db.collection('users').doc(docId).get();
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
            walletAddress: userData?.walletAddress || decoded.walletAddress || null
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
