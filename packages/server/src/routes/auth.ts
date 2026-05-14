import { Router, Request, Response } from 'express';
import { verifyMessage } from 'ethers';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { getFirestore } from '../firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { sendEmail, buildWelcomeEmail } from '../services/EmailService.js';
import { torqueService } from '../services/TorqueService.js';
import { processReferral, getReferralCodeOwner, ensureUserHasReferralCode } from '../utils/referral.js';

const router = Router();

// OAuth Configuration - these should be in environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://api.fundtracer.xyz/api/auth/google/callback';

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const TWITTER_REDIRECT_URI = process.env.TWITTER_REDIRECT_URI || 'https://www.fundtracer.xyz/api/auth/twitter/callback';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.fundtracer.xyz';

// OAuth Start endpoints - redirect to provider
router.get('/google/start', (req: Request, res: Response) => {
  console.log('[AUTH] Google start - GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET', 'GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('[AUTH] Google OAuth not configured');
    return res.status(500).json({ error: 'Google OAuth not configured' });
  }
  
  // Support redirect URL for post-login redirect
  const redirectUrl = (req.query.redirect as string) || '/auth';
  // Include ref param in state for referral tracking
  const refParam = req.query.ref as string;
  const state = jwt.sign({ timestamp: Date.now(), redirectUrl, ref: refParam || null }, getJwtSecret(), { expiresIn: '10m' });
  
  const scopes = ['openid', 'email', 'profile'].join(' ');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${state}` +
    `&access_type=offline` +
    `&prompt=consent`;
  
  console.log('[AUTH] Redirecting to Google, redirect to:', redirectUrl);
  res.redirect(authUrl);
});

router.get('/twitter/start', (req: Request, res: Response) => {
  console.log('[AUTH] Twitter start - TWITTER_CLIENT_ID:', TWITTER_CLIENT_ID ? 'SET' : 'NOT SET');

  if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
    console.error('[AUTH] Twitter OAuth not configured');
    return res.status(500).json({ error: 'Twitter OAuth not configured' });
  }

  // Generate PKCE code_verifier and store in state JWT
  const crypto = require('crypto');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  // Include ref param for referral tracking
  const refParam = req.query.ref as string;
  const state = jwt.sign({
    timestamp: Date.now(),
    ref: refParam || null,
    codeVerifier // Store verifier in state JWT (encrypted with JWT_SECRET)
  }, getJwtSecret(), { expiresIn: '10m' });

  const scopes = 'tweet.read users.read';
  const authUrl = `https://twitter.com/i/oauth2/authorize?` +
    `client_id=${TWITTER_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(TWITTER_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${state}` +
    `&code_challenge_method=S256` +
    `&code_challenge=${codeChallenge}`;
  console.log('[AUTH] Redirecting to Twitter');

  res.redirect(authUrl);
});

