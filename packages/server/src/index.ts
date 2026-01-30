/**
 * FundTracer Secure API Server
 * Handles authentication, secure API key management, and anti-abuse limits.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables FIRST
dotenv.config();

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

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "connect-src": ["'self'", "https://rpc.linea.build", "wss://relay.walletconnect.org", "https://api.web3modal.org", "https://secure.walletconnect.org", "https://*.walletconnect.com", "https://*.walletconnect.org", "https://*.rpc.linea.build"],
            "frame-src": ["'self'", "https://secure.walletconnect.org", "verify.walletconnect.com"],
            "img-src": ["'self'", "data:", "blob:", "https://api.web3modal.org", "https://walletconnect.org", "https://*.walletconnect.com"],
            "script-src": ["'self'", "'unsafe-inline'"], // unsafe-inline often needed for some wallet injection scripts, refine if possible
        },
    },
}));

// DEBUG LOGGING - Log every request
app.use((req, res, next) => {
    console.log(`[DEBUG] Request: ${req.method} ${req.url}`);
    console.log(`[DEBUG] Path: ${req.path}`);
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

console.log('[DEBUG] CWD:', process.cwd());
console.log('[DEBUG] Serving static files from:', webDistPath);
console.log('[DEBUG] index.html exists:', fs.existsSync(path.join(webDistPath, 'index.html')));

app.use(express.static(webDistPath));



app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        /^https:\/\/.*\.netlify\.app$/,
        /^https:\/\/.*\.firebaseapp\.com$/,
        /^https:\/\/.*\.pxxl\.click$/,
        'https://fundtracer.xyz',
        'https://www.fundtracer.xyz',
        /^https:\/\/.*\.fundtracer\.xyz$/
    ],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Increased for large wallet lists

// Initialize Firebase Admin
try {
    initializeFirebase();
} catch (error) {
    console.error('[WARN] Firebase initialization failed. Auth features may be limited.', error);
}

// Start Payment Listener
// Start Payment Listener - robustly
try {
    new PaymentListener().start();
} catch (err) {
    console.warn('[WARN] Failed to start PaymentListener (acceptable in serverless):', err);
}

console.log('[DEBUG] Default Alchemy API Key Present:', !!process.env.DEFAULT_ALCHEMY_API_KEY);
console.log('[DEBUG] Default Alchemy API Key Length:', process.env.DEFAULT_ALCHEMY_API_KEY?.length);

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
apiRouter.use('/auth', authRoutes); // Public auth route
apiRouter.use('/contracts', contractRoutes); // Public contract lookup
apiRouter.use('/payment', paymentRoutes); // Payment verification
apiRouter.use('/analyze', authMiddleware, usageMiddleware, analyzeRoutes);
apiRouter.use('/dune', authMiddleware, duneRoutes);
import { trackingRoutes } from './routes/tracking.js';
apiRouter.use('/analytics', trackingRoutes); // Public analytics route

import { adminRoutes } from './routes/admin.js';
apiRouter.use('/admin', authMiddleware, adminRoutes);

// Mount router at both /api (for local dev) and root (for Netlify environment where /api might be stripped)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Fallback for SPA routing - MUST BE LAST
app.get('*', (req, res) => {
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
if (true) {
    app.listen(PORT, () => {
        console.log(`FundTracer API Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

export const handler = app;
export default app;
