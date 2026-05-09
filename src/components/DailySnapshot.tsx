import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingDown, TrendingUp, Calendar, AlertCircle, Flame, Target } from 'lucide-react';
import { DailySnapshotData } from '../services/dailyHabitEngine';
import { UserStreak } from '../services/streakService';
import { formatCurrency } from '../lib/formatCurrency';

interface DailySnapshotProps {
  data: DailySnapshotData;
  streak: UserStreak | null;
  currency: string;
}

const DailySnapshot: React.FC<DailySnapshotProps> = ({ data, streak, currency }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-[2.5rem] p-6 mb-8 shadow-sm overflow-hidden relative"
    >
      {/* Background Accent */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row gap-6 relative z-10">
        {/* Main Insight */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Morning Briefing</span>
          </div>
          
          <h2 className="text-2xl font-black text-gray-900 leading-tight">
            {data.message}
          </h2>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
              {data.spendingTrend === 'down' ? (
                <TrendingDown className="w-4 h-4 text-green-500" />
              ) : data.spendingTrend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-red-500" />
              ) : (
                <Calendar className="w-4 h-4 text-indigo-500" />
              )}
              <span className="text-sm font-bold text-gray-700">
                Yesterday: {formatCurrency(data.yesterdaySpending)}
              </span>
            </div>

            {streak && streak.currentStreak > 1 && (
              <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full border border-orange-100 animate-pulse">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span className="text-sm font-black text-orange-600">
                  {streak.currentStreak} Day Streak!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action/Alert Section */}
        <div className="flex flex-col justify-center items-end gap-3 min-w-[200px]">
          {data.upcomingEMIs > 0 && (
            <div className="flex items-center gap-3 bg-rose-50 p-4 rounded-2xl border border-rose-100 w-full md:w-auto">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <div>
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Payments Due</p>
                <p className="text-sm font-bold text-rose-900">{data.upcomingEMIs} Pending EMIs</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-100 w-full md:w-auto group cursor-pointer hover:bg-indigo-700 transition-all">
            <Target className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <div className="pr-4">
              <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Wealth Goal</p>
              <p className="text-sm font-black">Plan Next Move</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DailySnapshot;
