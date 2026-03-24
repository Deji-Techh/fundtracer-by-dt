/**
 * Two-Factor Authentication Middleware
 * Requires 2FA verification for sensitive operations
 */

import { Response, NextFunction } from 'express';
import speakeasy from 'speakeasy';
import { AuthenticatedRequest } from './auth.js';
import { getFirestore } from '../firebase.js';

export async function requireTwoFactor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { code } = req.body;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ 
            error: '2FA verification required',
            message: 'Please provide your 2FA code or backup code'
        });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        if (!userData?.twoFactorEnabled) {
            // No 2FA enabled, skip verification
            return next();
        }

        // Verify the 2FA code
        const verified = speakeasy.totp.verify({
            secret: userData.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 1
        });

        // Check backup codes
        const isBackupCode = userData.twoFactorBackupCodes?.includes(code.toUpperCase());

        if (!verified && !isBackupCode) {
            return res.status(401).json({ 
                error: 'Invalid 2FA code',
                message: 'The code you entered is incorrect'
            });
        }

        // Remove used backup code
        if (isBackupCode) {
            const newBackupCodes = userData.twoFactorBackupCodes.filter((c: string) => c !== code.toUpperCase());
            await userRef.update({ twoFactorBackupCodes: newBackupCodes });
        }

        // Mark as 2FA verified for this request
        res.locals.twoFactorVerified = true;
        next();
    } catch (error) {
        console.error('[2FA Middleware] Error:', error);
        return res.status(500).json({ error: '2FA verification failed' });
    }
}

// Optional 2FA - doesn't fail if not provided, but validates if provided
export async function optionalTwoFactor(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    if (!req.user) {
        return next();
    }

    const code = req.body.twoFactorCode || req.query.twoFactorCode;

    if (!code) {
        // No code provided, skip verification
        return next();
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        if (!userData?.twoFactorEnabled) {
            // No 2FA enabled, skip
            return next();
        }

        // Verify the code
        const verified = speakeasy.totp.verify({
            secret: userData.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 1
        });

        const isBackupCode = userData.twoFactorBackupCodes?.includes(code.toUpperCase());

        if (!verified && !isBackupCode) {
            return res.status(401).json({ 
                error: 'Invalid 2FA code'
            });
        }

        // Remove used backup code
        if (isBackupCode) {
            const newBackupCodes = userData.twoFactorBackupCodes.filter((c: string) => c !== code.toUpperCase());
            await userRef.update({ twoFactorBackupCodes: newBackupCodes });
        }

        res.locals.twoFactorVerified = true;
        next();
    } catch (error) {
        console.error('[2FA Optional Middleware] Error:', error);
        next();
    }
}
