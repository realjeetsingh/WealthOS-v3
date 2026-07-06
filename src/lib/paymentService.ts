import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { trackEvent } from '../services/analytics';
import { PREMIUM_PRICING } from './pricingConfig';

// Standardized payment statuses for normalized results
export type PaymentStatus = 'success' | 'cancelled' | 'failed' | 'timeout' | 'network_error';

export interface PaymentResult {
  status: PaymentStatus;
  paymentId?: string;
  orderId?: string;
  error?: string;
}

export interface CheckoutOptions {
  userId: string;
  userEmail?: string;
  userName?: string;
  plan?: string;
  amount?: number;
}

// Normalized provider interface to keep UI decoupled from gateway details
export interface PaymentProvider {
  initialize(): Promise<void>;
  startCheckout(options: CheckoutOptions): Promise<PaymentResult>;
  getProviderName(): string;
}

// 1. Sandbox Payment Provider (Development/Localhost/Testing/QA)
export class SandboxPaymentProvider implements PaymentProvider {
  async initialize(): Promise<void> {
    console.info("SandboxPaymentProvider: Initializing mock environment.");
    return Promise.resolve();
  }

  getProviderName(): string {
    return 'Sandbox';
  }

  startCheckout(options: CheckoutOptions): Promise<PaymentResult> {
    const { userId, userEmail, userName } = options;
    if (!userId) {
      return Promise.resolve({ status: 'failed', error: 'User ID is required' });
    }

    return new Promise<PaymentResult>((resolve) => {
      // Remove any existing simulator dialog first
      const existing = document.getElementById('mock-payment-overlay');
      if (existing) {
        existing.remove();
      }

      const overlay = document.createElement('div');
      overlay.id = "mock-payment-overlay";
      overlay.className = "fixed inset-0 bg-[#070A13]/95 backdrop-blur-md flex items-center justify-center z-[9999] p-4 font-sans";

      const card = document.createElement('div');
      card.className = "bg-[#0E1324] border border-indigo-500/30 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6 text-white text-center";

      card.innerHTML = `
        <div class="flex justify-center">
          <div class="w-16 h-16 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/30">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
        </div>
        
        <div class="space-y-2">
          <div class="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
            ⚡ Sandbox Simulator
          </div>
          <h3 class="text-2xl font-black tracking-tight">Active ${PREMIUM_PRICING.planName}</h3>
          <p class="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
            Razorpay credentials are in test mode or unavailable. Use this sandbox session to immediately unlock and evaluate all premium features.
          </p>
        </div>

        <div class="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between text-left">
          <div>
            <h4 class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Upgrade Account</h4>
            <p class="text-sm font-bold text-white mt-0.5">${userName || 'Premium Member'}</p>
          </div>
          <div class="text-right">
            <span class="text-xs font-medium text-gray-500 line-through">${PREMIUM_PRICING.formattedOriginalPrice}</span>
            <p class="text-lg font-black text-indigo-400">${PREMIUM_PRICING.formattedPrice}</p>
          </div>
        </div>

        <div class="space-y-3 pt-2">
          <button id="mock-pay-success" class="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 cursor-pointer">
            Authorize Payment
          </button>
          <button id="mock-pay-fail" class="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl text-sm font-black uppercase tracking-widest transition-all border border-white/5 cursor-pointer">
            Cancel Checkout
          </button>
        </div>
      `;

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      const btnSuccess = card.querySelector('#mock-pay-success') as HTMLButtonElement;
      const btnFail = card.querySelector('#mock-pay-fail') as HTMLButtonElement;

      btnSuccess.onclick = async () => {
        btnSuccess.disabled = true;
        btnSuccess.innerText = "Processing Transaction...";
        trackEvent('payment_started');

        try {
          const mockPaymentId = `pay_mock_${Date.now()}`;
          const mockOrderId = `order_mock_${Date.now()}`;

          // Call backend to verify simulated mock order
          const verifyResponse = await fetch("/api/payments/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: mockOrderId,
              razorpay_payment_id: mockPaymentId,
              razorpay_signature: `sig_mock_${Date.now()}`,
              userId
            })
          });

          if (!verifyResponse.ok) throw new Error("Mock payment verification failed");

          // Update Firestore
          const userDocRef = doc(db, 'users', userId);
          await updateDoc(userDocRef, {
            isPremium: true,
            plan: 'pro',
            financialRevealSeen: true,
            paymentId: mockPaymentId,
            premiumSince: serverTimestamp()
          });

          trackEvent('payment_success');
          toast.success("Upgrade successful. Sandbox Premium unlocked.");
          resolve({ status: 'success', paymentId: mockPaymentId, orderId: mockOrderId });
        } catch (err: any) {
          console.error("Mock verification failed:", err);
          trackEvent('payment_failed', { error: String(err) });
          toast.error("Payment received, but verification failed.");
          resolve({ status: 'failed', error: err.message || String(err) });
        } finally {
          overlay.remove();
        }
      };

      btnFail.onclick = () => {
        trackEvent('payment_failed', { reason: 'User Cancelled Sandbox' });
        toast.error("Payment process cancelled.");
        overlay.remove();
        resolve({ status: 'cancelled' });
      };
    });
  }
}

// 2. Razorpay Payment Provider (Production environment)
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
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

