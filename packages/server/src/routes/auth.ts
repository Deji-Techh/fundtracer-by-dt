import { Router, Request, Response } from 'express';
import { verifyMessage } from 'ethers';
import jwt from 'jsonwebtoken';
import { getFirestore } from '../firebase.js';

const router = Router();

// SECURITY: JWT_SECRET must be set in environment
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET environment variable is not set');
  console.error('Please set a strong random secret (min 256 bits)');
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// Simple UUID generator for user IDs
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// PoH check function
async function checkPoH(address: string): Promise<boolean> {
  try {
    const response = await fetch(`https://poh-api.linea.build/poh/v2/${address}`);
    // API returns plain text "true" or "false", not JSON
    const text = (await response.text()).trim();
    return text === "true";
  } catch (error) {
    console.error('PoH Check failed:', error);
    return false;
  }
}

// Wallet signature login
router.post('/login-wallet', async (req: Request, res: Response) => {
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
    let displayName = '';

    if (userDoc.exists) {
      const data = userDoc.data();
      tier = data?.tier || 'free';
      expiry = data?.subscriptionExpiry || 0;
      displayName = data?.displayName || '';
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
      displayName,
      authProvider: 'wallet'
    }, JWT_SECRET, { expiresIn: '30d' });

    console.log('[AUTH] Wallet Login SUCCESS');
    res.json({
      token,
      user: {
        address,
        tier,
        isVerified,
        displayName,
        subscriptionExpiry: expiry
      }
    });

  } catch (error) {
    console.error('[AUTH] Login CRITICAL error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Link wallet to existing account
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
      authProvider: 'wallet'
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

// Unlink wallet
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
