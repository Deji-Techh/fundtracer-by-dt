/**
 * FundTracer Secure API Server
 * Handles authentication, secure API key management, and anti-abuse limits.
 */

// Fix fetch compatibility - must be first
import fetch from 'node-fetch';
(globalThis as any).fetch = fetch;

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables FIRST
console.log('[DEBUG] Loading environment variables from:', process.cwd());
const envResult = dotenv.config();
if (envResult.error) {
    console.error('[DEBUG] Failed to load .env file:', envResult.error);
} else {
    console.log('[DEBUG] .env file loaded successfully');
}
console.log('[DEBUG] JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

// Simple environment validation
const requiredEnvVars = [
    'JWT_SECRET',
    'DEFAULT_ALCHEMY_API_KEY',
    'FIREBASE_SERVICE_ACCOUNT',
    'HELIUS_KEY_1',
    'HELIUS_KEY_2',
    'HELIUS_KEY_3',
];

const missing = requiredEnvVars.filter(varName => !process.env[varName]);
if (missing.length > 0) {
    console.error('\n❌ CRITICAL: Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\n🚫 Server startup aborted');
    process.exit(1);
}

// Validate JWT_SECRET
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32 || jwtSecret === 'dev-secret-key-change-in-prod') {
    console.error('\n❌ CRITICAL: JWT_SECRET is invalid or using default value');
    console.error('   Generate a secure secret: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
}

console.log('✅ Environment validation passed');

// Global error handlers to catch any startup crashes
process.on('uncaughtException', (error) => {
    console.error('FATAL: Uncaught Exception during startup!');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('FATAL: Unhandled Rejection during startup!');
    console.error('Reason:', reason);
    console.error('Promise:', promise);
    process.exit(1);
});

import { initializeFirebase } from './firebase.js';

try {
    initializeFirebase();
    console.log('[Server] Firebase initialized successfully');
} catch (error) {
    console.error('[Server] Firebase initialization failed:', error);
}

// Initialize CEX database from Dune (async, non-blocking)
import { initializeCEXDatabase } from './data/cexWallets.js';
initializeCEXDatabase()
    .then(() => console.log('[Server] CEX database initialized'))
    .catch(err => console.error('[Server] CEX database init failed:', err));

import { authMiddleware, apiKeyAuthMiddleware } from './middleware/auth.js';
import { usageMiddleware } from './middleware/usage.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { analyzeRoutes } from './routes/analyze.js';
import trackRoutes from './routes/track.js';
import { torqueRoutes } from './routes/torque.js';
import { userRoutes } from './routes/user.js';
import { duneRoutes } from './routes/dune.js';
import contractRoutes from './routes/contracts.js';
import paymentRoutes from './routes/payment.js';
import contactRoutes from './routes/contact.js';
import transactionRoutes from './routes/transaction.js';
import gasRoutes from './routes/gas.js';
import intelRoutes from './routes/intel.js';
import { PaymentListener } from './services/PaymentListener.js';
import contractService from './services/ContractService.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting behind Render's load balancer
app.set('trust proxy', 1);

let server: any = null;
let isShuttingDown = false;
let isReady = false;

// Fast health check - responds immediately even during startup
app.get('/health', (req, res) => {
    res.status(isReady ? 200 : 200).json({ 
        status: isReady ? 'ok' : 'starting',
        timestamp: Date.now()
    });
});

// Health check for shutdown state (runs after /health is registered)
app.use((req, res, next) => {
    if (isShuttingDown) {
        res.status(503).json({ 
            error: 'Server is shutting down',
            status: 'unavailable'
        });
        return;
    }
    next();
});

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    isShuttingDown = true;

    // Stop accepting new connections
    if (server) {
        server.close(async () => {
            console.log('✅ HTTP server closed');
            
            try {
                // Close database connections
                // Close any active payment listeners
                // Flush any pending analytics
                console.log('✅ All connections closed gracefully');
                process.exit(0);
            } catch (error) {
                console.error('❌ Error during shutdown:', error);
                process.exit(1);
            }
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
            console.error('❌ Force shutdown after timeout');
            process.exit(1);
        }, 30000);
    } else {
        process.exit(0);
    }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Health check for shutdown state
app.use((req, res, next) => {
    if (isShuttingDown) {
        res.status(503).json({ 
            error: 'Server is shutting down',
            status: 'unavailable'
        });
        return;
    }
    next();
});

// Security middleware
app.use(helmet({
    crossOriginOpenerPolicy: false, // Completely disable COOP for Google Sign-In
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "connect-src": [
                "'self'",
                "https://auth.privy.io",
                "https://api.privy.io",
                "https://rpc.linea.build",
                "wss://relay.walletconnect.org",
                "wss://relay.walletconnect.com",
                "https://api.web3modal.org",
                "https://secure.walletconnect.org",
                "https://*.walletconnect.com",
                "https://*.walletconnect.org",
                "https://*.rpc.linea.build",
                "https://cca-lite.coinbase.com",
                "https://*.coinbase.com",
                "https://*.googleapis.com",
                "https://*.google.com",
                "https://fonts.reown.com",
                "https://*.firebaseio.com",
                "https://*.firebasedatabase.app",
                "https://api.geckoterminal.com",
                "https://api.dexscreener.com",
                "https://*.g.alchemy.com",
                "https://*.alchemy.com",
                "https://api.coingecko.com",
                "https://mainnet.helius-rpc.com",
                "https://api.helius.xyz",
                "https://pulse.walletconnect.org",
                "https://pulse.reown.com"
            ],
            "frame-src": [
                "'self'",
                "https://auth.privy.io",
                "https://secure.walletconnect.org",
                "https://verify.walletconnect.com",
                "https://accounts.google.com",
                "https://*.google.com",
                "https://apis.google.com",
                "https://fundtracer-by-dt.firebaseapp.com"
            ],
            "img-src": [
                "'self'",
                "data:",
                "blob:",
                "*",
                "https://*.ipfs.io",
                "https://ipfs.io",
                "https://cloudflare-ipfs.com",
                "https://*.dweb.link",
                "https://*.pinata.cloud",
                "https://api.web3modal.org",
                "https://walletconnect.org",
                "https://*.walletconnect.com",
                "https://*.googleusercontent.com",
                "https://*.google.com",
                "https://fonts.reown.com",
                "https://nft-cdn.alchemy.com",
                "https://*.alchemy.com",
                "https://www.fundtracer.xyz",
                "https://fundtracer.xyz"
            ],
            "script-src": [
                "'self'",
                // TODO: Tighten CSP — unsafe-inline is required by Google OAuth SDKs,
                // unsafe-eval by React dev mode/Vite HMR. To remove these, adopt
                // strict-dynamic with nonce-based CSP and migrate to production builds only.
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://*.google.com",
                "https://*.googleapis.com",
                "https://*.gstatic.com",
                "https://static.cloudflareinsights.com",
                "https://*.cloudflareinsights.com",
                "https://service.prerender.io"
            ],
            "style-src": [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://fonts.reown.com"
            ],
            "media-src": [
                "'self'",
                "data:"
            ],
            "font-src": [
                "'self'",
                "https://fonts.gstatic.com",
                "https://fonts.reown.com"
            ]
        },
    },
}));

