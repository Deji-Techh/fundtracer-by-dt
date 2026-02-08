import { Router, Request, Response } from 'express';
import { getFirestore } from '../firebase.js';

const router = Router();

// Health check status cache
let lastHealthCheck: any = null;
let lastCheckTime = 0;
const CACHE_TTL = 30000; // 30 seconds

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: {
      status: 'ok' | 'error';
      responseTime: number;
      message?: string;
    };
    memory: {
      status: 'ok' | 'warning' | 'critical';
      used: number;
      total: number;
      percentage: number;
    };
    apiKeys: {
      status: 'ok' | 'error';
      alchemy: boolean;
      configured: number;
    };
  };
}

async function checkDatabase(): Promise<HealthStatus['checks']['database']> {
  const start = Date.now();
  try {
    const db = getFirestore();
    // Simple ping to check connectivity
    await db.collection('health').doc('ping').get();
    return {
      status: 'ok',
      responseTime: Date.now() - start,
    };
  } catch (error: any) {
    return {
      status: 'error',
      responseTime: Date.now() - start,
      message: error.message,
    };
  }
}

function checkMemory(): HealthStatus['checks']['memory'] {
  const used = process.memoryUsage();
  const total = require('os').totalmem();
  const usedMB = Math.round(used.heapUsed / 1024 / 1024);
  const totalMB = Math.round(total / 1024 / 1024);
  const percentage = Math.round((usedMB / totalMB) * 100);

  let status: 'ok' | 'warning' | 'critical' = 'ok';
  if (percentage > 80) status = 'critical';
  else if (percentage > 60) status = 'warning';

  return {
    status,
    used: usedMB,
    total: totalMB,
    percentage,
  };
}

function checkApiKeys(): HealthStatus['checks']['apiKeys'] {
  const alchemyKey = process.env.DEFAULT_ALCHEMY_API_KEY;
  const configuredKeys = [
    process.env.JWT_SECRET,
    process.env.FIREBASE_SERVICE_ACCOUNT,
    alchemyKey,
  ].filter(Boolean).length;

  return {
    status: alchemyKey ? 'ok' : 'error',
    alchemy: !!alchemyKey,
    configured: configuredKeys,
  };
}

async function performHealthCheck(): Promise<HealthStatus> {
  const [database, memory, apiKeys] = await Promise.all([
    checkDatabase(),
    checkMemory(),
    checkApiKeys(),
  ]);

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (database.status === 'error' || apiKeys.status === 'error') {
    status = 'unhealthy';
  } else if (memory.status === 'warning' || memory.status === 'critical') {
    status = 'degraded';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database,
      memory,
      apiKeys,
    },
  };
}

// Basic health check (public)
router.get('/', async (req: Request, res: Response) => {
  // Use cached result if available and fresh
  const now = Date.now();
  if (lastHealthCheck && now - lastCheckTime < CACHE_TTL) {
    return res.json(lastHealthCheck);
  }

  try {
    const health = await performHealthCheck();
    lastHealthCheck = health;
    lastCheckTime = now;

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Detailed health check (authenticated)
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const health = await performHealthCheck();
    
    // Add additional details for authenticated requests
    const detailed = {
      ...health,
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
      },
      env: {
        port: process.env.PORT,
        nodeEnv: process.env.NODE_ENV,
      },
    };

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(detailed);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Liveness probe (Kubernetes-style)
router.get('/live', (req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Readiness probe (Kubernetes-style)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    await db.collection('health').doc('ping').get();
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
  }
});

export default router;
