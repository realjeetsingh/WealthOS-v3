import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from './index';

/**
 * Vercel Serverless Function Handler
 * 
 * This file serves as the entry point for all API routes.
 * Vercel auto-detects this catch-all route handler and bundles
 * all imported dependencies (routers, middleware, utilities).
 * 
 * The Express app is imported and used as a middleware handler,
 * ensuring all routers are included in the bundled function.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Proxy all requests to the Express app
  return app(req, res);
}
