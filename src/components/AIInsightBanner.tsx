import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, ArrowRight, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { DailySnapshotData } from '../services/dailyHabitEngine';

interface AIInsightBannerProps {
  data: DailySnapshotData;
}

const AIInsightBanner: React.FC<AIInsightBannerProps> = ({ data }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0, scaleY: 0 }}
        animate={{ height: 'auto', opacity: 1, scaleY: 1 }}
        exit={{ height: 0, opacity: 0, scaleY: 0 }}
        className="mb-6 md:mb-8"
      >
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`bg-[#6334FD]/5 border border-[#6334FD]/10 rounded-2xl md:rounded-[1.5rem] p-3 md:p-4 relative overflow-hidden flex flex-col md:flex-row md:items-center gap-3 md:gap-4 cursor-pointer transition-all ${isExpanded ? 'ring-2 ring-indigo-500/20' : ''}`}
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            
            <div className="flex-1 min-w-0 pr-10 md:pr-0">
              <div className="flex items-center gap-2 mb-0.5 overflow-hidden">
                <span className="text-[8px] md:text-[9px] font-black text-indigo-600 uppercase tracking-widest whitespace-nowrap">Intelligence</span>
                <div className="w-1 h-1 rounded-full bg-indigo-200 shrink-0" />
                <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-black uppercase tracking-widest truncate">
                  {data.spendingTrend === 'down' ? (
                    <span className="text-green-600 flex items-center gap-1"><TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3" /> Optmized</span>
                  ) : data.spendingTrend === 'up' ? (
                    <span className="text-rose-600 flex items-center gap-1"><TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3" /> Inflationary</span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1"><Zap className="w-2.5 h-2.5 md:w-3 md:h-3" /> Stable</span>
                  )}
                </div>
              </div>
              <p className={`text-xs md:text-sm font-bold text-gray-900 ${isExpanded ? '' : 'truncate'} transition-all`}>
                {data.message}
              </p>
            </div>
          </div>

          <motion.div 
            initial={false}
            animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
            className="overflow-hidden md:hidden"
          >
            <div className="pt-2 mt-2 border-t border-indigo-100/30">
               <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic">
                 "Our AI analyzed your recent velocity and suggests maintaining this trajectory for another 4 days to hit your next milestone."
               </p>
            </div>
          </motion.div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(false);
            }}
            className="absolute right-2 top-3 md:top-1/2 md:-translate-y-1/2 p-2 hover:bg-gray-200/50 rounded-full transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AIInsightBanner;
