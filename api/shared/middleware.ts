import { Request, Response, NextFunction } from 'express';

// Standardized JSON response helpers
export const sendSuccess = (res: Response, data: any, message?: string, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data
  });
};

export const sendError = (res: Response, message: string, status = 500, details?: any) => {
  const isProduction = process.env.NODE_ENV === "production";
  return res.status(status).json({
    success: false,
    error: message,
    ...(isProduction ? {} : { details })
  });
};

// Centralized error handling middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Error] Centralized Catch: ${err.message || err}`, err.stack);
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || "An unexpected error occurred on the server.";
  
  return sendError(res, message, status, err.stack);
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  if (!req.originalUrl.startsWith('/api')) {
    return next();
  }
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.info(`[Request] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
};

// Simple rate limiter implementation using in-memory store
const ipCache = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per IP per minute

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (!req.originalUrl.startsWith('/api')) {
    return next();
  }
  const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  const now = Date.now();
  
  const record = ipCache.get(ip);
  if (!record || now > record.resetTime) {
    ipCache.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    });
    return next();
  }
  
  record.count++;
  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    console.warn(`[Rate Limit] Exceeded for IP ${ip} on route ${req.originalUrl}`);
    return res.status(429).json({
      error: "Too many requests from this IP, please try again in a minute.",
      type: "RATE_LIMIT"
    });
  }
  
  next();
};
