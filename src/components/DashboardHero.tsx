import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, ArrowDownRight, Target, Wallet, ShieldCheck, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { CurrencyDisplay } from './CurrencyDisplay';
import { FinancialHealthSummary } from '../lib/financialLogic';

interface DashboardHeroProps {
  netWorth: number;
  cashBalance: number;
  portfolioValue: number;
  loanBalance: number;
  savingsTrend: number; 
  currency: string;
  userName?: string;
  healthSummary: FinancialHealthSummary;
  income: number;
  expenses: number;
}

const DashboardHero: React.FC<DashboardHeroProps> = ({ 
  netWorth, 
  cashBalance, 
  portfolioValue, 
  loanBalance, 
  savingsTrend, 
  currency,
  userName = 'Buddy',
  healthSummary,
  income,
  expenses
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPositive = netWorth > 0 && healthSummary.isPositive;

  const savingsEfficiency = income > 0 ? ((income - expenses) / income) * 100 : 0;
  const growthVelocity = netWorth !== 0 ? (savingsTrend / Math.abs(netWorth)) * 100 : 0;
  
  return (
    <div className="relative mb-8 md:mb-12">
      {/* Primary Hero Card */}
      <motion.div 
        layout
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_35%),linear-gradient(135deg,#070B2D_0%,#11174A_35%,#2B3175_100%)] rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-12 text-white shadow-2xl relative overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
      >
        {/* Subtle Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-indigo-500/10 rounded-full blur-[60px] md:blur-[100px] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 md:gap-8 mb-8 md:mb-12">
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                <div className={`px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] border ${
                  healthSummary.state === 'RECOVERY_MODE' 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                    : isPositive 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {healthSummary.stateLabel}
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-emerald-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] border border-emerald-500/10 whitespace-nowrap">
                  <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" /> Verified Economy
                </div>
              </div>
              
              <h1 className="text-xl md:text-[2rem] font-black tracking-tight leading-tight max-w-[280px] md:max-w-none">
                {healthSummary.stateDescription.replace('.', '')}, <span className="text-yellow-400">{userName}.</span>
              </h1>
              
              <div className="pt-2 md:pt-4">
                <p className="text-white/40 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1">Current Net Worth</p>
                <div className="flex items-baseline gap-2 md:gap-3">
                  <h2 className="text-5xl md:text-[4.5rem] font-black tracking-tighter leading-none mb-0">
                    <CurrencyDisplay value={netWorth} currency={currency} />
                  </h2>
                  <div className={`flex items-center gap-1 text-[10px] md:text-sm font-black ${savingsTrend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {savingsTrend >= 0 ? <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" /> : <ArrowDownRight className="w-3 h-3 md:w-4 md:h-4" />}
                    <CurrencyDisplay value={Math.abs(savingsTrend)} currency={currency} />
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Assets - Always visible on md+ */}
            <div className="hidden md:flex flex-row md:flex-row lg:flex-col lg:items-end gap-3 md:gap-4">
               <div className="flex-1 lg:flex-none bg-white/5 backdrop-blur-md border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 min-w-[120px] md:min-w-[160px]">
                 <p className="text-white/40 text-[8px] md:text-[9px] font-black uppercase tracking-widest mb-1">Portfolio Assets</p>
                 <p className="text-lg md:text-xl font-black text-indigo-300">
                    <CurrencyDisplay value={portfolioValue} currency={currency} />
                 </p>
               </div>
               <div className="flex-1 lg:flex-none bg-white/5 backdrop-blur-md border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 min-w-[120px] md:min-w-[160px]">
                 <p className="text-white/40 text-[8px] md:text-[9px] font-black uppercase tracking-widest mb-1">Liquid Cash</p>
                 <p className="text-lg md:text-xl font-black text-emerald-300">
                    <CurrencyDisplay value={cashBalance} currency={currency} />
                 </p>
               </div>
            </div>
            
            {/* Mobile Expand Hint */}
            <div className="md:hidden flex items-center justify-center pt-2">
              <motion.div 
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-white/20"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </motion.div>
            </div>
          </div>

          <motion.div 
            initial={false}
            animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
            className={`overflow-hidden md:h-auto md:opacity-100 ${isExpanded ? 'pt-4 md:pt-0' : ''}`}
          >
            {/* Mobile-only additional metrics when expanded */}
            <div className="md:hidden grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-white/5">
               <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                 <p className="text-white/40 text-[8px] font-black uppercase tracking-widest mb-0.5">Portfolio Assets</p>
                 <p className="text-sm font-black text-indigo-300">
                    <CurrencyDisplay value={portfolioValue} currency={currency} />
                 </p>
               </div>
               <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                 <p className="text-white/40 text-[8px] font-black uppercase tracking-widest mb-0.5">Liquid Cash</p>
                 <p className="text-sm font-black text-emerald-300">
                    <CurrencyDisplay value={cashBalance} currency={currency} />
                 </p>
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-6 md:pt-10 border-t border-white/5">
              <div className="space-y-1">
                <p className="text-white/30 text-[8px] md:text-[9px] font-black uppercase tracking-widest">Growth Velocity</p>
                <div className="flex items-center gap-2">
                  <div className={`w-6 md:w-8 h-1 rounded-full ${growthVelocity >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-xs md:text-sm font-bold text-white/80">{growthVelocity >= 0 ? '+' : ''}{growthVelocity.toFixed(1)}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-white/30 text-[8px] md:text-[9px] font-black uppercase tracking-widest">Debt Freedom</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                     <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.round(Math.max(0, 100 - (loanBalance / (Math.abs(netWorth) || 1) * 100))))}%` }}
                      className="h-full bg-indigo-500" 
                    />
                  </div>
                  <span className="text-xs md:text-sm font-bold text-white/80">{Math.min(100, Math.round(Math.max(0, 100 - (loanBalance / (Math.abs(netWorth) || 1) * 100))))}%</span>
                </div>
              </div>
              <div className="hidden md:block space-y-1">
                <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">Savings Efficiency</p>
                <p className="text-sm font-black text-white">{savingsEfficiency.toFixed(1)}%</p>
              </div>
              <div className="hidden md:block space-y-1">
                <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">Economic Risk</p>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)] ${healthSummary.state === 'RECOVERY_MODE' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                  <span className="text-sm font-black text-white">{healthSummary.state === 'RECOVERY_MODE' ? 'Elevated' : 'Moderate'}</span>
                </div>
              </div>
            </div>
            
            {/* Extended Insights for Expanded State */}
            <div className="md:hidden pt-6">
               <p className="text-[10px] text-white/40 italic leading-relaxed">
                 Hero card intelligence is generated based on your real-time net worth velocity and relative debt-to-asset ratio.
               </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardHero;
