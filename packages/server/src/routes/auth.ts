import { Router, Request, Response } from 'express';
import { verifyMessage } from 'ethers';
import jwt from 'jsonwebtoken';
import { getFirestore, getAuth } from '../firebase.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

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

// NEW: Google Sign-In endpoint
router.post('/google-login', async (req: Request, res: Response) => {
    const { idToken } = req.body;
    console.log('[AUTH] Google Login Request');

    if (!idToken) {
        console.error('[AUTH] Missing ID token');
        return res.status(400).json({ error: 'Missing ID token' });
    }

    try {
        // Verify Google ID token
        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const { uid, email, name, picture } = decodedToken;

        console.log(`[AUTH] Google User: ${email}`);

        // Get or create user in Firestore
        const db = getFirestore();
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        let tier = 'free';
        let expiry = 0;
        let walletAddress = null;
        let isVerified = false;

        if (userDoc.exists) {
            const data = userDoc.data();
            tier = data?.tier || 'free';
            expiry = data?.subscriptionExpiry || 0;
            walletAddress = data?.walletAddress || null;
            isVerified = data?.isVerified || false;
        }

        // Check if subscription expired
        if (expiry > 0 && Date.now() > expiry) {
            tier = 'free';
        }

        await userRef.set({
            uid,
            email,
            displayName: name || email?.split('@')[0],
            photoURL: picture || null,
            tier,
            subscriptionExpiry: expiry,
            walletAddress,
            isVerified,
            lastLogin: Date.now(),
            authProvider: 'google',
            createdAt: userDoc.exists ? undefined : Date.now()
        }, { merge: true });

        // Generate JWT
        const token = jwt.sign({
            uid,
            email,
            tier,
            isVerified,
            walletAddress,
            authProvider: 'google'
        }, JWT_SECRET, { expiresIn: '7d' });

        console.log('[AUTH] Google Login SUCCESS');
        res.json({
            token,
            user: {
                uid,
                email,
                displayName: name || email?.split('@')[0],
                photoURL: picture,
                tier,
                isVerified,
                walletAddress,
                subscriptionExpiry: expiry
            }
        });

    } catch (error) {
        console.error('[AUTH] Google Login error:', error);
        res.status(401).json({ error: 'Invalid Google token' });
    }
});

// NEW: Link wallet to Google account
router.post('/link-wallet', async (req: Request, res: Response) => {
    const { idToken, address, signature, message } = req.body;
    console.log(`[AUTH] Link Wallet Request: ${address}`);

    if (!idToken || !address || !signature || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Verify Google token
        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

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

        console.log(`[AUTH] Wallet linked: ${address} to user ${uid}`);
        res.json({
            success: true,
            walletAddress: address,
            isVerified
        });

    } catch (error) {
        console.error('[AUTH] Link wallet error:', error);
        res.status(500).json({ error: 'Failed to link wallet' });
    }
});

// NEW: Unlink wallet from Google account
router.post('/unlink-wallet', async (req: Request, res: Response) => {
    const { idToken } = req.body;
    console.log('[AUTH] Unlink Wallet Request');

    if (!idToken) {
        return res.status(400).json({ error: 'Missing ID token' });
    }

    try {
        // Verify Google token
        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Remove wallet from user
        const db = getFirestore();
        const userRef = db.collection('users').doc(uid);
        
        await userRef.update({
            walletAddress: null,
            isVerified: false,
            walletUnlinkedAt: Date.now()
        });

        console.log(`[AUTH] Wallet unlinked for user ${uid}`);
        res.json({ success: true });

    } catch (error) {
        console.error('[AUTH] Unlink wallet error:', error);
        res.status(500).json({ error: 'Failed to unlink wallet' });
    }
});

export { router as authRoutes };
