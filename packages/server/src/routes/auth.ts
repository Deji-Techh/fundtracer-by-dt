import { Router, Request, Response } from 'express';
import { verifyMessage } from 'ethers';
import jwt from 'jsonwebtoken';
import { getFirestore } from '../firebase.js';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const router = Router();

// OAuth Configuration - these should be in environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://www.fundtracer.xyz/api/auth/google/callback';

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
  
  const state = jwt.sign({ timestamp: Date.now() }, getJwtSecret(), { expiresIn: '10m' });
  
  const scopes = ['openid', 'email', 'profile'].join(' ');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${state}` +
    `&access_type=offline` +
    `&prompt=consent`;
  
  console.log('[AUTH] Redirecting to Google:', authUrl.slice(0, 100) + '...');
  res.redirect(authUrl);
});

router.get('/twitter/start', (req: Request, res: Response) => {
  console.log('[AUTH] Twitter start - TWITTER_CLIENT_ID:', TWITTER_CLIENT_ID ? 'SET' : 'NOT SET');
  
  if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
    console.error('[AUTH] Twitter OAuth not configured');
    return res.status(500).json({ error: 'Twitter OAuth not configured' });
  }
  
  const state = jwt.sign({ timestamp: Date.now() }, getJwtSecret(), { expiresIn: '10m' });
  
  const scopes = 'tweet.read users.read';
  const authUrl = `https://twitter.com/i/oauth2/authorize?` +
    `client_id=${TWITTER_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(TWITTER_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${state}`;
  console.log('[AUTH] Redirecting to Twitter');
  
  res.redirect(authUrl);
});

