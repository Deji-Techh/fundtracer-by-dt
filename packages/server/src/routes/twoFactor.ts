/**
 * Two-Factor Authentication Routes
 * TOTP-based 2FA with authenticator apps
 */

import { Router, Response } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getFirestore } from '../firebase.js';

const router = Router();

interface TwoFactorSetup {
    secret: string;
    qrCode: string;
    manualEntry: string;
    backupCodes: string[];
}

// Generate 2FA setup for user
router.post('/2fa/setup', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        // Check if 2FA is already enabled
        if (userData?.twoFactorEnabled) {
            return res.status(400).json({ error: '2FA is already enabled' });
        }

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `FundTracer (${userData?.email || req.user.email || req.user.uid})`,
            issuer: 'FundTracer',
            length: 32
        });

        // Generate QR code as data URL
        const qrCode = await QRCode.toDataURL(secret.otpauthURL || '');

        // Store temporary secret (not enabled yet)
        await userRef.update({
            twoFactorPending: {
                secret: secret.base32,
                createdAt: Date.now()
            }
        });

        res.json({
            success: true,
            setup: {
                secret: secret.base32,
                qrCode: qrCode,
                manualEntry: secret.base32
            }
        });
    } catch (error) {
        console.error('[2FA] Setup error:', error);
        res.status(500).json({ error: 'Failed to setup 2FA' });
    }
});

// Verify and enable 2FA
router.post('/2fa/verify', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { code } = req.body;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Verification code is required' });
    }

    if (code.length !== 6) {
        return res.status(400).json({ error: 'Code must be 6 digits' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        if (!userData?.twoFactorPending?.secret) {
            return res.status(400).json({ error: 'No pending 2FA setup. Please start setup first.' });
        }

        // Verify the code
        const verified = speakeasy.totp.verify({
            secret: userData.twoFactorPending.secret,
            encoding: 'base32',
            token: code,
            window: 1 // Allow 1 step tolerance
        });

        if (!verified) {
            return res.status(400).json({ 
                error: 'Invalid code',
                message: 'The code you entered is incorrect. Please try again.'
            });
        }

        // Generate backup codes
        const backupCodes: string[] = [];
        for (let i = 0; i < 8; i++) {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            backupCodes.push(code);
        }

        // Enable 2FA
        await userRef.update({
            twoFactorEnabled: true,
            twoFactorSecret: userData.twoFactorPending.secret,
            twoFactorBackupCodes: backupCodes,
            twoFactorPending: null,
            twoFactorEnabledAt: Date.now()
        });

        res.json({
            success: true,
            message: '2FA enabled successfully',
            backupCodes: backupCodes
        });
    } catch (error) {
        console.error('[2FA] Verify error:', error);
        res.status(500).json({ error: 'Failed to verify 2FA' });
    }
});

// Disable 2FA
router.post('/2fa/disable', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { code } = req.body;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Verification code is required' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        if (!userData?.twoFactorEnabled) {
            return res.status(400).json({ error: '2FA is not enabled' });
        }

        // Verify the code first
        const verified = speakeasy.totp.verify({
            secret: userData.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 1
        });

        // Also accept backup codes
        const isBackupCode = userData.twoFactorBackupCodes?.includes(code.toUpperCase());

        if (!verified && !isBackupCode) {
            return res.status(400).json({ 
                error: 'Invalid code',
                message: 'The code or backup code you entered is incorrect.'
            });
        }

        // Remove used backup code if applicable
        let updates: any = {
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorEnabledAt: null
        };

        if (isBackupCode) {
            const newBackupCodes = userData.twoFactorBackupCodes.filter((c: string) => c !== code.toUpperCase());
            updates.twoFactorBackupCodes = newBackupCodes;
        }

        await userRef.update(updates);

        res.json({
            success: true,
            message: '2FA disabled successfully'
        });
    } catch (error) {
        console.error('[2FA] Disable error:', error);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
});

// Get 2FA status
router.get('/2fa/status', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        res.json({
            enabled: userData?.twoFactorEnabled || false,
            enabledAt: userData?.twoFactorEnabledAt || null,
            hasBackupCodes: (userData?.twoFactorBackupCodes?.length || 0) > 0
        });
    } catch (error) {
        console.error('[2FA] Status error:', error);
        res.status(500).json({ error: 'Failed to get 2FA status' });
    }
});

// Regenerate backup codes
router.post('/2fa/backup-codes/regenerate', async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { code } = req.body;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Verification code is required' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        if (!userData?.twoFactorEnabled) {
            return res.status(400).json({ error: '2FA is not enabled' });
        }

        // Verify the code
        const verified = speakeasy.totp.verify({
            secret: userData.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 1
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid code' });
        }

        // Generate new backup codes
        const backupCodes: string[] = [];
        for (let i = 0; i < 8; i++) {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            backupCodes.push(code);
        }

        await userRef.update({
            twoFactorBackupCodes: backupCodes
        });

        res.json({
            success: true,
            backupCodes: backupCodes
        });
    } catch (error) {
        console.error('[2FA] Regenerate backup codes error:', error);
        res.status(500).json({ error: 'Failed to regenerate backup codes' });
    }
});

export { router as twoFactorRoutes };