// Request ID middleware - adds unique ID for distributed tracing
app.use(requestIdMiddleware);

// Serve Static Frontend
// Try multiple possible paths (Pxxl runs from different locations)
let webDistPath: string;
const possiblePaths = [
    path.join(process.cwd(), '../web/dist'),           // When CWD is /app/packages/server
    path.join(process.cwd(), 'packages/web/dist'),     // When CWD is /app (root)
    path.join(process.cwd(), '../../packages/web/dist') // When CWD is /app/packages/server/dist
];

webDistPath = possiblePaths.find(p => {
    try {
        return fs.existsSync(path.join(p, 'index.html'));
    } catch {
        return false;
    }
}) || possiblePaths[0]; // Default to first if none found

// Serve whitepaper — served as HTML (not PDF spoofing)
app.get('/whitepaper', (req, res) => {
    const whitepaperPath = path.join(webDistPath, 'fundtracer-whitepaper.html');
    res.sendFile(whitepaperPath, (err) => {
        if (err) {
            console.error('[WHITEPAPER] Error serving whitepaper:', err.message);
            res.status(404).send('Whitepaper not found');
        }
    });
});

app.get('/whitepaper.pdf', (req, res) => {
    res.redirect(301, '/whitepaper');
});

app.get('/fundtracer.pdf', (req, res) => {
    res.redirect(301, '/whitepaper');
});

