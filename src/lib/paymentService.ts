import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'sonner';

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string; // Add this
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

export const handleUpgrade = async (userId: string, userEmail?: string, userName?: string) => {
  if (!userId) {
    console.error("User ID is missing");
    return;
  }

  const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
  console.log("WealthOS Payments: Initializing Razorpay modal with public Key ID");

  if (!key || key === 'rzp_test_placeholder') {
    console.error("Razorpay Key ID is missing or invalid.");
    toast.error("Payment configuration error. Please ensure VITE_RAZORPAY_KEY_ID is set.");
    return;
  }

  if (!(window as any).Razorpay) {
    console.error("Razorpay SDK not loaded");
    toast.error("Payment system is still loading. Please try again in a moment.");
    return;
  }

  try {
    toast.loading("Initializing payment...");
    
    // STEP 1: Create Order on Backend
    const orderResponse = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!orderResponse.ok) throw new Error("Could not create payment order");
    
    const order = await orderResponse.json();
    toast.dismiss();

    const options: RazorpayOptions = {
      key: key,
      amount: order.amount,
      currency: order.currency,
      name: "WealthOS",
      description: "Premium Upgrade",
      order_id: order.id, // THE CRITICAL PRODUCTION ADDITION
      prefill: {
        name: userName,
        email: userEmail,
      },
      theme: {
        color: "#4f46e5",
      },
      handler: async (response: any) => {
        console.log("Payment successful, verifying signature...");
        
        try {
          // STEP 2: Verify Payment on Backend
          const verifyResponse = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          if (!verifyResponse.ok) throw new Error("Payment verification failed");

          // STEP 3: Update local state via Firestore (verified)
          const userDocRef = doc(db, 'users', userId);
          await updateDoc(userDocRef, {
            isPremium: true,
            plan: 'pro',
            paymentId: response.razorpay_payment_id,
            premiumSince: serverTimestamp()
          });
          
          toast.success("Upgrade successful. Premium unlocked.");
        } catch (error) {
          console.error("Verification error:", error);
          toast.error("Payment received, but verification failed. Please contact support.");
        }
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      toast.error("Payment failed: " + response.error.description);
    });
    rzp.open();
  } catch (err) {
    toast.dismiss();
    console.error("Razorpay workflow error:", err);
    toast.error("Could not start payment process. Please try again.");
  }
};