// OAuth Callback endpoints - handle redirect from provider
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;
  
  // Default redirect after OAuth
  let redirectUrl = `${FRONTEND_URL}/auth`;
  
  // Try to extract redirect URL and ref from state
  let refParam: string | null = null;
  if (state) {
    try {
      const decoded = jwt.verify(state as string, getJwtSecret()) as { redirectUrl?: string; ref?: string | null };
      if (decoded.redirectUrl) {
        redirectUrl = `${FRONTEND_URL}${decoded.redirectUrl}`;
      }
      refParam = decoded.ref || null;
    } catch (e) {
      console.log('[AUTH] Could not decode state redirect:', e);
    }
  }
  
  console.log('[AUTH] Google callback received:', { 
    hasCode: !!code, 
    hasState: !!state, 
    error,
    redirectUri: GOOGLE_REDIRECT_URI,
    redirectUrl 
  });
  
  if (error) {
    console.error('[AUTH] Google OAuth error:', error);
    return res.redirect(`${redirectUrl}?error=oauth_failed`);
  }
  
  if (!code || !state) {
    console.error('[AUTH] Missing code or state');
    return res.redirect(`${redirectUrl}?error=missing_params`);
  }
  
  try {
    let decodedState: any;
    try {
      decodedState = jwt.verify(state as string, getJwtSecret());
    } catch (e) {
      console.error('[AUTH] Invalid state:', e);
      return res.redirect(`${redirectUrl}?error=invalid_state`);
    }
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('[AUTH] Google OAuth not configured');
      return res.redirect(`${redirectUrl}?error=oauth_not_configured`);
    }
    
    console.log('[AUTH] Exchanging code for tokens, redirect_uri:', GOOGLE_REDIRECT_URI);
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });
    
    const tokens = await tokenResponse.json();
    console.log('[AUTH] Token response status:', tokenResponse.status);
    
    if (!tokens.access_token) {
      console.error('[AUTH] Google token exchange failed:', JSON.stringify(tokens).slice(0, 500));
      return res.redirect(`${redirectUrl}?error=token_exchange_failed`);
    }
    
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    
    const googleUser = await userResponse.json();
    console.log('[AUTH] Google user info:', JSON.stringify(googleUser).slice(0, 300));
    
    const uid = googleUser.id;
    const email = googleUser.email;
    const name = googleUser.name;
    const picture = googleUser.picture;
    
    if (!uid) {
      console.error('[AUTH] No uid from Google:', googleUser);
      return res.redirect(`${redirectUrl}?error=no_uid`);
    }
    
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    const isNewUser = !userDoc.exists;
    
    let tier = 'max';
    let expiry = 0;
    let walletAddress = '';
    
    if (userDoc.exists) {
      const data = userDoc.data();
      // Everyone gets max tier now - no more tier restrictions
      tier = 'max';
      expiry = data?.subscriptionExpiry || 0;
      walletAddress = data?.walletAddress || '';
    }
    
    if (expiry > 0 && Date.now() > expiry) {
      tier = 'max';
    }
    
    await userRef.set({
      uid,
      email,
      displayName: name,
      profilePicture: picture,
      tier,
      subscriptionExpiry: expiry,
      lastLogin: Date.now(),
      authProvider: 'google',
      onboardingCompleted: isNewUser ? false : userDoc.data()?.onboardingCompleted ?? false
    }, { merge: true });
    
    console.log(`[AUTH] User saved to Firestore: ${email} (${uid})`);

    // Initialize Torque stats for new users immediately on signup
    if (isNewUser) {
      try {
        const userStatsRef = db.collection('torque_user_stats').doc(uid);
        await userStatsRef.set({
          userId: uid,
          points: 0,
          walletsAnalyzed: 0,
          streakDays: 0,
          sybilCount: 0,
          referralCount: 0,
          signupDate: Date.now(),
          totalEvents: 0,
          lastEventType: null,
          lastEventAt: null,
          createdAt: new Date()
        });
        console.log(`[AUTH] Torque stats initialized for new user: ${uid}`);
      } catch (statsErr) {
        console.error('[AUTH] Failed to initialize torque stats:', statsErr);
      }
    }

    // Credit referrer if ref param exists and user isn't already referred
    // Supports both new referral codes (FUNDxxx) and legacy user IDs
    if (refParam && refParam !== uid) {
      const userData = userDoc.exists ? userDoc.data() : null;
      const existingReferredBy = userData?.referredBy;
      
      // Only credit if not already referred (or is new user)
      if (!existingReferredBy || isNewUser) {
        let referrerId: string | null = null;
        
        // Check if it's a new-style referral code (e.g., FUNDABC) or legacy user ID
        if (refParam.startsWith('FUND')) {
          referrerId = await getReferralCodeOwner(refParam);
          console.log(`[AUTH] Referral code look-up: ${refParam} -> ${referrerId}`);
        } else {
          // Legacy: assume it's a user ID, verify the user exists
          const referrerRef = db.collection('users').doc(refParam);
          const referrerDoc = await referrerRef.get();
          if (referrerDoc.exists) {
            referrerId = refParam;
          }
        }
        
        if (referrerId) {
          // Only credit if this is a NEW user being referred
          if (isNewUser) {
            await processReferral(referrerId, uid);
          }
          await userRef.update({ referredBy: referrerId });
          console.log(`[AUTH] Referral credited: ${referrerId} referred ${uid}, newUser: ${isNewUser}`);
        }
      }
    }
    
    // Ensure new users have a referral code for their own sharing
    if (isNewUser) {
      try {
        const userReferralCode = await ensureUserHasReferralCode(uid);
        console.log(`[AUTH] User referral code: ${userReferralCode}`);
      } catch (codeErr) {
        console.error('[AUTH] Failed to create referral code:', codeErr);
      }
    }

    const token = jwt.sign({
      uid,
      email,
      displayName: name,
      profilePicture: picture,
      tier,
      walletAddress,
      authProvider: 'google'
    }, getJwtSecret(), { expiresIn: '7d' });
    
    // Only send welcome email for NEW users
    if (email && isNewUser) {
      sendWelcomeEmail(email, name || '', 'google').catch(err => console.error('[EMAIL] Failed to send welcome email:', err));
    }
    
    // Redirect to the original page with token and ref param
    const refQuery = refParam ? `&ref=${refParam}` : '';
    res.redirect(`${redirectUrl}?token=${token}${refQuery}`);
    
  } catch (err) {
    console.error('[AUTH] Google callback error:', err);
    res.redirect(`${redirectUrl}?error=callback_failed`);
  }
});