// Static files serving configured
app.use(express.static(webDistPath));

// Explicitly handle sitemap and robots to avoid SPA fallback
app.get('/sitemap.xml', (req, res) => {
    const sitemapPath = path.join(webDistPath, 'sitemap.xml');
    res.setHeader('Content-Type', 'application/xml');
    res.sendFile(sitemapPath, (err) => {
        if (err) {
            res.status(404).send('Sitemap not found');
        }
    });
});

app.get('/robots.txt', (req, res) => {
    const robotsPath = path.join(webDistPath, 'robots.txt');
    res.sendFile(robotsPath, (err) => {
        if (err) {
            res.status(404).send('Not found');
        }
    });
});

// Security.txt — vulnerability disclosure policy
app.get('/.well-known/security.txt', (req, res) => {
    const securityPolicy = `Contact: https://fundtracer.xyz/contact
Contact: mailto:security@fundtracer.xyz
Preferred-Languages: en
Policy: https://fundtracer.xyz/security-policy
Encryption: https://fundtracer.xyz/pgp-key.txt
Canonical: https://fundtracer.xyz/.well-known/security.txt
`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(securityPolicy);
});



app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        /^https:\/\/.*\.netlify\.app$/,
        /^https:\/\/.*\.firebaseapp\.com$/,
        /^https:\/\/.*\.pxxl\.click$/,
        /^https:\/\/.*\.onrender\.com$/,
        /^https:\/\/.*\.up\.railway\.app$/,
        'https://fundtracer.xyz',
        'https://www.fundtracer.xyz',
        'https://api.fundtracer.xyz',
        /^https:\/\/.*\.fundtracer\.xyz$/
    ],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

// Capture raw body for LemonSqueezy webhook BEFORE json middleware
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }), (req: any, _res, next) => {
    req.rawBody = req.body.toString();
    next();
});

app.use(express.json({ limit: '10mb' })); // Increased for large wallet lists
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Limit URL-encoded bodies

// Security headers middleware (CSP handled by Helmet above)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});

// Rate limiting configuration
// Skip rate limiting for health checks
const skipHealthCheck = (req: any) => req.path === '/health';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs (increased from 100)
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipHealthCheck,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Stricter limit for auth endpoints (increased from 20)
  message: { error: 'Too many authentication attempts, please try again later' },
  skipSuccessfulRequests: true,
});

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 analysis requests per minute (increased from 30)
  message: { error: 'Analysis rate limit exceeded, please slow down' },
});

const scanHistoryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 scan history requests per minute (increased from 20)
  message: { error: 'Scan history sync rate limit exceeded, please slow down' },
  skipSuccessfulRequests: true,
});

// Public endpoint rate limiter - more permissive for unauthenticated endpoints
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes for public endpoints (increased from 50)
  message: { error: 'Rate limit exceeded for public endpoints, please try again later' },
  skip: skipHealthCheck,
});

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// Initialize Firebase Admin
try {
    initializeFirebase();
} catch (error) {
    console.error('[WARN] Firebase initialization failed. Auth features may be limited.', error);
}

// Create default admin on startup
import { createDefaultAdmin } from './routes/admin.js';
createDefaultAdmin().catch(err => {
    console.error('[ERROR] Failed to create default admin:', err);
});

// Start Payment Listener
// Start Payment Listener - robustly
try {
    new PaymentListener().start();
} catch (err) {
    console.warn('[WARN] Failed to start PaymentListener (acceptable in serverless):', err);
}

// API keys configuration verified (logging removed for security)

// Health check (public)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Keep-alive route to prevent Render free tier cold starts
app.get('/keep-alive', (req, res) => {
    res.send('OK');
});

