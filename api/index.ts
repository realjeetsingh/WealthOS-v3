import express from 'express';
import paymentsRouter from './payments/router';
import aiRouter from './ai/router';
import marketsRouter from './markets/router';
import subscriptionRouter from './subscription/router';
import systemRouter from './system/router';
import { errorHandler, requestLogger, rateLimiter } from './shared/middleware';
import { validateEnv } from './shared/env';

// Initialize and validate server environment variables
validateEnv();

const app = express();

// Set up custom CORS headers (no external dependency required)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-razorpay-signature");
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Parse standard JSON bodies
app.use(express.json());

// Middlewares
app.use(requestLogger);
app.use(rateLimiter);

// Register routes
app.use('/api/payments', paymentsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/markets', marketsRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/system', systemRouter);

// Centralized Catch-All Error Handler
app.use(errorHandler);

export default app;