router.get('/twitter/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;
  
  if (error) {
    console.error('[AUTH] Twitter OAuth error:', error);
    return res.redirect(`${FRONTEND_URL}/auth?error=oauth_failed`);
  }
  
  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/auth?error=missing_params`);
  }
  
  try {
    const decoded = jwt.verify(state as string, getJwtSecret()) as any;
    const codeVerifier = decoded.codeVerifier || 'challenge';

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: TWITTER_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });
    
    const tokens = await tokenResponse.json();
    
    if (!tokens.access_token) {
      console.error('[AUTH] Twitter token exchange failed:', tokens);
      return res.redirect(`${FRONTEND_URL}/auth?error=token_exchange_failed`);
    }
    
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    
    const userData = await userResponse.json();
    const twitterUser = userData.data;
    
    const uid = `twitter:${twitterUser.id}`;
    const email = `${twitterUser.username}@twitter.local`;
    const name = twitterUser.name;
    const picture = twitterUser.profile_image_url || '';
    
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    const isNewUser = !userDoc.exists;
    
    let tier = 'max';
    let expiry = 0;
    let walletAddress = '';
    
    if (userDoc.exists) {
      const data = userDoc.data();
      // Everyone gets max tier now - no more tier restrictions
      tier = 'max';
      expiry = data?.subscriptionExpiry || 0;
      walletAddress = data?.walletAddress || '';
    }
    
    if (expiry > 0 && Date.now() > expiry) {
      tier = 'max';
    }
    
await userRef.set({
      uid,
      email,
      displayName: name,
      profilePicture: picture,
      tier,
      subscriptionExpiry: expiry,
      lastLogin: Date.now(),
      authProvider: 'google',
      createdAt: isNewUser ? Date.now() : (await userRef.get()).data()?.createdAt || Date.now(),
      onboardingCompleted: isNewUser ? false : (await userRef.get()).data()?.onboardingCompleted ?? false
    }, { merge: true });
    
    const token = jwt.sign({
      uid,
      email,
      displayName: name,
      profilePicture: picture,
      tier,
      walletAddress,
      authProvider: 'twitter'
    }, getJwtSecret(), { expiresIn: '7d' });
    
    // Only send welcome email for NEW users
    if (email && isNewUser) {
      sendWelcomeEmail(email, name || '', 'twitter').catch(err => console.error('[EMAIL] Failed to send welcome email:', err));
    }
    
    res.redirect(`${FRONTEND_URL}/auth?token=${token}`);
    
  } catch (err) {
    console.error('[AUTH] Twitter callback error:', err);
    res.redirect(`${FRONTEND_URL}/auth?error=callback_failed`);
  }
});

// SECURITY: JWT_SECRET must be set in environment (checked at runtime, not module load)
const getJwtSecret = () => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('CRITICAL: JWT_SECRET environment variable is not set or too short');
    console.error('Please set a strong random secret (min 256 bits)');
    console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }
  return JWT_SECRET;
};

// Initialize Firebase Admin for ID token verification
let firebaseAdminAuth: ReturnType<typeof getAuth> | null = null;
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
    firebaseAdminAuth = getAuth();
    console.log('[AUTH] Firebase Admin initialized');
  } catch (error) {
    console.error('[AUTH] Firebase Admin init error:', error);
  }
} else {
  console.warn('[AUTH] Firebase Admin credentials not found - OAuth login will not work');
}

// Email transporter configuration - supports both Gmail (SMTP) and Resend (API)
let emailTransporter: nodemailer.Transporter | null = null;
let resendClient: Resend | null = null;

function getEmailTransporter(): nodemailer.Transporter | null {
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS;
  
  if (!emailTransporter && EMAIL_USER && EMAIL_PASS) {
    try {
      emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS.replace(/\s/g, ''), // Remove spaces from app password
        },
      });
      console.log('[AUTH] Gmail transporter initialized');
    } catch (error) {
      console.error('[AUTH] Gmail transporter init error:', error);
    }
  }
  return emailTransporter;
}

function getResendClient(): Resend | null {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!resendClient && RESEND_API_KEY) {
    try {
      resendClient = new Resend(RESEND_API_KEY);
      console.log('[AUTH] Resend client initialized');
    } catch (error) {
      console.error('[AUTH] Resend client init error:', error);
    }
  }
  return resendClient;
}

// Send welcome email function
async function sendWelcomeEmail(email: string, name: string, authProvider: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const providerLabel = authProvider === 'google' ? 'Google' : authProvider === 'twitter' ? 'X (Twitter)' : 'wallet';
  
  // Debug mode - print email to console if DEBUG_EMAIL=true
  if (process.env.DEBUG_EMAIL === 'true') {
    console.log(`
========================================
[WELCOME EMAIL - DEBUG MODE]
To: ${email}
Name: ${name}
Provider: ${providerLabel}
========================================
    `);
    return;
  }
  
  // Use Gmail SMTP as primary
  const EMAIL_USER = 'fundtracerbydt@gmail.com';
  const EMAIL_PASS = process.env.EMAIL_PASS;
  
  if (EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS.replace(/\s/g, ''),
        },
      });
      
      const { subject, html } = buildWelcomeEmail(name);
      await transporter.sendMail({
        from: `Fundtracer <${EMAIL_USER}>`,
        to: email,
        subject,
        html,
      });
      
      console.log(`[AUTH] Welcome email sent via Gmail to: ${email}`);
      return;
    } catch (error) {
      console.error('[AUTH] Gmail send error:', error);
    }
  }
  
  // Fallback to Resend with the unified EmailService
  if (RESEND_API_KEY) {
    try {
      const { subject, html } = buildWelcomeEmail(name);
      await sendEmail({
        to: email,
        subject,
        html,
        includeBcc: true,
      });
      console.log(`[AUTH] Welcome email sent via Resend to: ${email}`);
      return;
    } catch (error) {
      console.error('[AUTH] Resend send error:', error);
    }
  }
  
  console.log(`[AUTH] No email service configured, skipping welcome email for: ${email}`);
}

// Export for use in other modules
export { sendWelcomeEmail };

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
    
    const isNewUser = !userDoc.exists;
    
    let tier = 'max';
    let expiry = 0;
    let walletAddress = '';
    let displayName = '';
    
    if (userDoc.exists) {
      const data = userDoc.data();
      // Everyone gets max tier now - no more tier restrictions
      tier = 'max';
      expiry = data?.subscriptionExpiry || 0;
      displayName = data?.displayName || '';
    }

    // Check if subscription expired - still give max tier
    if (expiry > 0 && Date.now() > expiry) {
      tier = 'max';
    }

    await userRef.set({
      address: address.toLowerCase(),
      isVerified,
      tier,
      subscriptionExpiry: expiry,
      lastLogin: Date.now(),
      authProvider: 'wallet',
      onboardingCompleted: isNewUser ? false : userDoc.data()?.onboardingCompleted ?? false
    }, { merge: true });

    // Generate JWT
    const token = jwt.sign({
      uid: address.toLowerCase(),
      address: address.toLowerCase(),
      tier,
      isVerified,
      displayName,
      authProvider: 'wallet'
    }, getJwtSecret(), { expiresIn: '7d' });

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

// Google OAuth login
router.post('/google-login', async (req: Request, res: Response) => {
  const { idToken } = req.body;
  console.log('[AUTH] Google Login Request');

  if (!idToken) {
    return res.status(400).json({ error: 'Missing ID token' });
  }

  if (!firebaseAdminAuth) {
    console.error('[AUTH] Firebase Admin not initialized');
    return res.status(500).json({ error: 'OAuth not configured' });
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await firebaseAdminAuth.verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;
    console.log(`[AUTH] Google User: ${email} (${uid})`);

    // Explicitly create/update user in Firebase Auth to ensure they appear in console
    try {
      await firebaseAdminAuth.getUser(uid);
      console.log(`[AUTH] User already exists in Firebase Auth: ${uid}`);
    } catch (userError: any) {
      if (userError.code === 'auth/user-not-found') {
        // Create user in Firebase Auth
        await firebaseAdminAuth.createUser({
          uid,
          email: email || undefined,
          displayName: name || undefined,
          photoURL: picture || undefined,
        });
        console.log(`[AUTH] Created new user in Firebase Auth: ${uid}`);
      }
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    const isNewUser = !userDoc.exists;
    
    let tier = 'max';
    let expiry = 0;
    let walletAddress = '';

    if (userDoc.exists) {
      const data = userDoc.data();
      // Everyone gets max tier now - no more tier restrictions
      tier = 'max';
      expiry = data?.subscriptionExpiry || 0;
      walletAddress = data?.walletAddress || '';
    }

// Check if subscription expired - still give max tier
    if (expiry > 0 && Date.now() > expiry) {
      tier = 'max';
    }
    
    await userRef.set({
      uid,
      email,
      displayName: name,
      profilePicture: picture,
      tier,
      subscriptionExpiry: expiry,
      lastLogin: Date.now(),
      authProvider: 'google',
      onboardingCompleted: isNewUser ? false : userDoc.data()?.onboardingCompleted ?? false
    }, { merge: true });
    
    // Handle referral from ref query param for Google login (supports both new codes and legacy IDs)
    const googleRefParam = req.query.ref as string;
    if (googleRefParam && isNewUser && googleRefParam !== uid) {
      let referrerId: string | null = null;
      
      if (googleRefParam.startsWith('FUND')) {
        referrerId = await getReferralCodeOwner(googleRefParam);
        console.log(`[AUTH] Google referral code lookup: ${googleRefParam} -> ${referrerId}`);
      } else {
        const referrerRef = db.collection('users').doc(googleRefParam);
        const referrerDoc = await referrerRef.get();
        if (referrerDoc.exists) {
          referrerId = googleRefParam;
        }
      }
      
      if (referrerId) {
        await processReferral(referrerId, uid);
        await userRef.update({ referredBy: referrerId });
        console.log(`[AUTH] Google referral credited: ${referrerId} referred ${uid}`);
      }
    }
    
    // Ensure new users have a referral code for their own sharing
    if (isNewUser) {
      try {
        const userReferralCode = await ensureUserHasReferralCode(uid);
        console.log(`[AUTH] User referral code: ${userReferralCode}`);
      } catch (codeErr) {
        console.error('[AUTH] Failed to create referral code:', codeErr);
      }
    }

    // Generate JWT
    const token = jwt.sign({
      uid,
      email,
      displayName: name,
      profilePicture: picture,
      tier,
      walletAddress,
      authProvider: 'google'
    }, getJwtSecret(), { expiresIn: '7d' });

    console.log('[AUTH] Google Login SUCCESS');
    
    // Only send welcome email for NEW users
    if (email && isNewUser) {
      sendWelcomeEmail(email, name || '', 'google').catch(err => console.error('[EMAIL] Failed to send welcome email:', err));
    }
    
    res.json({
      token,
      user: {
        uid,
        email,
        displayName: name,
        profilePicture: picture,
        tier,
        walletAddress,
        isVerified: false
      }
    });

  } catch (error: any) {
    console.error('[AUTH] Google Login CRITICAL error:', error);
    res.status(500).json({ error: 'Google login failed' });
  }
});

// Twitter OAuth login
router.post('/twitter-login', async (req: Request, res: Response) => {
  const { idToken } = req.body;
  console.log('[AUTH] Twitter Login Request');

  if (!idToken) {
    return res.status(400).json({ error: 'Missing ID token' });
  }

  if (!firebaseAdminAuth) {
    console.error('[AUTH] Firebase Admin not initialized');
    return res.status(500).json({ error: 'OAuth not configured' });
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await firebaseAdminAuth.verifyIdToken(idToken);
    const { uid, email, name, picture, providerData } = decodedToken;
    
    // Extract Twitter username from providerData
    let twitterDisplayName = name || decodedToken.name || '';
    let twitterProfilePic = picture || decodedToken.picture || '';
    
    // Check providerData for Twitter-specific info
    if (providerData && Array.isArray(providerData)) {
      const twitterProvider = providerData.find((p: any) => p.providerId === 'twitter.com');
      if (twitterProvider) {
        twitterDisplayName = twitterProvider.displayName || twitterProvider.screenName || twitterDisplayName;
        twitterProfilePic = twitterProvider.photoURL || twitterProfilePic;
      }
    }
    
    console.log(`[AUTH] Twitter User: ${twitterDisplayName || email || uid}`);

    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    const isNewUser = !userDoc.exists;
    
    let tier = 'max';
    let expiry = 0;
    let walletAddress = '';

    if (userDoc.exists) {
      const data = userDoc.data();
      // Everyone gets max tier now - no more tier restrictions
      tier = 'max';
      expiry = data?.subscriptionExpiry || 0;
      walletAddress = data?.walletAddress || '';
    }

    // Check if subscription expired - still give max tier
    if (expiry > 0 && Date.now() > expiry) {
      tier = 'max';
    }

await userRef.set({
      uid,
      email,
      displayName: name,
      profilePicture: picture,
      tier,
      subscriptionExpiry: expiry,
      lastLogin: Date.now(),
      authProvider: 'google',
      onboardingCompleted: isNewUser ? false : (userDoc.data()?.onboardingCompleted ?? false)
    }, { merge: true });

    // Generate JWT
    const token = jwt.sign({
      uid,
      email,
      displayName: twitterDisplayName || '',
      profilePicture: twitterProfilePic || '',
      tier,
      walletAddress,
      authProvider: 'twitter'
    }, getJwtSecret(), { expiresIn: '7d' });

    console.log('[AUTH] Twitter Login SUCCESS');
    
    // Only send welcome email for NEW users
    if (email && isNewUser) {
      sendWelcomeEmail(email, twitterDisplayName || '', 'twitter').catch(err => console.error('[EMAIL] Failed to send welcome email:', err));
    }
    
    res.json({
      token,
      user: {
        uid,
        email,
        displayName: twitterDisplayName || '',
        profilePicture: twitterProfilePic || '',
        tier,
        walletAddress,
        isVerified: false
      }
    });

  } catch (error: any) {
    console.error('[AUTH] Twitter Login CRITICAL error:', error);
    res.status(500).json({ error: 'Twitter login failed' });
  }
});

// Email/Password login (Firebase Auth)
router.post('/email-login', async (req: Request, res: Response) => {
  const { firebaseToken } = req.body;
  console.log('[AUTH] Email Login Request');

  if (!firebaseToken) {
    return res.status(400).json({ error: 'Missing Firebase token' });
  }

  if (!firebaseAdminAuth) {
    console.error('[AUTH] Firebase Admin not initialized');
    return res.status(500).json({ error: 'Authentication service not configured' });
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await firebaseAdminAuth.verifyIdToken(firebaseToken);
    const { uid, email, name, picture, email_verified } = decodedToken;
    
    console.log(`[AUTH] Email User: ${email} (${uid})`);

    // Explicitly create/update user in Firebase Auth to ensure they appear in console
    try {
      await firebaseAdminAuth.getUser(uid);
      console.log(`[AUTH] User already exists in Firebase Auth: ${uid}`);
    } catch (userError: any) {
      if (userError.code === 'auth/user-not-found') {
        // Create user in Firebase Auth
        await firebaseAdminAuth.createUser({
          uid,
          email: email || undefined,
          displayName: name || undefined,
          photoURL: picture || undefined,
        });
        console.log(`[AUTH] Created new user in Firebase Auth: ${uid}`);
      }
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    const isNewUser = !userDoc.exists;
    
    let tier = 'max';
    let expiry = 0;
    let walletAddress = '';

    if (userDoc.exists) {
      const data = userDoc.data();
      // Everyone gets max tier now - no more tier restrictions
      tier = 'max';
      expiry = data?.subscriptionExpiry || 0;
      walletAddress = data?.walletAddress || '';
    }

    // Check if subscription expired - still give max tier
    if (expiry > 0 && Date.now() > expiry) {
      tier = 'max';
    }

    await userRef.set({
      uid,
      email,
      displayName: name || '',
      profilePicture: picture || '',
      tier,
      subscriptionExpiry: expiry,
      lastLogin: Date.now(),
      authProvider: 'email',
      emailVerified: email_verified || false
    }, { merge: true });

    // Check if user has 2FA enabled
    const userData = userDoc.exists ? userDoc.data() : null;
    const twoFactorEnabled = userData?.twoFactorEnabled || false;
    
    // If 2FA is enabled, require verification
    if (twoFactorEnabled) {
      console.log('[AUTH] 2FA required for user:', uid);
      
      // Return partial response requiring 2FA
      return res.json({
        requiresTwoFactor: true,
        tempUid: uid, // Temporary reference for 2FA verification
        message: 'Please enter your 2FA code'
      });
    }

    // Generate JWT
    const token = jwt.sign({
      uid,
      email,
      displayName: name || '',
      profilePicture: picture || '',
      tier,
      walletAddress,
      authProvider: 'email'
    }, getJwtSecret(), { expiresIn: '7d' });

    console.log('[AUTH] Email Login SUCCESS');
    
    // Only send welcome email for NEW users
    if (email && isNewUser) {
      sendWelcomeEmail(email, name || '', 'email').catch(err => console.error('[EMAIL] Failed to send welcome email:', err));
    }
    
    res.json({
      token,
      user: {
        uid,
        email,
        displayName: name || '',
        profilePicture: picture || '',
        tier,
        walletAddress,
        isVerified: email_verified || false
      }
    });

  } catch (error: any) {
    console.error('[AUTH] Email Login CRITICAL error:', error);
    res.status(500).json({ error: 'Email login failed' });
  }
});

// Verify 2FA and complete login
router.post('/verify-2fa', async (req: Request, res: Response) => {
  const { tempUid, code } = req.body;
  
  if (!tempUid || !code) {
    return res.status(400).json({ error: 'Missing user ID or code' });
  }

  console.log('[AUTH] 2FA Verification Request for:', tempUid);

  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(tempUid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userData.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA is not enabled for this user' });
    }

    // Verify the 2FA code
    const verified = speakeasy.totp.verify({
      secret: userData.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    // Also check backup codes
    const isBackupCode = userData.twoFactorBackupCodes?.includes(code.toUpperCase());

    if (!verified && !isBackupCode) {
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    // Remove used backup code if applicable
    if (isBackupCode) {
      const newBackupCodes = userData.twoFactorBackupCodes.filter((c: string) => c !== code.toUpperCase());
      await userRef.update({ twoFactorBackupCodes: newBackupCodes });
    }

    // Generate JWT
    const token = jwt.sign({
      uid: tempUid,
      email: userData.email,
      displayName: userData.displayName || '',
      profilePicture: userData.profilePicture || '',
      tier: userData.tier || 'max',
      walletAddress: userData.walletAddress || '',
      authProvider: userData.authProvider || 'email'
    }, getJwtSecret(), { expiresIn: '7d' });

    console.log('[AUTH] 2FA Login SUCCESS for:', tempUid);

    res.json({
      token,
      user: {
        uid: tempUid,
        email: userData.email,
        displayName: userData.displayName || '',
        profilePicture: userData.profilePicture || '',
        tier: userData.tier || 'max',
        walletAddress: userData.walletAddress || '',
        isVerified: userData.emailVerified || false
      }
    });

  } catch (error: any) {
    console.error('[AUTH] 2FA Verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
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
    }, getJwtSecret(), { expiresIn: '7d' });

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
