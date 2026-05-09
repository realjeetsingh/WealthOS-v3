import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import PricingModal from './PricingModal';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface PremiumGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  featureName?: string;
  className?: string;
}

const PremiumGate: React.FC<PremiumGateProps> = ({ 
  children, 
  fallback, 
  featureName = 'this premium feature',
  className = ''
}) => {
  const { isPremium } = useAuth();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  if (isPremium) {
    return <>{children}</>;
  }

  if (fallback) {
    return <div onClick={() => setIsModalOpen(true)} className="cursor-pointer">{fallback}</div>;
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Blurred overlay content */}
      <div className="filter blur-[4px] opacity-40 pointer-events-none select-none">
        {children}
      </div>

      {/* Premium Overlay */}
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10 cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/90 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-[#6334FD]/10 max-w-sm"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-[#6B66FE] to-[#6334FD] rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg shadow-indigo-200">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2 leading-tight">Unlock {featureName}</h3>
          <p className="text-gray-500 font-medium text-sm mb-6 leading-relaxed">
            Upgrade to WealthOS Pro to access advanced tools and personalized financial strategies.
          </p>
          <button 
            className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-gray-800 transition-all flex items-center justify-center gap-2 group"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Go Pro Now
          </button>
        </motion.div>
      </div>

      <PricingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default PremiumGate;
