import { Router, Request, Response } from 'express';
import { verifyMessage } from 'ethers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getFirestore, getAuth } from '../firebase.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
const SALT_ROUNDS = 12;

// PoH check function
async function checkPoH(address: string): Promise<boolean> {
    try {
        const response = await fetch(`https://poh-api.linea.build/poh/v2/${address}`);
        const data = await response.json() as { poh: boolean };
        return data.poh === true;
    } catch (error) {
        console.error('PoH Check failed:', error);
        return false;
    }
}

// NEW: Email/Password Registration Step 1 - Create Firebase user
router.post('/register/init', async (req: Request, res: Response) => {
    const { email } = req.body;
    console.log(`[AUTH] Registration init: ${email}`);

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const auth = getAuth();
        
        // Check if email already exists
        try {
            await auth.getUserByEmail(email);
            return res.status(409).json({ error: 'Email already registered' });
        } catch (err) {
            // User doesn't exist, continue
        }

        // Create Firebase user (disabled until verified)
        const userRecord = await auth.createUser({
            email,
            emailVerified: false,
            disabled: true
        });

        // Store pending registration in Firestore
        const db = getFirestore();
        await db.collection('pendingRegistrations').doc(userRecord.uid).set({
            email,
            createdAt: Date.now(),
            status: 'pending_verification'
        });

        // Generate email verification link
        const verificationLink = await auth.generateEmailVerificationLink(email, {
            url: `${req.headers.origin || 'https://fundtracer.xyz'}/verify-email?uid=${userRecord.uid}`
        });

        // TODO: Send email with verificationLink
        // For now, return the link in response (dev mode)
        console.log(`[AUTH] Verification link: ${verificationLink}`);

        res.json({
            success: true,
            message: 'Verification email sent',
            uid: userRecord.uid,
            // In production, don't return this:
            verificationLink: process.env.NODE_ENV === 'development' ? verificationLink : undefined
        });

    } catch (error: any) {
        console.error('[AUTH] Registration init error:', error);
        res.status(500).json({ error: 'Failed to initiate registration' });
    }
});

// NEW: Email/Password Registration Step 2 - Complete registration after email verified
router.post('/register/complete', async (req: Request, res: Response) => {
    const { uid, username, password, keepSignedIn } = req.body;
    console.log(`[AUTH] Registration complete: ${username}`);

    if (!uid || !username || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate username (alphanumeric, 3-20 chars)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ 
            error: 'Username must be 3-20 characters, alphanumeric and underscores only' 
        });
    }

    // Validate password (min 8 chars)
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
        const auth = getAuth();
        const db = getFirestore();

        // Get Firebase user
        const userRecord = await auth.getUser(uid);
        
        if (!userRecord.emailVerified) {
            return res.status(400).json({ error: 'Email not verified' });
        }

        // Check if username already exists
        const usernameDoc = await db.collection('users').where('username', '==', username).get();
        if (!usernameDoc.empty) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Enable Firebase user
        await auth.updateUser(uid, {
            disabled: false
        });

        // Create user in Firestore
        await db.collection('users').doc(uid).set({
            uid,
            email: userRecord.email,
            username,
            passwordHash,
            tier: 'free',
            isVerified: false,
            walletAddress: null,
            authProvider: 'email',
            createdAt: Date.now(),
            lastLogin: Date.now(),
            emailVerified: true
        });

        // Clean up pending registration
        await db.collection('pendingRegistrations').doc(uid).delete();

        // Generate JWT
        const expiresIn = keepSignedIn ? '30d' : '24h';
        const token = jwt.sign({
            uid,
            email: userRecord.email,
            username,
            tier: 'free',
            isVerified: false,
            walletAddress: null,
            authProvider: 'email'
        }, JWT_SECRET, { expiresIn });

        res.json({
            token,
            user: {
                uid,
                email: userRecord.email,
                username,
                tier: 'free',
                isVerified: false,
                walletAddress: null
            }
        });

    } catch (error: any) {
        console.error('[AUTH] Registration complete error:', error);
        res.status(500).json({ error: 'Failed to complete registration' });
    }
});

