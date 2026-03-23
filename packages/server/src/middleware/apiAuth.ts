/**
 * FundTracer API Authentication Middleware
 * Validates API keys for external developer access
 */

import { Request, Response, NextFunction } from 'express';
import {
  APIKey,
  validateAPIKey,
  checkRateLimit,
  hasScope,
  API_SCOPES,
  APIScope,
  RateLimitInfo,
} from '../models/apiKey.js';
import { getUserAPIKeys } from '../models/apiKey.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      apiKey?: APIKey;
      rateLimitInfo?: RateLimitInfo;
    }
  }
}

// Cache for validated keys (1 minute TTL)
const keyCache = new Map<string, { key: APIKey; expires: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

// Helper to get from cache
function getCachedKey(rawKey: string): APIKey | null {
  const cached = keyCache.get(rawKey);
  if (cached && cached.expires > Date.now()) {
    return cached.key;
  }
  keyCache.delete(rawKey);
  return null;
}

// Helper to set cache
function setCachedKey(rawKey: string, key: APIKey): void {
  keyCache.set(rawKey, { key, expires: Date.now() + CACHE_TTL });
}

// Extract API key from request
function extractAPIKey(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string') {
    return apiKeyHeader;
  }
  
  // Check query parameter (for WebSocket URLs)
  const queryKey = req.query.api_key;
  if (typeof queryKey === 'string') {
    return queryKey;
  }
  
  return null;
}

// API Key Authentication Middleware
export async function apiAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const rawKey = extractAPIKey(req);
  
  if (!rawKey) {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_API_KEY',
        message: 'API key is required. Provide it via Authorization header, X-API-Key header, or api_key query parameter.',
      },
    });
    return;
  }
  
  try {
    // Check cache first
    let key = getCachedKey(rawKey);
    
    if (!key) {
      // Validate key
      key = await validateAPIKey(rawKey);
      
      if (!key) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'The provided API key is invalid or has been deactivated.',
          },
        });
        return;
      }
      
      // Cache the validated key
      setCachedKey(rawKey, key);
    }
    
    // Check rate limit
    const rateLimitInfo = await checkRateLimit(key);
    
    if (rateLimitInfo.remaining <= 0) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Daily quota exceeded (${rateLimitInfo.limit} requests/day). Upgrade to Pro for 10,000 requests/day.`,
          details: {
            limit: rateLimitInfo.limit,
            used: rateLimitInfo.limit,
            resetAt: new Date(rateLimitInfo.reset).toISOString(),
          },
        },
        meta: {
          rateLimit: {
            limit: rateLimitInfo.limit,
            remaining: 0,
            reset: Math.floor(rateLimitInfo.reset / 1000),
          },
        },
      });
      return;
    }
    
    // Attach key and rate limit info to request
    req.apiKey = key;
    req.rateLimitInfo = rateLimitInfo;
    
    // Add rate limit headers to response
    res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit);
    res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining - 1);
    res.setHeader('X-RateLimit-Reset', Math.floor(rateLimitInfo.reset / 1000));
    
    next();
  } catch (error) {
    console.error('API Auth Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'An error occurred while validating your API key.',
      },
    });
  }
}

// Scope-based authorization middleware
export function requireScope(...requiredScopes: APIScope[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
      return;
    }
    
    // Check if user has any of the required scopes
    const hasRequiredScope = requiredScopes.some(scope => hasScope(req.apiKey!, scope));
    
    if (!hasRequiredScope) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_SCOPE',
          message: `This endpoint requires one of the following scopes: ${requiredScopes.join(', ')}`,
        },
      });
      return;
    }
    
    next();
  };
}

// Read-only scope middleware
export const requireReadScope = requireScope(
  API_SCOPES.READ_ADDRESS,
  API_SCOPES.READ_TRANSACTIONS,
  API_SCOPES.READ_GRAPH,
  API_SCOPES.ADMIN
);

// Write scope middleware for alerts/webhooks
export const requireWriteScope = requireScope(
  API_SCOPES.WRITE_ALERTS,
  API_SCOPES.WRITE_WEBHOOKS,
  API_SCOPES.ADMIN
);

// Admin scope middleware
export const requireAdminScope = requireScope(API_SCOPES.ADMIN);

// Test-only key validation (for sandbox/testing)
export function isTestKey(key: APIKey): boolean {
  return key.keyType === 'test';
}

// Check if request is from test key
export function requireLiveKey(req: Request, res: Response, next: NextFunction): void {
  if (req.apiKey && isTestKey(req.apiKey)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'TEST_KEY_NOT_ALLOWED',
        message: 'This endpoint does not accept test keys. Please use a live API key.',
      },
    });
    return;
  }
  next();
}

// Optional API auth - doesn't fail if no key provided
export async function optionalApiAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const rawKey = extractAPIKey(req);
  
  if (!rawKey) {
    // No key provided, continue without auth
    next();
    return;
  }
  
  // Key provided, validate it
  try {
    let key = getCachedKey(rawKey);
    
    if (!key) {
      key = await validateAPIKey(rawKey);
      if (key) {
        setCachedKey(rawKey, key);
      }
    }
    
    if (key) {
      req.apiKey = key;
      const rateLimitInfo = await checkRateLimit(key);
      req.rateLimitInfo = rateLimitInfo;
      
      res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit);
      res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
      res.setHeader('X-RateLimit-Reset', Math.floor(rateLimitInfo.reset / 1000));
    }
    
    next();
  } catch (error) {
    // On error, just continue without auth
    console.error('Optional API Auth Error:', error);
    next();
  }
}

// Cache invalidation helper (call when key is deactivated/updated)
export function invalidateKeyCache(rawKey: string): void {
  keyCache.delete(rawKey);
}

// Clear entire cache (admin operation)
export function clearKeyCache(): void {
  keyCache.clear();
}
