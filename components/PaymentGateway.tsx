
import React from 'react';
import { IntegrationConfig, User, SubscriptionPlan } from '../types';

interface PaymentOptions {
  plan: SubscriptionPlan;
  user: User;
  onSuccess: (txId: string) => void;
  onFailure: (error: string) => void;
}

export const usePaymentGateway = (config: IntegrationConfig) => {
  const processPayment = async ({ plan, user, onSuccess, onFailure }: PaymentOptions) => {
    console.log("Initializing Gateway Plugin Handshake...");

    if (!config.razorpayEnabled) {
      onFailure("GATEWAY_LOCKED: Master cluster has restricted remote transactions.");
      return;
    }

    if (config.isSandboxMode) {
      // Professional Mocking Experience for Sandbox
      if (confirm(`SANDBOX MODE ACTIVE: Emulate secure transaction for ${plan.name} (₹${plan.price})?`)) {
        onSuccess(`SBX-PAY-${Date.now()}`);
      } else {
        onFailure("User cancelled mock transaction.");
      }
      return;
    }

    // Dynamic Script Injection Check
    if (!(window as any).Razorpay) {
      onFailure("SDK_NOT_SYNCED: Razorpay plugin is unavailable. Check connectivity to checkout.razorpay.com.");
      return;
    }

    const options = {
      key: config.razorpayKeyId,
      amount: Math.round(plan.price * 100), // In Paise
      currency: "INR",
      name: "ManagerEmployee Cloud",
      description: `Upgrade License: ${plan.name}`,
      image: "https://manageremployee.co/logo.png",
      handler: (response: any) => {
        if (response.razorpay_payment_id) {
          console.log("Gateway verification successful.");
          onSuccess(response.razorpay_payment_id);
        } else {
          onFailure("Verification failed at remote gateway.");
        }
      },
      prefill: {
        name: user.name,
        email: user.email,
        contact: user.mobile || ""
      },
      notes: {
        company_id: user.companyId,
        plan_id: plan.id
      },
      theme: { color: "#0D47A1" },
      modal: {
        ondismiss: () => onFailure("Payment flow interrupted by user.")
      }
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        onFailure(`Gateway Error: ${resp.error.description}`);
      });
      rzp.open();
    } catch (e) {
      onFailure("Internal Plugin Crash: Critical failure in checkout component.");
    }
  };

  return { processPayment };
};

export const TransactionOverlay: React.FC<{ loading: boolean }> = ({ loading }) => {
  if (!loading) return null;
  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-8"></div>
      <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Syncing with Gateway</h3>
      <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] animate-pulse">Establishing Secure Socket Connection...</p>
    </div>
  );
};
