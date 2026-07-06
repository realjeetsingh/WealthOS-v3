import React from 'react';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePendingTransactions } from '../services/usePendingTransactions';

interface IntelligenceOrbProps {
  className?: string;
  size?: 'sm' | 'lg';
}

const IntelligenceOrb: React.FC<IntelligenceOrbProps> = ({ className = '', size = 'lg' }) => {
  const navigate = useNavigate();
  const { pendingCount } = usePendingTransactions();

  const isLarge = size === 'lg';
  const isBridged = typeof (window as any).onWealthOSNotification === 'function';

  return (
    <div className={`relative ${className}`}>
      <motion.button
        onClick={() => navigate('/review')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative z-20 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 via-[#6334FD] to-indigo-700 shadow-xl shadow-indigo-500/20 group overflow-hidden ${
          isLarge ? 'w-16 h-16' : 'w-12 h-12'
        } ${isBridged ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-white' : ''}`}
      >
        {/* Animated Background Glow */}
        <motion.div
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear"
          }}
          className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,white_20deg,transparent_40deg)] opacity-20"
        />
        
        {/* Pending Signal Pulse */}
        {pendingCount > 0 && (
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
            }}
            className="absolute inset-0 bg-white"
          />
        )}

        <Zap className={`relative z-10 text-white fill-white transition-all group-hover:scale-110 ${isLarge ? 'w-8 h-8' : 'w-5 h-5'}`} />
      </motion.button>

      {/* Outer Rings */}
      <div className="absolute inset-0 z-10">
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.2, 0, 0.2]
          }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut"
          }}
          className="absolute inset-0 border-2 border-indigo-400/30 rounded-full"
        />
        {pendingCount > 0 && (
          <motion.div
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.1, 0, 0.1]
            }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0.5
            }}
            className="absolute inset-0 border border-indigo-500/20 rounded-full"
          />
        )}
      </div>

      {/* Badge */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 z-30 min-w-[20px] h-5 px-1.5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg"
        >
          <span className="text-[9px] font-black text-white leading-none">
            {pendingCount}
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default IntelligenceOrb;
