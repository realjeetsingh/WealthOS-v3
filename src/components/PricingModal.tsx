import React from 'react';
import { Crown, Zap, Shield, Star, ArrowRight, Sparkles, TrendingUp, Lightbulb, Activity } from 'lucide-react';
import { trackEvent, AnalyticsEvents } from '../services/analytics';
import { handleUpgrade } from '../lib/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/formatCurrency';
import ModalShell from './ModalShell';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile } = useAuth();
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('yearly');

  React.useEffect(() => {
    if (isOpen) {
      trackEvent(AnalyticsEvents.PREMIUM_POPUP_OPENED);
    }
  }, [isOpen]);

  const features = [
    { icon: Sparkles, title: 'AI Smart Financial Analysis', desc: 'Deep-dive into your finances with our advanced AI engine.' },
    { icon: TrendingUp, title: '1-Year Wealth Projection', desc: 'See exactly where you will be in 12 months with current habits.' },
    { icon: Lightbulb, title: 'Advanced Insights', desc: 'Strategic recommendations to optimize your monthly cashflow.' },
    { icon: Activity, title: 'Unlimited Tracking', desc: 'No limits on accounts, assets, or transaction history.' },
  ];

  const onUpgrade = () => {
    trackEvent(AnalyticsEvents.SUBSCRIPTION_STARTED, { cycle: billingCycle });
    handleUpgrade(user?.uid || '', user?.email || '', userProfile?.name || '');
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
        <div className="w-16 h-16 bg-gradient-to-br from-[#6B66FE] to-[#6334FD] rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-xl shadow-indigo-100">
          <Crown className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight mb-2">Build Your Net Worth</h2>
        <p className="text-gray-500 font-medium leading-relaxed">Get personalized financial strategies based on your income, loans, and goals.</p>
      </div>

      <div className="pt-4">
        <div className="space-y-4 mb-8">
          {features.map((f, i) => (
            <div key={i} className="flex items-start space-x-4">
              <div className="mt-1 shrink-0">
                <div className="w-5 h-5 bg-indigo-50 rounded-full flex items-center justify-center">
                  <f.icon className="w-3.5 h-3.5 text-[#6334FD]" />
                </div>
              </div>
              <div>
                <p className="text-gray-700 font-bold text-sm leading-snug">{f.title}</p>
                <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Billing Cycle Toggle */}
        <div className="bg-gray-50 p-1.5 rounded-2xl flex gap-1 mb-8">
          <button 
            onClick={() => setBillingCycle('monthly')}
            className={`flex-1 py-3 rounded-[1.25rem] text-sm font-black transition-all ${
              billingCycle === 'monthly' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBillingCycle('yearly')}
            className={`flex-1 py-3 rounded-[1.25rem] text-sm font-black transition-all relative ${
              billingCycle === 'yearly' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Yearly
            <span className="absolute -top-2 -right-1 bg-green-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
              Save 37%
            </span>
          </button>
        </div>

        {/* Pricing Display */}
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-black text-gray-900">
              {billingCycle === 'monthly' ? formatCurrency(199) : formatCurrency(1499)}
            </span>
            <span className="text-gray-400 font-bold">
              /{billingCycle === 'monthly' ? 'mo' : 'yr'}
            </span>
          </div>
          {billingCycle === 'yearly' && (
            <p className="text-green-500 font-black text-xs mt-2 uppercase tracking-widest">Equivalent to {formatCurrency(125)}/mo</p>
          )}
        </div>

        <div className="space-y-3">
          <button 
            onClick={onUpgrade}
            className="w-full py-5 bg-gradient-to-r from-[#6B66FE] to-[#6334FD] text-white rounded-2xl font-black text-lg hover:opacity-95 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            Unlock Everything Pro
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button 
            onClick={onClose}
            className="w-full py-4 text-gray-400 font-black text-xs uppercase tracking-widest hover:text-gray-600 transition-colors"
          >
            Maybe Later
          </button>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-300" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Secure</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Premium Support</span>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

export default PricingModal;