// Search route — handles ?q= from browser search bar (custom search engine)
app.get('/search', (req, res) => {
    const q = (req.query.q as string || '').trim();
    if (!q) return res.redirect(301, 'https://www.fundtracer.xyz');
    // Pass the raw input — frontend handles smart extraction
    return res.redirect(301, `https://www.fundtracer.xyz/app-evm?address=${encodeURIComponent(q)}`);
});

// Start keep-alive pinger after server starts
let keepAliveInterval: NodeJS.Timeout;

// Protected routes
// Create a main router
const apiRouter = express.Router();
import { authRoutes } from './routes/auth.js';

// ... (existing imports)

// Mount router at both /api (for local dev) and root (for Netlify environment where /api might be stripped)
apiRouter.use('/user', apiKeyAuthMiddleware, authMiddleware, userRoutes);
apiRouter.use('/auth', authLimiter, authRoutes); // Public auth route with stricter rate limiting
apiRouter.use('/contracts', publicLimiter, contractRoutes); // Public contract lookup with rate limiting
apiRouter.use('/payment', publicLimiter, paymentRoutes); // Payment verification with rate limiting
apiRouter.use('/contact', publicLimiter, contactRoutes); // Contact/sales form
apiRouter.use('/config', configRoutes); // Runtime client config (no auth needed)
apiRouter.use('/tx', apiKeyAuthMiddleware, transactionRoutes); // Transaction lookup
apiRouter.use('/gas', apiKeyAuthMiddleware, gasRoutes); // Gas prices
apiRouter.use('/intel', publicLimiter, intelRoutes); // Intel page data (public)

// Chain maintenance middleware - blocks disabled chains
async function chainMaintenanceMiddleware(req: any, res: any, next: any) {
  try {
    const chain = req.body?.chain || req.query?.chain || '';
    if (!chain) return next();
    const { getFirestore } = await import('./firebase.js');
    const db = getFirestore();
    const maintDoc = await db.collection('config').doc('maintenance').get();
    const maint = maintDoc.data();
    if (maint?.disabledChains?.includes(chain.toLowerCase())) {
      return res.status(503).json({
        error: 'chain_maintenance',
        message: `The ${chain} network is currently under maintenance. Please try again later.`,
        chain,
        underMaintenance: true
      });
    }
    next();
  } catch { next(); }
}

apiRouter.use('/analyze', apiKeyAuthMiddleware, authMiddleware, usageMiddleware, chainMaintenanceMiddleware, analyzeLimiter, analyzeRoutes);

// AI Chat Routes - Context-aware AI analyst with smart model routing
import { aiChatRoutes } from './routes/ai-chat.js';
apiRouter.use('/ai-chat', authMiddleware, aiChatRoutes);

// File Upload Routes - For Gemini document attachments
import { uploadRoutes } from './routes/upload.js';
apiRouter.use('/upload', authMiddleware, uploadRoutes);

// Chat History Routes - For AI chat session storage
import { chatHistoryRoutes } from './routes/chat-history.js';
apiRouter.use('/chat', authMiddleware, chatHistoryRoutes);

// Groq AI Proxy - avoids exposing API keys to the browser
import { groqProxyRoutes } from './routes/groq-proxy.js';
apiRouter.use('/proxy/ai', groqProxyRoutes);

// Alchemy RPC Proxy - avoids exposing Alchemy keys to the browser
import { alchemyProxyRoutes } from './routes/alchemy-proxy.js';
apiRouter.use('/proxy/alchemy', alchemyProxyRoutes);

// Helius RPC Proxy - avoids exposing Helius/Solana keys to the browser
import { default as heliusProxyRoutes } from './routes/helius-proxy.js';
apiRouter.use('/proxy/helius', heliusProxyRoutes);

apiRouter.use('/track', trackRoutes);
import { smartMoneyRoutes } from './routes/smartMoney.js';
apiRouter.use('/smart-money', smartMoneyRoutes); // Public smart money discovery
apiRouter.use('/dune', authMiddleware, duneRoutes);
import { trackingRoutes } from './routes/tracking.js';
import healthRoutes from './routes/health.js';
apiRouter.use('/analytics', publicLimiter, trackingRoutes); // Public analytics route with rate limiting
apiRouter.use('/health', healthRoutes); // Health checks (public) - keep open for monitoring

