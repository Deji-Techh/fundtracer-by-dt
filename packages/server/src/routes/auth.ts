import { Router, Request, Response } from 'express';
import { verifyMessage } from 'ethers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getFirestore } from '../firebase.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
const SALT_ROUNDS = 12;

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
    const data = await response.json() as { poh: boolean };
    return data.poh === true;
  } catch (error) {
    console.error('PoH Check failed:', error);
    return false;
  }
}

// NEW: Simple Registration
router.post('/register', async (req: Request, res: Response) => {
  const { username, email, password, keepSignedIn } = req.body;
  console.log(`[AUTH] Registration: ${username} (${email})`);

  // Validation
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const db = getFirestore();

    // Check if username already exists
    const usernameQuery = await db.collection('users').where('username', '==', username.toLowerCase()).limit(1).get();
    if (!usernameQuery.empty) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Check if email already exists
    const emailQuery = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
    if (!emailQuery.empty) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate user ID
    const uid = generateUUID();

    // Create user in Firestore
    await db.collection('users').doc(uid).set({
      uid,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      tier: 'free',
      isVerified: false,
      walletAddress: null,
      authProvider: 'email',
      createdAt: Date.now(),
      lastLogin: Date.now(),
      dailyUsage: {}
    });

    // Generate JWT
    const expiresIn = keepSignedIn ? '30d' : '24h';
    const token = jwt.sign({
      uid,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      tier: 'free',
      isVerified: false,
      walletAddress: null,
      authProvider: 'email'
    }, JWT_SECRET, { expiresIn });

    console.log(`[AUTH] Registration successful: ${username}`);

    res.json({
      token,
      user: {
        uid,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        tier: 'free',
        isVerified: false,
        walletAddress: null,
        usage: {
          today: 0,
          limit: parseInt(process.env.FREE_DAILY_LIMIT || '7', 10),
          remaining: parseInt(process.env.FREE_DAILY_LIMIT || '7', 10)
        }
      }
    });

  } catch (error: any) {
    console.error('[AUTH] Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// NEW: Simple Login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password, keepSignedIn } = req.body;
  console.log(`[AUTH] Login attempt: ${username}`);

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const db = getFirestore();

    // Find user by username
    const userQuery = await db.collection('users').where('username', '==', username.toLowerCase()).limit(1).get();
    
    if (userQuery.empty) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

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

    console.log(`[AUTH] Login successful: ${username}`);

    // Calculate usage
    const today = new Date().toISOString().split('T')[0];
    const usageToday = userData?.dailyUsage?.[today] || 0;
    const freeLimit = parseInt(process.env.FREE_DAILY_LIMIT || '7', 10);
    const proLimit = 25;
    const hasAlchemyKey = !!userData?.alchemyApiKey;
    const tier = userData?.tier || 'free';
    const isUnlimited = tier === 'max' || hasAlchemyKey;
    
    let limit: number | 'unlimited' = freeLimit;
    if (isUnlimited) {
      limit = 'unlimited';
    } else if (tier === 'pro') {
      limit = proLimit;
    }
    
    let remaining: number | 'unlimited' = 'unlimited';
    if (limit !== 'unlimited') {
      remaining = Math.max(0, limit - usageToday);
    }

    res.json({
      token,
      user: {
        uid: userData.uid,
        email: userData.email,
        username: userData.username,
        tier: userData.tier || 'free',
        isVerified: userData.isVerified || false,
        walletAddress: userData.walletAddress || null,
        usage: {
          today: usageToday,
          limit,
          remaining
        }
      }
    });

  } catch (error: any) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Check username availability
router.get('/check-username/:username', async (req: Request, res: Response) => {
  const { username } = req.params;
  
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.json({ available: false, reason: 'Invalid username format' });
  }

  try {
    const db = getFirestore();
    const userQuery = await db.collection('users').where('username', '==', username.toLowerCase()).limit(1).get();
    
    res.json({ available: userQuery.empty });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check username' });
  }
});

// Legacy wallet signature login (keep for backward compatibility)
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
