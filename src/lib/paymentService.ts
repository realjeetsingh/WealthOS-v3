import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
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

  const key = (import.meta as any).env.VITE_RAZORPAY_KEY_ID;
  console.log("Razorpay Key ID present:", !!key);

  if (!key || key === 'rzp_test_placeholder') {
    console.error("Razorpay Key ID is missing or invalid. Current value:", key);
    alert("Payment configuration error. Please ensure VITE_RAZORPAY_KEY_ID is set in the Settings menu (not just .env.example).");
    return;
  }

  if (!(window as any).Razorpay) {
    console.error("Razorpay SDK not loaded");
    alert("Payment system is still loading. Please try again in a moment.");
    return;
  }

  console.log("Opening Razorpay modal for user:", userId);
  console.log("Current Auth UID:", auth.currentUser?.uid);

  const options: RazorpayOptions = {
    key: key,
    amount: 29900, // ₹299 in paise
    currency: "INR",
    name: "WealthOS",
    description: "Premium Upgrade",
    prefill: {
      name: userName,
      email: userEmail,
    },
    theme: {
      color: "#4f46e5", // indigo-600
    },
    handler: async (response: any) => {
      console.log("Payment successful:", response);
      const paymentId = response.razorpay_payment_id;
      
      try {
        const userDocRef = doc(db, 'users', userId);
        console.log("Updating Firestore: isPremium -> true for user:", userId);
        await updateDoc(userDocRef, {
          isPremium: true,
          paymentId: paymentId,
          premiumSince: serverTimestamp()
        });
        console.log("Firestore update complete. Real-time snapshot should trigger UI refresh.");
        alert("Upgrade successful. Premium unlocked.");
      } catch (error) {
        console.error("Error updating premium status:", error);
        alert("Payment successful, but failed to update status. Please contact support.");
      }
    },
  };

  try {
    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      console.error("Payment failed:", response.error);
      alert("Payment failed: " + response.error.description);
    });
    rzp.open();
  } catch (err) {
    console.error("Razorpay initialization error:", err);
    alert("Could not open payment window. Please check your internet connection.");
  }
};