// NEW: Username/Password Login
router.post('/login/email', async (req: Request, res: Response) => {
    const { username, password, keepSignedIn } = req.body;
    console.log(`[AUTH] Email login attempt: ${username}`);

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const db = getFirestore();
        const auth = getAuth();

        // Find user by username
        const userQuery = await db.collection('users').where('username', '==', username).limit(1).get();
        
        if (userQuery.empty) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const userData = userQuery.docs[0].data();
        
        // Verify password
        const passwordValid = await bcrypt.compare(password, userData.passwordHash);
        
        if (!passwordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Update last login
        await db.collection('users').doc(userData.uid).update({
            lastLogin: Date.now()
        });

        // Generate JWT
        const expiresIn = keepSignedIn ? '30d' : '24h';
        const token = jwt.sign({
            uid: userData.uid,
            email: userData.email,
            username: userData.username,
            tier: userData.tier || 'free',
            isVerified: userData.isVerified || false,
            walletAddress: userData.walletAddress || null,
            authProvider: 'email'
        }, JWT_SECRET, { expiresIn });

        res.json({
            token,
            user: {
                uid: userData.uid,
                email: userData.email,
                username: userData.username,
                tier: userData.tier || 'free',
                isVerified: userData.isVerified || false,
                walletAddress: userData.walletAddress || null
            }
        });

    } catch (error: any) {
        console.error('[AUTH] Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// NEW: Password Reset Request
router.post('/reset-password', async (req: Request, res: Response) => {
    const { email } = req.body;
    console.log(`[AUTH] Password reset request: ${email}`);

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const auth = getAuth();
        
        // Generate password reset link
        const resetLink = await auth.generatePasswordResetLink(email, {
            url: `${req.headers.origin || 'https://fundtracer.xyz'}/login`
        });

        // TODO: Send email with resetLink
        console.log(`[AUTH] Reset link: ${resetLink}`);

        res.json({
            success: true,
            message: 'Password reset email sent',
            // In production, don't return this:
            resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
        });

    } catch (error: any) {
        // Don't reveal if email exists
        res.json({
            success: true,
            message: 'If an account exists, a reset email has been sent'
        });
    }
});

// NEW: Check username availability
router.get('/check-username/:username', async (req: Request, res: Response) => {
    const { username } = req.params;
    
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.json({ available: false, reason: 'Invalid username format' });
    }

    try {
        const db = getFirestore();
        const userQuery = await db.collection('users').where('username', '==', username).limit(1).get();
        
        res.json({ available: userQuery.empty });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check username' });
    }
});

// Legacy wallet signature login
router.post('/login', async (req: Request, res: Response) => {
    const { address, signature, message } = req.body;
    console.log(`[AUTH] Wallet Login Request: ${address}`);

    if (!address || !signature || !message) {
        console.error('[AUTH] Missing credentials');
        return res.status(400).json({ error: 'Missing credentials' });
    }

    try {
        // Verify signature
        const recoveredAddress = verifyMessage(message, signature);
        console.log(`[AUTH] Recovered: ${recoveredAddress}`);

        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            console.error(`[AUTH] Sig Mismatch: ${recoveredAddress} vs ${address}`);
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Check Linea PoH
        const isVerified = await checkPoH(address);
        console.log(`[AUTH] Verified Human: ${isVerified}`);

        // Get or create user
        const db = getFirestore();
        const userRef = db.collection('users').doc(address.toLowerCase());
        const userDoc = await userRef.get();

        let tier = 'free';
        let expiry = 0;

        if (userDoc.exists) {
            const data = userDoc.data();
            tier = data?.tier || 'free';
            expiry = data?.subscriptionExpiry || 0;
        }

        // Check if subscription expired
        if (expiry > 0 && Date.now() > expiry) {
            tier = 'free';
        }

        await userRef.set({
            address: address.toLowerCase(),
            isVerified,
            tier,
            subscriptionExpiry: expiry,
            lastLogin: Date.now(),
            authProvider: 'wallet'
        }, { merge: true });

        // Generate JWT
        const token = jwt.sign({
            uid: address.toLowerCase(),
            address: address.toLowerCase(),
            tier,
            isVerified,
            authProvider: 'wallet'
        }, JWT_SECRET, { expiresIn: '7d' });

        console.log('[AUTH] Wallet Login SUCCESS');
        res.json({
            token,
            user: {
                address,
                tier,
                isVerified,
                subscriptionExpiry: expiry
            }
        });

    } catch (error) {
        console.error('[AUTH] Login CRITICAL error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// NEW: Link wallet to existing account
router.post('/link-wallet', async (req: Request, res: Response) => {
    const { uid, address, signature, message } = req.body;
    console.log(`[AUTH] Link Wallet: ${uid} -> ${address}`);

    if (!uid || !address || !signature || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Verify wallet signature
        const recoveredAddress = verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Check PoH
        const isVerified = await checkPoH(address);

        // Update user with wallet
        const db = getFirestore();
        const userRef = db.collection('users').doc(uid);
        
        await userRef.set({
            walletAddress: address.toLowerCase(),
            isVerified,
            walletLinkedAt: Date.now()
        }, { merge: true });

        // Generate new JWT with wallet info
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        const token = jwt.sign({
            uid,
            email: userData?.email,
            username: userData?.username,
            tier: userData?.tier || 'free',
            isVerified,
            walletAddress: address.toLowerCase(),
            authProvider: 'email'
        }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            token,
            walletAddress: address,
            isVerified
        });

    } catch (error: any) {
        console.error('[AUTH] Link wallet error:', error);
        res.status(500).json({ error: 'Failed to link wallet' });
    }
});

// NEW: Unlink wallet
router.post('/unlink-wallet', async (req: Request, res: Response) => {
    const { uid } = req.body;
    console.log(`[AUTH] Unlink Wallet: ${uid}`);

    if (!uid) {
        return res.status(400).json({ error: 'User ID required' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(uid);
        const { FieldValue } = await import('firebase-admin/firestore');

        await userRef.update({
            walletAddress: FieldValue.delete(),
            isVerified: false,
            walletUnlinkedAt: Date.now()
        });

        res.json({ success: true });

    } catch (error: any) {
        console.error('[AUTH] Unlink wallet error:', error);
        res.status(500).json({ error: 'Failed to unlink wallet' });
    }
});

export { router as authRoutes };