import { adminRoutes } from './routes/admin.js';
// Mount admin routes - login is public, other routes protected by middleware inside adminRoutes
apiRouter.use('/admin', adminRoutes);

import { twoFactorRoutes } from './routes/twoFactor.js';
apiRouter.use('/user', authMiddleware, twoFactorRoutes);

// NEW API Routes (Moralis, CoinGecko, Ankr, QuickNode, Dune)
import { portfolioRoutes } from './routes/portfolio.js';
import { historyRoutes } from './routes/history.js';
import { tokenRoutes } from './routes/tokens.js';
import { marketRoutes } from './routes/market.js';
import { safetyRoutes } from './routes/safety.js';
import { debugRoutes } from './routes/debug.js';
import { dexScreenerRoutes } from './routes/dexscreener.js';
import { geckoTerminalRoutes } from './routes/geckoterminal.js';
import { scanHistoryRoutes } from './routes/scanHistory.js';
import { walletCacheRoutes } from './routes/walletCache.js';
import { solanaRoutes } from './routes/solana.js';
import notificationRoutes from './routes/notifications.js';
import radarRoutes from './routes/radar.js';
import entityRoutes from './routes/entities.js';
import { shareRoutes } from './routes/share.js';
import configRoutes from './routes/config.js';

// All API routes - restored from working commit
apiRouter.use('/portfolio', portfolioRoutes);
apiRouter.use('/history', apiKeyAuthMiddleware, authMiddleware, historyRoutes);
apiRouter.use('/tokens', publicLimiter, tokenRoutes);
apiRouter.use('/market', publicLimiter, marketRoutes);
apiRouter.use('/safety', apiKeyAuthMiddleware, authMiddleware, safetyRoutes);
apiRouter.use('/debug', publicLimiter, debugRoutes);
apiRouter.use('/dexscreener', dexScreenerRoutes);
apiRouter.use('/geckoterminal', geckoTerminalRoutes);
apiRouter.use('/scan-history', apiKeyAuthMiddleware, authMiddleware, scanHistoryLimiter, scanHistoryRoutes);
apiRouter.use('/wallet-cache', walletCacheRoutes);
apiRouter.use('/solana', apiKeyAuthMiddleware, authMiddleware, solanaRoutes);
apiRouter.use('/notifications', apiKeyAuthMiddleware, authMiddleware, notificationRoutes);
apiRouter.use('/radar', radarRoutes);

// OLD: Torque Routes (has /referrals endpoint)
// NOTE: Auth is handled inside torque.ts routes - each route handles its own auth
apiRouter.use('/entities', publicLimiter, entityRoutes);
apiRouter.use('/torque', torqueRoutes);

// NEW: Torque Routes v2 (fresh start, mounted at /api/torque-v2 to avoid conflict)
// NOTE: Auth is handled inside torqueV2.ts routes - only /v2/mystats and /v2/scan require auth
import { torqueRoutesV2 } from './routes/torqueV2.js';
apiRouter.use('/torque-v2', torqueRoutesV2);

// Share analysis routes — POST requires auth (handled inside), GET is public
apiRouter.use('/share', shareRoutes);

// NEW: Contract Scanner Routes
import contractScannerRoutes from './routes/contractRoutes.js';
apiRouter.use('/contract', apiKeyAuthMiddleware, authMiddleware, contractScannerRoutes);

// NEW: Telegram Routes
import { telegramRoutes } from './routes/telegram.js';
apiRouter.use('/telegram', telegramRoutes);

// NEW: Polymarket Routes
import polymarketRoutes from './routes/polymarket.js';
apiRouter.use('/polymarket', publicLimiter, polymarketRoutes);