// OAuth Callback endpoints - handle redirect from provider
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;
  
  console.log('[AUTH] Google callback received:', { 
    hasCode: !!code, 
    hasState: !!state, 
    error,
    redirectUri: GOOGLE_REDIRECT_URI 
  });
  
  if (error) {
    console.error('[AUTH] Google OAuth error:', error);
    return res.redirect(`${FRONTEND_URL}/auth?error=oauth_failed`);
  }
  
  if (!code || !state) {
    console.error('[AUTH] Missing code or state');
    return res.redirect(`${FRONTEND_URL}/auth?error=missing_params`);
  }
  
  try {
    try {
      jwt.verify(state as string, getJwtSecret());
    } catch (e) {
      console.error('[AUTH] Invalid state:', e);
      return res.redirect(`${FRONTEND_URL}/auth?error=invalid_state`);
    }
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('[AUTH] Google OAuth not configured');
      return res.redirect(`${FRONTEND_URL}/auth?error=oauth_not_configured`);
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
      return res.redirect(`${FRONTEND_URL}/auth?error=token_exchange_failed`);
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
      return res.redirect(`${FRONTEND_URL}/auth?error=no_uid`);
    }
    
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
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
      authProvider: 'google'
    }, { merge: true });
    
    console.log(`[AUTH] User saved to Firestore: ${email} (${uid})`);

    const token = jwt.sign({
      uid,
      email,
      displayName: name,
      profilePicture: picture,
      tier,
      walletAddress,
      authProvider: 'google'
    }, getJwtSecret(), { expiresIn: '30d' });
    
    if (email) {
      sendWelcomeEmail(email, name || '', 'google').catch(err => console.error('[EMAIL] Failed to send welcome email:', err));
    }
    
    res.redirect(`${FRONTEND_URL}/auth?token=${token}`);
    
  } catch (err) {
    console.error('[AUTH] Google callback error:', err);
    res.redirect(`${FRONTEND_URL}/auth?error=callback_failed`);
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
    jwt.verify(state as string, getJwtSecret());
    
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
        code_verifier: 'challenge',
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
      authProvider: 'twitter'
    }, { merge: true });
    
    const token = jwt.sign({
      uid,
      email,
      displayName: name,
      profilePicture: picture,
      tier,
      walletAddress,
      authProvider: 'twitter'
    }, getJwtSecret(), { expiresIn: '30d' });
    
    sendWelcomeEmail(email, name || '', 'twitter').catch(err => console.error('[EMAIL] Failed to send welcome email:', err));
    
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
  
  // Use Gmail SMTP as primary (user's request)
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
      
      await transporter.sendMail({
        from: `Fundtracer <${EMAIL_USER}>`,
        to: email,
        subject: "Welcome to Fundtracer - Your Blockchain Intelligence Journey Starts Here",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #22d3ee; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">FUNDTRACER</h1>
              <p style="color: #94a3b8; margin: 10px 0 0; font-size: 14px;">Blockchain Intelligence Reimagined</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 30px; background: #ffffff;">
              <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 24px; font-weight: 600;">
                Welcome${name ? `, ${name}` : ''}!
              </h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                Thank you for joining Fundtracer - the most powerful blockchain intelligence platform designed for researchers, investors, and compliance professionals.
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                Whether you're investigating crypto fraud, conducting due diligence on a project, tracking portfolio performance, or analyzing competitor wallets, Fundtracer gives you the tools you need to understand any wallet's complete on-chain history.
              </p>

              <h3 style="color: #1e293b; margin: 35px 0 15px; font-size: 18px; font-weight: 600;">What You Can Do with Fundtracer</h3>
              
              <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">- Investigate Any Wallet</p>
                <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Enter any wallet address and get a complete breakdown of their transaction history, token holdings, and on-chain behavior across 8+ blockchain networks.</p>
                
                <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">- Trace Funding Sources</p>
                <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Our funding tree visualization shows exactly where every token came from, helping you trace the origin of funds and identify potential risks.</p>
                
                <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">- Detect Sybil & Bot Networks</p>
                <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Identify coordinated attack patterns, airdrop farmers, and fake accounts using our advanced network analysis algorithms.</p>
                
                <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">- Compare Wallets Side-by-Side</p>
                <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Analyze multiple wallets simultaneously to uncover connections, shared interactions, and behavioral similarities.</p>
                
                <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">- Monitor in Real-Time</p>
                <p style="color: #64748b; margin: 0; font-size: 14px; line-height: 1.6;">Set up alerts via Telegram to get instant notifications when monitored wallets make transactions.</p>
              </div>

              <h3 style="color: #1e293b; margin: 35px 0 15px; font-size: 18px; font-weight: 600;">Supported Blockchains</h3>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 10px;">
                Ethereum, Solana, Linea, Arbitrum, Base, Optimism, Polygon, and BNB Chain - all in one unified interface.
              </p>

              <div style="text-align: center; margin: 35px 0;">
                <a href="https://www.fundtracer.xyz/app-evm" 
                   style="background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%); color: white; padding: 16px 32px; 
                          text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
                  Launch Fundtracer Now
                </a>
              </div>

              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h4 style="color: #0369a1; margin: 0 0 10px; font-size: 15px; font-weight: 600;">Pro Tip: Start with These</h4>
                <p style="color: #075985; margin: 0; font-size: 14px; line-height: 1.6;">
                  Try analyzing your own wallet to see your complete transaction history. Then try a popular DeFi protocol router (like Uniswap) to see how our contract analytics work.
                </p>
              </div>
            </div>

            <!-- Other Products Section -->
            <div style="background: #f8fafc; padding: 30px; border-top: 1px solid #e2e8f0;">
              <h4 style="color: #1e293b; margin: 0 0 15px; font-size: 16px; font-weight: 600; text-align: center;">Explore Our Other Products</h4>
              
              <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <a href="https://www.fundtracer.xyz/cli" style="color: #06b6d4; text-decoration: none; font-size: 14px; padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 6px; display: inline-block;">
                  Fundtracer CLI
                </a>
                <a href="https://fundtracer.xyz/telegram" style="color: #06b6d4; text-decoration: none; font-size: 14px; padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 6px; display: inline-block;">
                  Telegram Bot
                </a>
                <a href="https://www.fundtracer.xyz" style="color: #06b6d4; text-decoration: none; font-size: 14px; padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 6px; display: inline-block;">
                  Homepage
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="padding: 25px 30px; background: #0f172a; text-align: center;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">
                Questions or need help? Reply to this email - we're happy to assist.
              </p>
              <p style="color: #475569; font-size: 12px; margin: 0 0 8px;">
                <a href="https://www.fundtracer.xyz/terms" style="color: #94a3b8; text-decoration: none;">Terms of Service</a> | 
                <a href="https://www.fundtracer.xyz/privacy" style="color: #94a3b8; text-decoration: none;">Privacy Policy</a>
              </p>
              <p style="color: #475569; font-size: 11px; margin: 15px 0 0; opacity: 0.7;">
                Fundtracer - Blockchain Intelligence Reimagined<br/>
                You're receiving this because you signed up with ${providerLabel}.<br/>
                <br/>
                Our mailing address:<br/>
                Fundtracer, Web3 Tools & Services
              </p>
            </div>
          </div>
        `,
      });
      
      console.log(`[AUTH] Welcome email sent via Gmail to: ${email}`);
      return;
    } catch (error) {
      console.error('[AUTH] Gmail send error:', error);
    }
  }
  
  // Fallback to Resend if no Gmail credentials
  if (RESEND_API_KEY) {
    try {
      const resend = getResendClient();
      if (resend) {
        await resend.emails.send({
          from: 'Fundtracer <welcome@fundtracer.xyz>',
          to: email,
          subject: "Welcome to Fundtracer - Your Blockchain Intelligence Journey Starts Here",
          html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #22d3ee; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">FUNDTRACER</h1>
              <p style="color: #94a3b8; margin: 10px 0 0; font-size: 14px;">Blockchain Intelligence Reimagined</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 30px; background: #ffffff;">
              <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 24px; font-weight: 600;">
                Welcome${name ? `, ${name}` : ''}!
              </h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                Thank you for joining Fundtracer - the most powerful blockchain intelligence platform designed for researchers, investors, and compliance professionals.
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                Whether you're investigating crypto fraud, conducting due diligence on a project, tracking portfolio performance, or analyzing competitor wallets, Fundtracer gives you the tools you need to understand any wallet's complete on-chain history.
              </p>

              <h3 style="color: #1e293b; margin: 35px 0 15px; font-size: 18px; font-weight: 600;">What You Can Do with Fundtracer</h3>
              
              <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">- Investigate Any Wallet</p>
                <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Enter any wallet address and get a complete breakdown of their transaction history, token holdings, and on-chain behavior across 8+ blockchain networks.</p>
                
                <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">- Trace Funding Sources</p>
                <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Our funding tree visualization shows exactly where every token came from, helping you trace the origin of funds and identify potential risks.</p>
                
                <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">- Detect Sybil and Bot Networks</p>
                <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Identify coordinated attack patterns, airdrop farmers, and fake accounts using our advanced network analysis algorithms.</p>
                
                <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">- Compare Wallets Side-by-Side</p>
                <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Analyze multiple wallets simultaneously to uncover connections, shared interactions, and behavioral similarities.</p>
                
                <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">- Monitor in Real-Time</p>
                <p style="color: #64748b; margin: 0; font-size: 14px; line-height: 1.6;">Set up alerts via Telegram to get instant notifications when monitored wallets make transactions.</p>
              </div>

              <h3 style="color: #1e293b; margin: 35px 0 15px; font-size: 18px; font-weight: 600;">Supported Blockchains</h3>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 10px;">
                Ethereum, Solana, Linea, Arbitrum, Base, Optimism, Polygon, and BNB Chain - all in one unified interface.
              </p>

              <div style="text-align: center; margin: 35px 0;">
                <a href="https://www.fundtracer.xyz/app-evm" 
                   style="background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%); color: white; padding: 16px 32px; 
                          text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
                  Launch Fundtracer Now
                </a>
              </div>

              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h4 style="color: #0369a1; margin: 0 0 10px; font-size: 15px; font-weight: 600;">Pro Tip: Start with These</h4>
                <p style="color: #075985; margin: 0; font-size: 14px; line-height: 1.6;">
                  Try analyzing your own wallet to see your complete transaction history. Then try a popular DeFi protocol router (like Uniswap) to see how our contract analytics work.
                </p>
              </div>
            </div>

            <!-- Other Products Section -->
            <div style="background: #f8fafc; padding: 30px; border-top: 1px solid #e2e8f0;">
              <h4 style="color: #1e293b; margin: 0 0 15px; font-size: 16px; font-weight: 600; text-align: center;">Explore Our Other Products</h4>
              
              <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <a href="https://www.fundtracer.xyz/cli" style="color: #06b6d4; text-decoration: none; font-size: 14px; padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 6px; display: inline-block;">
                  Fundtracer CLI
                </a>
                <a href="https://fundtracer.xyz/telegram" style="color: #06b6d4; text-decoration: none; font-size: 14px; padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 6px; display: inline-block;">
                  Telegram Bot
                </a>
                <a href="https://www.fundtracer.xyz" style="color: #06b6d4; text-decoration: none; font-size: 14px; padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 6px; display: inline-block;">
                  Homepage
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="padding: 25px 30px; background: #0f172a; text-align: center;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">
                Questions or need help? Reply to this email - we are happy to assist.
              </p>
              <p style="color: #475569; font-size: 12px; margin: 0 0 8px;">
                <a href="https://www.fundtracer.xyz/terms" style="color: #94a3b8; text-decoration: none;">Terms of Service</a> | 
                <a href="https://www.fundtracer.xyz/privacy" style="color: #94a3b8; text-decoration: none;">Privacy Policy</a>
              </p>
              <p style="color: #475569; font-size: 11px; margin: 15px 0 0; opacity: 0.7;">
                Fundtracer - Blockchain Intelligence Reimagined<br/>
                You are receiving this because you signed up with ${providerLabel}.<br/>
                <br/>
                Our mailing address:<br/>
                Fundtracer, Web3 Tools and Services
              </p>
            </div>
          </div>
        `,
        });
        console.log(`[AUTH] Welcome email sent via Resend to: ${email}`);
        return;
      }
    } catch (error) {
      console.error('[AUTH] Resend error:', error);
    }
  }
  
  console.warn('[AUTH] No email provider configured, skipping welcome email');
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

    let tier = 'max';
    let expiry = 0;
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
    }, getJwtSecret(), { expiresIn: '30d' });

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
      authProvider: 'google'
    }, { merge: true });

    // Generate JWT
    const token = jwt.sign({
      uid,
      email,
      displayName: name,
      profilePicture: picture,
      tier,
      walletAddress,
      authProvider: 'google'
    }, getJwtSecret(), { expiresIn: '30d' });

    console.log('[AUTH] Google Login SUCCESS');
    
    // Send welcome email (async, don't wait)
    if (email) {
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
      email: email || null,
      displayName: twitterDisplayName || '',
      profilePicture: twitterProfilePic || '',
      tier,
      subscriptionExpiry: expiry,
      lastLogin: Date.now(),
      authProvider: 'twitter'
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
    }, getJwtSecret(), { expiresIn: '30d' });

    console.log('[AUTH] Twitter Login SUCCESS');
    
    // Send welcome email for Twitter (async, don't wait)
    // Twitter OAuth might not provide email, check if available
    if (email) {
      sendWelcomeEmail(email, twitterDisplayName || '', 'twitter').catch(err => console.error('[EMAIL] Failed to send welcome email:', err));
    } else if (twitterDisplayName) {
      // Try to get email from Firestore user record if not provided by Twitter
      console.log('[AUTH] Twitter user email not available, skipping welcome email');
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
    }, getJwtSecret(), { expiresIn: '30d' });

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
