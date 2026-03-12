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
@@ -27,40 +23,34 @@ const requiredEnvVars = [
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
@@ -72,20 +62,15 @@ import contractRoutes from './routes/contracts.js';
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
@@ -102,7 +87,6 @@ function gracefulShutdown(signal: string) {
                process.exit(1);
            }
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
            console.error('❌ Force shutdown after timeout');
@@ -112,11 +96,9 @@ function gracefulShutdown(signal: string) {
        process.exit(0);
    }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Health check for shutdown state
app.use((req, res, next) => {
    if (isShuttingDown) {
@@ -128,10 +110,9 @@ app.use((req, res, next) => {
    }
    next();
});

// Security middleware
app.use(helmet({
    crossOriginOpenerPolicy: false, // Completely disable COOP for Google Sign-In
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
@@ -211,37 +192,31 @@ app.use(helmet({
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

// Explicitly handle sitemap and robots to avoid SPA fallback
app.get('/sitemap.xml', (req, res) => {
    const sitemapPath = path.join(webDistPath, 'sitemap.xml');
@@ -252,7 +227,6 @@ app.get('/sitemap.xml', (req, res) => {
        }
    });
});

app.get('/robots.txt', (req, res) => {
    const robotsPath = path.join(webDistPath, 'robots.txt');
    res.sendFile(robotsPath, (err) => {
@@ -261,9 +235,6 @@ app.get('/robots.txt', (req, res) => {
        }
    });
});



app.use(cors({
    origin: [
        'http://localhost:5173',
@@ -278,13 +249,16 @@ app.use(cors({
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
@@ -294,100 +268,76 @@ app.use((req, res, next) => {
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
@@ -398,52 +348,38 @@ import { dexScreenerRoutes } from './routes/dexscreener.js';
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

// NEW: Polymarket Routes
import polymarketRoutes from './routes/polymarket.js';
apiRouter.use('/polymarket', publicLimiter, polymarketRoutes);

// Mount router at both /api (for local dev) and root (for Netlify environment where /api might be stripped)
app.use('/api', apiRouter);
app.use('/', apiRouter);

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

// Fallback for SPA routing - MUST BE LAST
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
@@ -458,7 +394,6 @@ app.get('*', (req, res) => {
        }
    });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
@@ -467,23 +402,18 @@ app.use((err: any, req: express.Request, res: express.Response, next: express.Ne
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

    // Start Polymarket Watcher
    try {
        const { startPolymarketWatcher } = await import('./services/PolymarketWatcher.js');
@@ -492,6 +422,5 @@ server = app.listen(PORT, async () => {
        console.error('[Server] Failed to start Polymarket watcher:', error);
    }
});

export const handler = app;
export default app;