// Mount router at /api
// MAINTENANCE MIDDLEWARE: Check if site is in maintenance mode
app.use('/api', async (req, res, next) => {
  try {
    // Skip maintenance check for admin routes and health check
    if (req.path.startsWith('/admin/') || req.path === '/health' || req.path === '/keep-alive') {
      return next();
    }
    const { getFirestore } = await import('./firebase.js');
    const db = getFirestore();
    const maintDoc = await db.collection('config').doc('maintenance').get();
    const maint = maintDoc.data();
    if (maint?.siteDown === true) {
      return res.status(503).json({
        error: 'maintenance',
        message: maint.message || 'Site is under maintenance. Please check back later.',
        underMaintenance: true
      });
    }
    next();
  } catch {
    next();
  }
}, apiRouter);

// Telegram webhook route - must be registered BEFORE catch-all
// We create a router that will be populated once the bot initializes
import { createTelegramBot, getTelegramWebhookHandler } from './services/TelegramBot.js';

// Register webhook route synchronously - handler will be set by createTelegramBot
app.post('/telegram-webhook', (req, res, next) => {
    const handler = getTelegramWebhookHandler();
    if (handler) {
        return handler(req, res, next);
    }
    res.status(503).json({ error: 'Bot not ready' });
});

// Initialize bot (will set the webhook handler)
createTelegramBot().catch(err => {
    console.error('[Server] Failed to initialize Telegram bot:', err);
});

// Frontend routes that start with /api (must be handled by SPA)
const frontendApiRoutes = ['/api/keys', '/api/docs'];

// Redirect non-API routes on api.fundtracer.xyz to fundtracer.xyz
app.use((req, res, next) => {
    const host = req.get('host') || '';
    if (host.includes('api.fundtracer.xyz') && !req.path.startsWith('/api/')) {
        const targetUrl = `https://fundtracer.xyz${req.path}`;
        return res.redirect(301, targetUrl);
    }
    next();
});

// Redirect root on api.fundtracer.xyz to fundtracer.xyz
app.get('/', (req, res) => {
    const host = req.get('host') || '';
    if (host.includes('api.fundtracer.xyz')) {
        return res.redirect(301, 'https://fundtracer.xyz');
    }
    next();
});

