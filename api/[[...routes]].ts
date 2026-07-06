import app from './index';

// Vercel serverless entry — delegate all requests to the existing Express app
export default function handler(req: any, res: any) {
  return app(req, res);
}