export class RazorpayPaymentProvider implements PaymentProvider {
  async initialize(): Promise<void> {
    console.info("RazorpayPaymentProvider: Checking configurations...");
    const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!key || key === 'rzp_test_placeholder') {
      throw new Error("Razorpay Key ID is not configured. Production payments are currently unavailable.");
    }
    if (!(window as any).Razorpay) {
      throw new Error("Razorpay SDK failed to load. Please check your internet connection and reload the page.");
    }
    return Promise.resolve();
  }

  getProviderName(): string {
    return 'Razorpay';
  }

  startCheckout(options: CheckoutOptions): Promise<PaymentResult> {
    const { userId, userEmail, userName } = options;
    if (!userId) {
      return Promise.resolve({ status: 'failed', error: 'User ID is required' });
    }

    return new Promise<PaymentResult>((resolve) => {
      console.log("WealthOS Payments: Initializing Razorpay checkout in Production via RazorpayPaymentProvider");

      toast.loading("Initializing secure payment...");
      trackEvent('payment_started');

      fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
      .then(async (orderResponse) => {
        if (!orderResponse.ok) {
          throw new Error("Could not create secure payment order. Please try again.");
        }
        return orderResponse.json();
      })
      .then((order) => {
        toast.dismiss();

        if (order.is_mock) {
          throw new Error("Payment server is configured in sandbox mode. Production payments are currently unavailable.");
        }

        const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
        const optionsObj: RazorpayOptions = {
          key: key!,
          amount: order.amount,
          currency: order.currency,
          name: "WealthOS",
          description: "Premium Upgrade",
          order_id: order.id,
          prefill: {
            name: userName,
            email: userEmail,
          },
          theme: {
            color: "#4f46e5",
          },
          handler: async (response: any) => {
            console.log("Payment successful, verifying signature...");
            toast.loading("Verifying transaction secure status...");

            try {
              // Verify Payment on Backend
              const verifyResponse = await fetch("/api/payments/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  userId
                })
              });

              if (!verifyResponse.ok) throw new Error("Payment verification failed");

              // Update local state via Firestore
              const userDocRef = doc(db, 'users', userId);
              await updateDoc(userDocRef, {
                isPremium: true,
                plan: 'pro',
                financialRevealSeen: true,
                paymentId: response.razorpay_payment_id,
                premiumSince: serverTimestamp()
              });

              trackEvent('payment_success');
              toast.dismiss();
              toast.success("Upgrade successful. Premium unlocked.");
              resolve({
                status: 'success',
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id
              });
            } catch (error: any) {
              console.error("Verification error:", error);
              trackEvent('payment_failed', { error: error instanceof Error ? error.message : String(error) });
              toast.dismiss();
              toast.error("Payment received, but verification failed. Please contact support.");
              resolve({
                status: 'failed',
                error: error.message || String(error)
              });
            }
          },
        };

        const rzp = new (window as any).Razorpay(optionsObj);
        rzp.on('payment.failed', function (response: any) {
          trackEvent('payment_failed', { reason: response.error?.description || 'Unknown' });
          toast.error("Payment failed: " + response.error.description);
          resolve({
            status: 'failed',
            error: response.error?.description || 'Payment failed'
          });
        });
        rzp.open();
      })
      .catch((err) => {
        toast.dismiss();
        console.error("Razorpay production checkout error:", err);
        toast.error(err instanceof Error ? err.message : "Failed to initialize payment. Please contact support.");
        resolve({
          status: 'failed',
          error: err.message || String(err)
        });
      });
    });
  }
}

// 3. Centralized Payment Service (Decides provider dynamically)
class PaymentService {
  private activeProvider: PaymentProvider;

  constructor() {
    this.activeProvider = this.resolveProvider();
  }

  private resolveProvider(): PaymentProvider {
    const isDevelopmentBuild = 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      import.meta.env.DEV || 
      import.meta.env.MODE === 'development';

    const DEV_MODE = 
      localStorage.getItem('DEV_MODE') === 'true' || 
      localStorage.getItem('intelligence_dev_mode') === 'true' ||
      localStorage.getItem('developer_options') === 'true' ||
      (window as any).DEV_MODE === true;

    const isDevelopment = isDevelopmentBuild || DEV_MODE;

    if (isDevelopment) {
      console.info("PaymentService: Selected SandboxPaymentProvider");
      return new SandboxPaymentProvider();
    } else {
      console.info("PaymentService: Selected RazorpayPaymentProvider");
      return new RazorpayPaymentProvider();
    }
  }

  public async startCheckout(options: CheckoutOptions): Promise<PaymentResult> {
    try {
      await this.activeProvider.initialize();
      return await this.activeProvider.startCheckout(options);
    } catch (error: any) {
      console.error("PaymentService checkout initiation error:", error);
      toast.error(error.message || String(error));
      return {
        status: 'failed',
        error: error.message || String(error)
      };
    }
  }

  public getProviderName(): string {
    return this.activeProvider.getProviderName();
  }
}

export const paymentService = new PaymentService();

// Backward compatible wrapper helper
export const handleUpgrade = async (userId: string, userEmail?: string, userName?: string) => {
  return paymentService.startCheckout({ userId, userEmail, userName });
};
