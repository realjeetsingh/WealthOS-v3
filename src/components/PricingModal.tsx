import React from 'react';
import { X, Check, Crown, Zap, Shield, Star, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleUpgrade } from '../lib/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/formatCurrency';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile } = useAuth();

  if (!isOpen) return null;

  const features = [
    { icon: Zap, title: 'Advanced Insights', desc: 'Get deep AI-driven analysis of your wealth growth.' },
    { icon: Shield, title: 'Unlimited Accounts', desc: 'Track as many bank accounts and portfolios as you need.' },
    { icon: Star, title: 'Priority Support', desc: 'Get your queries resolved faster with our dedicated team.' },
    { icon: Crown, title: 'Exclusive Badges', desc: 'Show off your Pro status with unique profile badges.' },
  ];

  const onUpgrade = () => {
    handleUpgrade(user?.uid || '', user?.email || '', userProfile?.name || '');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden relative"
        >
          {/* Header with Gradient */}
          <div className="h-32 bg-gradient-to-br from-indigo-600 to-violet-700 relative flex items-center justify-center">
            <div className="absolute top-4 right-4">
              <button 
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/30">
              <Crown className="w-8 h-8 text-amber-300" />
            </div>
          </div>

          <div className="p-8 text-center">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">WealthOS Pro</h2>
            <p className="text-gray-500 font-medium mb-8">Take control of your financial future with advanced tools.</p>

            <div className="space-y-4 mb-10 text-left">
              {features.map((f, i) => (
                <div key={i} className="flex items-start space-x-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className="mt-1 p-2 bg-indigo-50 rounded-xl text-indigo-600">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{f.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-indigo-50 rounded-3xl p-6 mb-8 border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-indigo-900 font-bold">Lifetime Access</span>
                <div className="flex items-center">
                  <span className="text-gray-400 line-through text-sm mr-2">{formatCurrency(999)}</span>
                  <span className="text-2xl font-black text-indigo-600">{formatCurrency(299)}</span>
                </div>
              </div>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest text-left">Limited time offer • One-time payment</p>
            </div>

            <button 
              onClick={onUpgrade}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center group active:scale-[0.98]"
            >
              Upgrade Now
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <p className="mt-4 text-[10px] text-gray-400 font-medium">
              Secure payment via Razorpay. Cancel anytime.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PricingModal;
