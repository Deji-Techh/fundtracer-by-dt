import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

/**
 * Request ID Middleware
 * Adds a unique request ID to each request for distributed tracing
 * Also logs request/response details for debugging
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Generate or extract request ID
  req.requestId = req.headers['x-request-id'] as string || randomUUID();
  req.startTime = Date.now();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);
  
  // Log request start
  console.log(`[${req.requestId}] ${req.method} ${req.path} - Started`);
  
  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function(body: any) {
    const duration = Date.now() - req.startTime;
    const statusCode = res.statusCode;
    
    // Log completion
    console.log(`[${req.requestId}] ${req.method} ${req.path} - ${statusCode} (${duration}ms)`);
    
    // Log errors
    if (statusCode >= 400) {
      console.error(`[${req.requestId}] Error Response:`, {
        statusCode,
        body: typeof body === 'object' ? JSON.stringify(body) : body,
        duration: `${duration}ms`,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
    }
    
    return originalJson(body);
  };
  
  // Log errors
  res.on('finish', () => {
    if (res.statusCode >= 500) {
      const duration = Date.now() - req.startTime;
      console.error(`[${req.requestId}] Server Error:`, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
    }
  });
  
  next();
}

/**
 * Get request context for logging
 * Use this in route handlers to include request ID in logs
 */
export function getRequestContext(req: Request) {
  return {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    startTime: req.startTime
  };
}

export default requestIdMiddleware;
