import { Router, Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config, isPlaceholder } from '../shared/env';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const router = Router();

// Initialize Firebase JS SDK on server-side
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Initialize Razorpay client lazily to avoid startup crashes if keys are invalid
const getRazorpayClient = (): Razorpay | null => {
  const keyId = config.RAZORPAY_KEY_ID;
  const keySecret = config.RAZORPAY_KEY_SECRET;

  const isRazorpayConfigured = 
    keyId && 
    keySecret && 
    !isPlaceholder(keyId) && 
    !isPlaceholder(keySecret);

  if (!isRazorpayConfigured) {
    return null;
  }

  try {
    return new Razorpay({
      key_id: keyId!,
      key_secret: keySecret!
    });
  } catch (error) {
    console.error("[Payments] Failed to initialize Razorpay client:", error);
    return null;
  }
};

// POST /api/payments/create-order
router.post('/create-order', async (req: Request, res: Response) => {
  console.info("[Payments] Received Request for POST /api/payments/create-order");

  // Objective 4 & 2: Ensure API function uses process.env for server-side secrets, and log existence (without exposing values)
  const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || config.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET || config.RAZORPAY_KEY_SECRET;

  const keyIdExists = !!keyId;
  const keySecretExists = !!keySecret;
  const keyIdIsPlaceholder = isPlaceholder(keyId);
  const keySecretIsPlaceholder = isPlaceholder(keySecret);

  console.info(`[Payments] Environment Check - keyIdExists: ${keyIdExists}, keyIdIsPlaceholder: ${keyIdIsPlaceholder}`);
  console.info(`[Payments] Environment Check - keySecretExists: ${keySecretExists}, keySecretIsPlaceholder: ${keySecretIsPlaceholder}`);

  let razorpay: Razorpay | null = null;
  let initSuccess = false;
  let initError: any = null;

  // Objective 5: Verify the Razorpay SDK initializes correctly
  if (keyIdExists && keySecretExists && !keyIdIsPlaceholder && !keySecretIsPlaceholder) {
    try {
      razorpay = new Razorpay({
        key_id: keyId!,
        key_secret: keySecret!
      });
      initSuccess = true;
      console.info("[Payments] Razorpay SDK initialized successfully.");
    } catch (err: any) {
      initSuccess = false;
      initError = err;
      console.error("[Payments] Razorpay SDK initialization error:", err);
    }
  } else {
    console.warn("[Payments] Razorpay credentials are not fully configured or contain placeholders. Razorpay client won't be initialized.");
  }

  try {
    if (!razorpay) {
      if (initError) {
        // Return structured JSON error for failed client initialization
        return res.status(500).json({
          success: false,
          stage: "initialize-client",
          code: "INIT_ERROR",
          message: "Razorpay SDK failed to initialize correctly.",
          details: initError.message || String(initError)
        });
      }

      console.info("[Payments] Razorpay SDK not configured. Emitting simulated order.");
      return res.json({
        id: `order_mock_${Date.now()}`,
        amount: 19900, // ₹199
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        is_mock: true,
        message: "Simulated order due to missing credentials"
      });
    }

    try {
      const options = {
        amount: 19900, // ₹199
        currency: "INR",
        receipt: `receipt_${Date.now()}`
      };
      
      console.info("[Payments] Calling Razorpay SDK orders.create with options:", JSON.stringify(options));
      const order = await razorpay.orders.create(options);
      console.info(`[Payments] Razorpay Order created successfully: ${order.id}`);
      
      // Return only what is needed, without exposing keys
      return res.json({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        is_mock: false
      });
    } catch (apiError: any) {
      // Objective 6: If order creation fails, log the complete Razorpay error object to the Vercel runtime logs
      console.error("[Payments] Razorpay order creation failed with API Error:", apiError);
      
      // Objective 3: Return structured JSON errors to the frontend instead of a generic message
      return res.status(400).json({
        success: false,
        stage: "create-order",
        code: apiError.code || "RAZORPAY_API_ERROR",
        message: apiError.message || "Could not create secure payment order.",
        details: typeof apiError === 'object' ? JSON.stringify(apiError) : String(apiError)
      });
    }
  } catch (error: any) {
    console.error("[Payments] Fatal order generation error:", error);
    return res.status(500).json({
      success: false,
      stage: "fatal-handler",
      code: error.code || "FATAL_ERROR",
      message: error.message || "An unexpected fatal error occurred during order generation.",
      details: String(error)
    });
  }
});

// Common payment verification logic
const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  if (orderId.startsWith("order_mock_")) {
    console.info("[Payments] Verifying mock sandbox payment:", orderId);
    return true;
  }

  const keySecret = config.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error("Razorpay secret key not configured.");
  }

  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === signature;
};

// Verification endpoint helper
const handleVerification = async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id) {
    return res.status(400).json({ error: "Order ID and Payment ID are required" });
  }

  try {
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (isValid) {
      // If userId is passed, let's proactively activate premium on Firestore server-side!
      if (userId) {
        try {
          const userDocRef = doc(db, 'users', userId);
          await updateDoc(userDocRef, {
            isPremium: true,
            plan: 'pro',
            financialRevealSeen: true,
            paymentId: razorpay_payment_id,
            premiumSince: serverTimestamp()
          });
          console.log(`[Payments] Premium activated for user ${userId} on Firestore`);
        } catch (dbError) {
          console.error(`[Payments] Failed to update Firestore for user ${userId}:`, dbError);
          // Don't fail the verification response if DB update failed, client will try to update too.
        }
      }

      return res.json({ status: "ok", message: "Payment verified successfully" });
    } else {
      return res.status(400).json({ status: "failed", message: "Invalid payment signature" });
    }
  } catch (error: any) {
    console.error("[Payments] Verification Error:", error);
    return res.status(500).json({ error: error.message || "Verification failed" });
  }
};

// POST /api/payments/verify-payment (New standard)
router.post('/verify-payment', handleVerification);

// POST /api/payments/verify (Backward compatibility)
router.post('/verify', handleVerification);

// POST /api/payments/webhook
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  console.info("[Payments] Received Razorpay Webhook Event");

  try {
    if (secret && signature) {
      const shasum = crypto.createHmac('sha256', secret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        console.warn("[Payments] Webhook signature verification failed");
        return res.status(400).json({ error: "Invalid signature" });
      }
    }

    const event = req.body.event;
    console.info(`[Payments] Webhook Event Type: ${event}`);

    // If order was paid, check if we can parse userId and auto-activate
    if (event === 'order.paid' || event === 'payment.captured') {
      const paymentEntity = req.body.payload?.payment?.entity;
      const notes = paymentEntity?.notes || req.body.payload?.order?.entity?.notes || {};
      const userId = notes.userId;

      if (userId) {
        console.info(`[Payments] Activating subscription from Webhook for user: ${userId}`);
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          isPremium: true,
          plan: 'pro',
          financialRevealSeen: true,
          paymentId: paymentEntity?.id || 'webhook_captured',
          premiumSince: serverTimestamp()
        });
      }
    }

    return res.json({ status: "ok" });
  } catch (error: any) {
    console.error("[Payments] Webhook Error:", error);
    return res.status(500).json({ error: error.message || "Webhook processing failed" });
  }
});

export default router;
