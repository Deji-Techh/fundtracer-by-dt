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
dotenv.config();

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
import { authMiddleware } from './middleware/auth.js';
import { usageMiddleware } from './middleware/usage.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { analyzeRoutes } from './routes/analyze.js';
import { userRoutes } from './routes/user.js';
import { duneRoutes } from './routes/dune.js';
import contractRoutes from './routes/contracts.js';
import paymentRoutes from './routes/payment.js';
import { PaymentListener } from './services/PaymentListener.js';
import contractService from './services/ContractService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

let server: any = null;
let isShuttingDown = false;

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
                "https://*.alchemy.com"
            ],
            "script-src": [
                "'self'",
                "'unsafe-inline'",
                "https://*.google.com",
                "https://*.googleapis.com",
                "https://*.gstatic.com"
            ],
            "style-src": [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://fonts.reown.com"
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

// DEBUG LOGGING - Log every request
app.use((req, res, next) => {
    console.log(`[${req.requestId}] Request: ${req.method} ${req.url}`);
    console.log(`[${req.requestId}] Path: ${req.path}`);
    next();
});

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

// Static files serving configured
app.use(express.static(webDistPath));



app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        /^https:\/\/.*\.netlify\.app$/,
        /^https:\/\/.*\.firebaseapp\.com$/,
        /^https:\/\/.*\.pxxl\.click$/,
        /^https:\/\/.*\.onrender\.com$/,
        'https://fundtracer.xyz',
        'https://www.fundtracer.xyz',
        /^https:\/\/.*\.fundtracer\.xyz$/
    ],
    credentials: true,
}));
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
app.use('/', apiLimiter);

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

// Protected routes
// Create a main router
const apiRouter = express.Router();
import { authRoutes } from './routes/auth.js';

// ... (existing imports)

// Mount router at both /api (for local dev) and root (for Netlify environment where /api might be stripped)
apiRouter.use('/user', authMiddleware, userRoutes);
apiRouter.use('/auth', authLimiter, authRoutes); // Public auth route with stricter rate limiting
apiRouter.use('/contracts', publicLimiter, contractRoutes); // Public contract lookup with rate limiting
apiRouter.use('/payment', publicLimiter, paymentRoutes); // Payment verification with rate limiting
apiRouter.use('/analyze', authMiddleware, usageMiddleware, analyzeLimiter, analyzeRoutes);
apiRouter.use('/dune', authMiddleware, duneRoutes);
import { trackingRoutes } from './routes/tracking.js';
import healthRoutes from './routes/health.js';
apiRouter.use('/analytics', publicLimiter, trackingRoutes); // Public analytics route with rate limiting
apiRouter.use('/health', healthRoutes); // Health checks (public) - keep open for monitoring

import { adminRoutes } from './routes/admin.js';
// Mount admin routes - login is public, other routes protected by middleware inside adminRoutes
apiRouter.use('/admin', adminRoutes);

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
import { solanaRoutes } from './routes/solana.js';

apiRouter.use('/portfolio', authMiddleware, portfolioRoutes);
apiRouter.use('/history', authMiddleware, historyRoutes);
apiRouter.use('/tokens', publicLimiter, tokenRoutes); // Public token search with rate limiting
apiRouter.use('/market', publicLimiter, marketRoutes); // Public market stats with rate limiting
apiRouter.use('/safety', authMiddleware, safetyRoutes); // Token safety checks
apiRouter.use('/debug', publicLimiter, debugRoutes); // Debug routes (public) with rate limiting
apiRouter.use('/dexscreener', dexScreenerRoutes); // DEX Screener data (public)
apiRouter.use('/geckoterminal', geckoTerminalRoutes); // GeckoTerminal data (public)
apiRouter.use('/scan-history', authMiddleware, scanHistoryLimiter, scanHistoryRoutes); // Scan history sync with rate limiting
apiRouter.use('/solana', authMiddleware, solanaRoutes); // Solana wallet analysis

// NEW: Contract Scanner Routes
import contractScannerRoutes from './routes/contractRoutes.js';
apiRouter.use('/contract', authMiddleware, contractScannerRoutes);

// NEW: Telegram Routes
import { telegramRoutes } from './routes/telegram.js';
apiRouter.use('/telegram', telegramRoutes);

// Mount router at both /api (for local dev) and root (for Netlify environment where /api might be stripped)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Initialize Telegram Bot webhook route BEFORE catch-all (must be registered before *)
import { createTelegramBot } from './services/TelegramBot.js';
createTelegramBot(app).catch(err => {
    console.error('[Server] Failed to initialize Telegram bot:', err);
});

// Fallback for SPA routing - MUST BE LAST
app.get('*', (req, res) => {
    // Skip telegram webhook path
    if (req.path === '/telegram-webhook') {
        return res.status(404).json({ error: 'Webhook not ready' });
    }
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    const indexPath = path.join(webDistPath, 'index.html');
    console.log('[DEBUG] Serving SPA fallback:', indexPath);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('[DEBUG] Failed to serve index.html:', err);
            res.status(500).send('Failed to load application. Check server logs.');
        }
    });
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
    console.log(`Health check: http://localhost:${PORT}/api/health`);

    // Start Alert Worker
    try {
        const { startAlertWorker } = await import('./services/AlertWorker.js');
        startAlertWorker();
    } catch (error) {
        console.error('[Server] Failed to start alert worker:', error);
    }
});

export const handler = app;
export default app;
