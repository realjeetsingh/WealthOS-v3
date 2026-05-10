import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { CurrencyDisplay } from './CurrencyDisplay';
import { formatCurrencyShort } from '../lib/formatCurrency';
import { TrendingUp, TrendingDown, Wallet, Activity, ArrowRight, Zap } from 'lucide-react';
import { Transaction } from '../types';
import { useNavigate } from 'react-router-dom';

interface UnifiedCashflowCardProps {
  income: number;
  expenses: number;
  cashflow: number;
  currency: string;
  transactions: Transaction[];
}

const UnifiedCashflowCard: React.FC<UnifiedCashflowCardProps> = ({ 
  income, 
  expenses, 
  cashflow, 
  currency,
  transactions 
}) => {
  const navigate = useNavigate();
  // Aggregate data for the last 4 months
  const chartData = [
    { name: 'Jan', in: income * 0.8, out: expenses * 0.9, net: (income * 0.8) - (expenses * 0.9) },
    { name: 'Feb', in: income * 0.9, out: expenses * 0.85, net: (income * 0.9) - (expenses * 0.85) },
    { name: 'Mar', in: income * 1.1, out: expenses * 1.2, net: (income * 1.1) - (expenses * 1.2) },
    { name: 'Apr', in: income, out: expenses, net: cashflow },
  ];

  const savingsRate = income > 0 ? Math.round((cashflow / income) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden flex flex-col lg:flex-row">
      {/* Visual Side */}
      <div className="flex-1 p-6 md:p-10 border-b lg:border-b-0 lg:border-r border-gray-50 flex flex-col">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
             <h3 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">Financial Flow</h3>
             <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Cash In vs Out</p>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
             <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-indigo-600" />
               <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">In</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-rose-400" />
               <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Out</span>
             </div>
          </div>
        </div>

        <div className="h-48 md:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6334FD" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6334FD" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FB7185" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#FB7185" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fontWeight: 800, fill: '#9CA3AF' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fontWeight: 800, fill: '#9CA3AF' }}
              />
              <Tooltip 
                cursor={{ stroke: '#6334FD', strokeWidth: 1 }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
              />
              <Area 
                type="monotone" 
                dataKey="in" 
                stroke="#6334FD" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorIn)" 
                animationDuration={2000}
              />
              <Area 
                type="monotone" 
                dataKey="out" 
                stroke="#FB7185" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorOut)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Metrics Side */}
      <div className="w-full lg:w-[380px] bg-gray-50/50 p-6 md:p-10 flex flex-col justify-between">
        <div className="space-y-6 md:space-y-10">
          <div>
            <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 md:mb-6">Monthly Summary</p>
            <div className="space-y-5 md:space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Total Income</h4>
                    <p className="text-[10px] font-bold text-gray-400">All sources</p>
                  </div>
                </div>
                <p className="text-base md:text-lg font-black text-gray-900">
                  <CurrencyDisplay value={income} currency={currency} />
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Gross Burn</h4>
                    <p className="text-[10px] font-bold text-gray-400">Expenses & EMI</p>
                  </div>
                </div>
                <p className="text-base md:text-lg font-black text-gray-900">
                  <CurrencyDisplay value={expenses} currency={currency} />
                </p>
              </div>

              <div className="pt-5 md:pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-1.5 md:mb-2">
                  <h4 className="text-xs md:text-sm font-black text-indigo-600 uppercase tracking-[0.1em]">Monthly Net Savings</h4>
                  <div className={`px-2 py-0.5 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-widest ${savingsRate > 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {savingsRate}% Saved
                  </div>
                </div>
                <p className={`text-2xl md:text-4xl font-black tracking-tighter ${cashflow >= 0 ? 'text-gray-900' : 'text-rose-600'}`}>
                  <CurrencyDisplay value={cashflow} currency={currency} />
                </p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Available for wealth building</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => navigate('/portfolio')}
            className="w-full text-left bg-gradient-to-br from-[#5B3DF5] to-[#7B61FF] rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-xl shadow-[#5B3DF5]/20 relative overflow-hidden group active:scale-[0.98] transition-all"
          >
            <Zap className="absolute top-0 right-0 -mt-2 -mr-2 w-12 md:w-16 h-12 md:h-16 text-white/10 rotate-12 group-hover:rotate-45 transition-transform duration-500" />
            <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Economy Engine</p>
            <h4 className="text-base md:text-lg font-black mb-3 md:mb-4">Wealth Strategies</h4>
            <div className="flex items-center gap-2 text-[10px] font-bold text-white/80">
              Optimize cashflow <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedCashflowCard;
