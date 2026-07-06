import React from 'react';
import { Crown, Shield, Star, ArrowRight, Sparkles, TrendingUp, Lightbulb, Activity, GraduationCap } from 'lucide-react';
import { trackEvent, AnalyticsEvents } from '../services/analytics';
import { paymentService } from '../lib/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { PREMIUM_PRICING } from '../lib/pricingConfig';
import ModalShell from './ModalShell';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile } = useAuth();

  React.useEffect(() => {
    if (isOpen) {
      trackEvent(AnalyticsEvents.PREMIUM_POPUP_OPENED);
    }
  }, [isOpen]);

  const features = [
    { icon: Activity, title: 'Advanced Financial Analytics', desc: 'Deep-dive into your cashflow, savings rates, and debt indicators.' },
    { icon: GraduationCap, title: 'Wealth Academy Masterclasses', desc: 'Unlock expert-led video lectures and PDF study guides on wealth creation.' },
    { icon: Star, title: 'Comprehensive Financial Goals', desc: 'Track, calculate, and accelerate multiple long-term financial targets.' },
    { icon: Sparkles, title: 'Lifetime Unlimited Updates', desc: 'Get all future reports, new course modules, and SMS integrations forever.' },
  ];

  const onUpgrade = () => {
    trackEvent(AnalyticsEvents.SUBSCRIPTION_STARTED, { cycle: 'lifetime' });
    paymentService.startCheckout({
      userId: user?.uid || '',
      userEmail: user?.email || '',
      userName: userProfile?.name || ''
    });
    onClose();
  };

  return (
    <ModalShell 
      isOpen={isOpen} 
      onClose={onClose}
      maxWidth="md"
    >
      {/* Header with Visual Hierarchy */}
      <div className="p-4 pt-0 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-[#6B66FE] to-[#6334FD] rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-xl shadow-indigo-100 animate-pulse-slow">
          <Crown className="w-9 h-9 text-white" />
        </div>
        <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-[#6334FD] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-indigo-100">
          <Star className="w-3 h-3 fill-indigo-400" /> {PREMIUM_PRICING.tagline}
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight mb-2">
          {PREMIUM_PRICING.planName}
        </h2>
        <p className="text-gray-500 font-medium text-sm leading-relaxed max-w-sm mx-auto">
          Get lifetime access to the complete financial engine. No subscriptions, no recurring bills.
        </p>
      </div>

      <div className="pt-2">
        {/* Features List */}
        <div className="space-y-4 mb-8 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
          {features.map((f, i) => (
            <div key={i} className="flex items-start space-x-4">
              <div className="mt-1 shrink-0">
                <div className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <f.icon className="w-3.5 h-3.5 text-[#6334FD]" />
                </div>
              </div>
              <div>
                <p className="text-gray-800 font-bold text-sm leading-snug">{f.title}</p>
                <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Unified Pricing Display */}
        <div className="text-center mb-8 bg-gradient-to-br from-indigo-50/20 to-violet-50/20 p-6 rounded-2xl border border-indigo-500/10">
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">
            One-Time Activation
          </span>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-sm font-medium text-gray-400 line-through">
              {PREMIUM_PRICING.formattedOriginalPrice}
            </span>
            <span className="text-5xl font-black text-gray-900 tracking-tight">
              {PREMIUM_PRICING.formattedPrice}
            </span>
            <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-widest">
              90% OFF
            </span>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
            ⚡ Pay once, keep forever
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <button 
            onClick={onUpgrade}
            className="w-full py-5 bg-gradient-to-r from-[#6B66FE] to-[#6334FD] text-white rounded-2xl font-black text-base hover:opacity-95 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer"
          >
            {PREMIUM_PRICING.buttonText}
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button 
            onClick={onClose}
            className="w-full py-4 text-gray-400 font-black text-xs uppercase tracking-widest hover:text-gray-600 transition-colors cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
        
        {/* Footer badges */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-300" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Secure Checkout</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lifetime Access</span>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

export default PricingModal;
