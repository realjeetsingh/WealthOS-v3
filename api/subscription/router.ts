import { Router, Request, Response } from 'express';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const router = Router();

// Initialize Firebase SDK
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// POST /api/subscription/verify
router.post('/verify', async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return res.status(404).json({ error: "User profile not found in database" });
    }

    const data = userDoc.data();
    const isPremium = data.plan === 'pro' || data.isPremium === true;

    return res.json({
      userId,
      isPremium,
      plan: data.plan || 'free',
      premiumSince: data.premiumSince || null,
      paymentId: data.paymentId || null
    });
  } catch (error: any) {
    console.error("[Subscription] Verification error:", error);
    return res.status(500).json({ error: error.message || "Failed to verify subscription" });
  }
});

// POST /api/subscription/activate
router.post('/activate', async (req: Request, res: Response) => {
  const { userId, paymentId, orderId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    
    // Explicitly update Firestore with premium fields
    await updateDoc(userDocRef, {
      isPremium: true,
      plan: 'pro',
      financialRevealSeen: true,
      paymentId: paymentId || 'manual_activation',
      orderId: orderId || null,
      premiumSince: serverTimestamp()
    });

    console.info(`[Subscription] Activated Premium successfully for user ${userId}`);

    return res.json({
      success: true,
      message: "Subscription activated successfully",
      isPremium: true,
      plan: 'pro'
    });
  } catch (error: any) {
    console.error("[Subscription] Activation error:", error);
    return res.status(500).json({ error: error.message || "Failed to activate subscription" });
  }
});

// POST /api/subscription/restore
router.post('/restore', async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const data = userDoc.data();
    const isPremium = data.plan === 'pro' || data.isPremium === true;

    // Return the latest normalized state to allow frontend synchronisation
    return res.json({
      success: true,
      isPremium,
      plan: data.plan || 'free',
      premiumSince: data.premiumSince || null
    });
  } catch (error: any) {
    console.error("[Subscription] Restore error:", error);
    return res.status(500).json({ error: error.message || "Failed to restore subscription" });
  }
});

export default router;
