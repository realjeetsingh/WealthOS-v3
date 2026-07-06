import { Router, Request, Response } from 'express';
import { config, isPlaceholder } from '../shared/env';

const router = Router();

// GET /api/system/health
router.get('/health', (req: Request, res: Response) => {
  const isRazorpayConfigured = 
    config.RAZORPAY_KEY_ID && 
    config.RAZORPAY_KEY_SECRET && 
    !isPlaceholder(config.RAZORPAY_KEY_ID) && 
    !isPlaceholder(config.RAZORPAY_KEY_SECRET);

  return res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      ai: !!config.GEMINI_API_KEY && !isPlaceholder(config.GEMINI_API_KEY) ? "active" : "inactive",
      payments: isRazorpayConfigured ? "active" : "sandbox_simulated",
      markets: !!config.FINNHUB_API_KEY && !isPlaceholder(config.FINNHUB_API_KEY) ? "active" : "inactive"
    }
  });
});

export default router;