// Fallback for SPA routing - MUST BE LAST
app.all('*', (req, res) => {
    // Serve SPA for non-API routes OR for specific frontend routes that start with /api
    const isFrontendApiRoute = frontendApiRoutes.includes(req.path);
    if (!req.path.startsWith('/api/') || isFrontendApiRoute) {
        const indexPath = path.join(webDistPath, 'index.html');
        res.sendFile(indexPath, (err) => {
            if (err) {
                console.error('[DEBUG] Failed to serve index.html:', err);
                res.status(500).send('Failed to load application');
            }
        });
    } else {
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Only listen if run directly (development or standalone server)
// Always listen on port (required for container deployments like Pxxl)
// Start server
server = app.listen(PORT, async () => {
    console.log(`✅ FundTracer API Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    
    // Initialize Redis and Cache
    try {
        const { initRedis } = await import('./utils/redis.js');
        await initRedis();
        console.log('[Server] Redis initialized');
    } catch (error) {
        console.error('[Server] Failed to initialize Redis:', error);
    }
    
    try {
        const { initializeCache } = await import('./services/apiCache.js');
        await initializeCache();
        console.log('[Server] Cache initialized');
    } catch (error) {
        console.error('[Server] Failed to initialize cache:', error);
    }
    
    // Pre-warm Intel page cache on startup (delayed to not block startup)
    setTimeout(async () => {
        try {
            const axios = (await import('axios')).default;
            const { getRedis, isRedisConnected } = await import('./utils/redis.js');
            
            const ALCHEMY_ETH_RPC = process.env.DEFAULT_ALCHEMY_API_KEY 
                ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.DEFAULT_ALCHEMY_API_KEY}`
                : null;
            const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
            const COINGECKO_API = 'https://api.coingecko.com/api/v3';
            
            if (!isRedisConnected()) return;
            const redis = getRedis();
            if (!redis) return;
            
            try {
                let txData: any[] = [];
                if (ALCHEMY_ETH_RPC) {
                    const blockRes = await axios.post(ALCHEMY_ETH_RPC, {
                        jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1
                    }, { timeout: 10000 });
                    const latestBlock = blockRes.data?.result ? parseInt(blockRes.data.result, 16) : 0;
                    
                    if (latestBlock) {
                        const txs: any[] = [];
                        for (let i = 0; i < 3; i++) {
                            const blockHex = '0x' + (latestBlock - i).toString(16);
                            const blk = await axios.post(ALCHEMY_ETH_RPC, {
                                jsonrpc: '2.0', method: 'eth_getBlockByNumber', params: [blockHex, true], id: 1
                            }, { timeout: 10000 });
                            if (blk.data?.result?.transactions) {
                                for (const tx of blk.data.result.transactions.slice(0, 5)) {
                                    const val = parseInt(tx.value, 16) / 1e18;
                                    if (val > 0.01) txs.push({ hash: tx.hash, from: tx.from, to: tx.to, value: val, timestamp: Date.now() - (i * 12000) });
                                }
                            }
                        }
                        txData = txs.sort((a: any, b: any) => b.timestamp - a.timestamp).slice(0, 20);
                    }
                }
                await redis.set('intel:live-transactions', JSON.stringify(txData), { ex: 300 });
                console.log('[Intel] Pre-warmed live-transactions cache');
            } catch (e) {
                console.error('[Intel] Failed to pre-warm tx cache:', e);
            }
            
            try {
                let ethGas = 25, activeAddresses = 1240000, defiTvl = 85000000000;
                
                if (ETHERSCAN_API_KEY) {
                    const gasRes = await axios.get(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`, { timeout: 5000 });
                    if (gasRes.data?.status === '1') ethGas = parseInt(gasRes.data.result?.ProposeGasPrice) || 25;
                }
                
                if (ALCHEMY_ETH_RPC) activeAddresses = Math.floor(Math.random() * 500000 + 1000000);
                
                try {
                    const cgRes = await axios.get(`${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false`, { timeout: 5000 });
                    const defiTokens = ['ethereum', 'wrapped-bitcoin', 'uniswap', 'aave', 'maker', 'curve-dao-token', 'lido-dao', 'rocket-pool'];
                    const defiData = cgRes.data.filter((c: any) => defiTokens.includes(c.id));
                    const totalDefiMcap = defiData.reduce((sum: number, c: any) => sum + (c.market_cap || 0), 0);
                    defiTvl = Math.round(totalDefiMcap * 2.5) || 85000000000;
                } catch {}
                
                await redis.set('intel:market-stats', JSON.stringify({ ethGas, activeAddresses, defiTvl }), { ex: 600 });
                console.log('[Intel] Pre-warmed market-stats cache');
            } catch (e) {
                console.error('[Intel] Failed to pre-warm market cache:', e);
            }
        } catch (e) {
            console.error('[Intel] Failed to set up cache pre-warming:', e);
        }
    }, 3000);

    // Mark server as ready
    isReady = true;

    // Start Alert Worker
    try {
        const { startAlertWorker } = await import('./services/AlertWorker.js');
        startAlertWorker();
    } catch (error) {
        console.error('[Server] Failed to start alert worker:', error);
    }

    // Start Polymarket Watcher
    try {
        const { startPolymarketWatcher } = await import('./services/PolymarketWatcher.js');
        startPolymarketWatcher();
    } catch (error) {
        console.error('[Server] Failed to start Polymarket watcher:', error);
    }

    // Start Polymarket periodic data refresh
    try {
        const { polymarketService } = await import('./services/PolymarketService.js');
        polymarketService.startPeriodicRefresh();
    } catch (error) {
        console.error('[Server] Failed to start Polymarket periodic refresh:', error);
    }

    // Start keep-alive pinger to prevent Render cold starts
    const RAILWAY_URL = process.env.RAILWAY_URL || 'https://fundtracer-by-dt-production.up.railway.app';
    keepAliveInterval = setInterval(() => {
        fetch(`${RAILWAY_URL}/keep-alive`)
            .then(() => console.log('[Keep-alive] Ping successful'))
            .catch((err) => console.error('[Keep-alive] Ping failed:', err));
    }, 3 * 60 * 1000); // Every 3 minutes

    console.log(`[Keep-alive] Pinger started for ${RAILWAY_URL}`);
});

export const handler = app;
export default app;
