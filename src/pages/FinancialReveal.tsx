import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Transaction, Loan, PortfolioAsset } from '../types';
import { 
  calculateMonthlyIncome, 
  calculateMonthlyExpenses, 
  calculateNetWorth,
  calculatePortfolioValue,
  calculateTotalLoanRemaining
} from '../lib/financialEngine';
import { formatCurrency } from '../lib/formatCurrency';
import { paymentService } from '../lib/paymentService';
import { trackEvent } from '../services/analytics';
import { PREMIUM_PRICING } from '../lib/pricingConfig';
import { 
  Sparkles, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  Activity, 
  Lock, 
  CheckCircle2, 
  TrendingUp, 
  ShieldAlert,
  ArrowRight,
  Zap,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function FinancialReveal() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Local states for loaded data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Loading Sequence (3-5 seconds)
  const [loadingSequence, setLoadingSequence] = useState(true);
  const [currentProgressIndex, setCurrentProgressIndex] = useState(0);
  const [freeLoading, setFreeLoading] = useState(false);

  const progressSteps = [
    { label: 'Calculating Financial Health Score', duration: 800 },
    { label: 'Analyzing cashflow', duration: 800 },
    { label: 'Building savings profile', duration: 800 },
    { label: 'Preparing personalized insights', duration: 800 }
  ];

  // 1. Data listener
  useEffect(() => {
    if (!user?.uid) return;

    const transactionsPath = `users/${user.uid}/transactions`;
    const portfolioPath = `users/${user.uid}/portfolio`;
    const loansPath = `users/${user.uid}/loans`;

    const unsubTx = onSnapshot(collection(db, transactionsPath), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[];
      setTransactions(docs);
      setDataLoaded(true);
    }, (err) => console.error("Error listening to transactions:", err));

    const unsubPortfolio = onSnapshot(collection(db, portfolioPath), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as PortfolioAsset[];
      setPortfolioAssets(docs);
    }, (err) => console.error("Error listening to portfolio:", err));

    const unsubLoans = onSnapshot(collection(db, loansPath), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Loan[];
      setLoans(docs);
    }, (err) => console.error("Error listening to loans:", err));

    return () => {
      unsubTx();
      unsubPortfolio();
      unsubLoans();
    };
  }, [user?.uid]);

  // 2. Loading sequence timers
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (loadingSequence) {
      if (currentProgressIndex < progressSteps.length) {
        timer = setTimeout(() => {
          setCurrentProgressIndex(prev => prev + 1);
        }, progressSteps[currentProgressIndex].duration);
      } else {
        // Once all steps are completed, transition automatically after a short delay
        timer = setTimeout(() => {
          setLoadingSequence(false);
          // Track that financial reveal screen is shown to the user
          trackEvent('financial_reveal_shown');
        }, 600);
      }
    }

    return () => clearTimeout(timer);
  }, [loadingSequence, currentProgressIndex]);

  // 3. Financial calculations matching Dashboard.tsx
  const monthlyIncomeVal = useMemo(() => {
    const calculated = calculateMonthlyIncome(transactions);
    if (calculated > 0) return calculated;
    return Number(userProfile?.monthlyIncome) || 0;
  }, [transactions, userProfile?.monthlyIncome]);

  const monthlyExpensesVal = useMemo(() => {
    const calculated = calculateMonthlyExpenses(transactions, loans);
    if (calculated > 0) return calculated;
    return Number(userProfile?.monthlyExpenses) || 0;
  }, [transactions, loans, userProfile?.monthlyExpenses]);

  const portfolioValueVal = useMemo(() => {
    return calculatePortfolioValue(portfolioAssets);
  }, [portfolioAssets]);

  const loanBalanceVal = useMemo(() => {
    return calculateTotalLoanRemaining(loans);
  }, [loans]);

  const netWorthVal = useMemo(() => {
    // Basic fallback logic
    const net = calculateNetWorth(monthlyIncomeVal - monthlyExpensesVal, portfolioValueVal, loanBalanceVal);
    if (net !== 0) return net;
    return (monthlyIncomeVal - monthlyExpensesVal) || 50000;
  }, [monthlyIncomeVal, monthlyExpensesVal, portfolioValueVal, loanBalanceVal]);

  const aiPowerScoreVal = useMemo(() => {
    if (monthlyIncomeVal === 0) return 65; // realistic fallback
    const savingsRate = Math.max(0, (monthlyIncomeVal - monthlyExpensesVal) / monthlyIncomeVal);
    const investmentRatio = portfolioValueVal / (netWorthVal || 1);
    const debtRatio = Math.max(0, 1 - (loanBalanceVal / (monthlyIncomeVal * 12 || 1)));
    
    const score = (savingsRate * 40) + (investmentRatio * 40) + (debtRatio * 20);
    const finalScore = Math.min(100, Math.round(score));
    return finalScore > 0 ? finalScore : 68; // default beautiful fallback
  }, [monthlyIncomeVal, monthlyExpensesVal, portfolioValueVal, netWorthVal, loanBalanceVal]);

  const savingsRateVal = useMemo(() => {
    if (monthlyIncomeVal === 0) return 35; // realistic fallback
    return Math.round(Math.max(0, (monthlyIncomeVal - monthlyExpensesVal) / monthlyIncomeVal) * 100);
  }, [monthlyIncomeVal, monthlyExpensesVal]);

  const scoreLabel = aiPowerScoreVal > 80 ? 'Elite' : aiPowerScoreVal > 60 ? 'Stable' : 'Risk';
  const scoreColor = aiPowerScoreVal > 80 ? 'text-emerald-400' : aiPowerScoreVal > 60 ? 'text-indigo-400' : 'text-rose-400';

  // 4. Action Handlers
  const handleUnlockPremium = async () => {
    trackEvent('premium_cta_clicked');
    if (!user?.uid) return;
    paymentService.startCheckout({
      userId: user.uid,
      userEmail: user.email || '',
      userName: userProfile?.name || ''
    });
  };

  const handleContinueFree = async () => {
    trackEvent('continue_free_clicked');
    if (!user?.uid) {
      navigate('/dashboard');
      return;
    }

    setFreeLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        financialRevealSeen: true
      });
      navigate('/dashboard');
    } catch (error) {
      console.error("Error bypassing financial reveal:", error);
      navigate('/dashboard');
    } finally {
      setFreeLoading(false);
    }
  };

  // Render LOADING SEQUENCE
  if (loadingSequence) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0B0F19] text-white p-6 select-none font-sans">
        <div className="max-w-md w-full flex flex-col items-center space-y-10">
          {/* Logo & Subtitle */}
          <div className="flex flex-col items-center space-y-3">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              className="relative w-16 h-16 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20"
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-black tracking-tight mt-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">WealthOS</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Building Your Financial Profile...</p>
          </div>

          {/* Progress Indicator */}
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <motion.div 
              className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full"
              initial={{ width: '0%' }}
              animate={{ width: `${Math.min(100, (currentProgressIndex / progressSteps.length) * 100)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Progress Logs */}
          <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
            {progressSteps.map((step, index) => {
              const isDone = index < currentProgressIndex;
              const isCurrent = index === currentProgressIndex;
              return (
                <div key={index} className="flex items-center justify-between text-sm font-medium">
                  <div className="flex items-center gap-3">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 shrink-0" />
                    )}
                    <span className={isDone ? 'text-gray-300 line-through decoration-white/20' : isCurrent ? 'text-white font-bold' : 'text-gray-500'}>
                      {step.label}
                    </span>
                  </div>
                  {isDone && (
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded">
                      Done
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Render MAIN REVEAL SCREEN
  return (
    <div className="min-h-dvh bg-[#070A13] text-white p-4 sm:p-6 md:p-8 font-sans select-none overflow-x-hidden relative">
      {/* Background gradients for premium glow */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-900/10 blur-[150px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-10 relative z-10 py-6 md:py-12">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 text-xs font-black uppercase tracking-widest mb-2 animate-pulse-slow">
            <Star className="w-3.5 h-3.5 fill-indigo-400" /> Analysis Complete
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Your Financial <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-indigo-500 bg-clip-text text-transparent">Reveal</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto font-medium">
            We have integrated your onboarding data. Here is your current financial blueprint of WealthOS.
          </p>
        </div>

        {/* 1. KEY METRICS GRID (Fully Visible) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Health Score Card */}
          <div className="md:col-span-2 bg-[#0E1324] border border-white/5 rounded-3xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Financial Health Score</span>
              <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/5 border border-white/5 ${scoreColor}`}>
                {scoreLabel}
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <span className="text-6xl font-black tracking-tighter bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {aiPowerScoreVal}
                </span>
                <span className="text-gray-500 text-sm font-black tracking-tight">/100</span>
              </div>
              
              {/* Score Circular Indicator */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
                  <circle cx="32" cy="32" r="28" stroke="#6366F1" strokeWidth="4" fill="transparent"
                    strokeDasharray={175}
                    strokeDashoffset={175 - (175 * aiPowerScoreVal) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-[10px] font-bold text-indigo-400">{aiPowerScoreVal}%</div>
              </div>
            </div>
          </div>

          {/* Income Card */}
          <div className="bg-[#0E1324] border border-white/5 rounded-3xl p-6 flex flex-col justify-between space-y-4">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Monthly Income</span>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate">
                {formatCurrency(monthlyIncomeVal)}
              </div>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Direct Cashflow
              </p>
            </div>
          </div>

          {/* Expenses Card */}
          <div className="bg-[#0E1324] border border-white/5 rounded-3xl p-6 flex flex-col justify-between space-y-4">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Monthly Expenses</span>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate">
                {formatCurrency(monthlyExpensesVal)}
              </div>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">
                Savings Rate: {savingsRateVal}%
              </p>
            </div>
          </div>
        </div>

        {/* 2. PREMIUM PREVIEW (Blurred Insight Cards) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-lg font-black tracking-tight text-white">Personalized Diagnostics & Insights</h3>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10">
              <Lock className="w-3 h-3" /> Locked Sections
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Personalized Financial Recommendations */}
            <div className="bg-[#0E1324]/50 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[170px]">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center text-violet-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-black text-white">Personalized Recommendations</h4>
                </div>
                
                {/* Blurred Text Container */}
                <div className="relative">
                  <p className="text-xs text-gray-400 leading-relaxed filter blur-sm select-none pointer-events-none opacity-40">
                    We recommend allocating ₹{monthlyIncomeVal > 0 ? formatCurrency(Math.round((monthlyIncomeVal - monthlyExpensesVal) * 0.4)) : '15,000'} to high-yield tax saver funds and ₹{monthlyIncomeVal > 0 ? formatCurrency(Math.round((monthlyIncomeVal - monthlyExpensesVal) * 0.3)) : '10,000'} to debt optimization. This strategy will increase compound growth.
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                    <div className="flex items-center gap-2 bg-indigo-600/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
                      <Lock className="w-3 h-3" /> Unlock with Premium
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Biggest Spending Leak */}
            <div className="bg-[#0E1324]/50 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[170px]">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-400">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-black text-white">Biggest Spending Leak</h4>
                </div>

                {/* Blurred Text Container */}
                <div className="relative">
                  <p className="text-xs text-gray-400 leading-relaxed filter blur-sm select-none pointer-events-none opacity-40">
                    Based on your monthly expenses of {formatCurrency(monthlyExpensesVal)}, we detected that your spending in general categories is 25% higher than peer averages. Saving this could unlock {formatCurrency(Math.round(monthlyExpensesVal * 0.15))} in cash reserves.
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                    <div className="flex items-center gap-2 bg-indigo-600/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
                      <Lock className="w-3 h-3" /> Unlock Leak Analysis
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Debt Optimization Plan */}
            <div className="bg-[#0E1324]/50 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[170px]">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-black text-white">Debt Optimization Plan</h4>
                </div>

                {/* Blurred Text Container */}
                <div className="relative">
                  <p className="text-xs text-gray-400 leading-relaxed filter blur-sm select-none pointer-events-none opacity-40">
                    We projected that refinancing or systematic prepayment of your active loans can save you up to ₹24,500 in compound interest over the tenure of your loans.
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                    <div className="flex items-center gap-2 bg-indigo-600/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
                      <Lock className="w-3 h-3" /> Unlock Debt Optimizer
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: 12-Month Wealth Forecast */}
            <div className="bg-[#0E1324]/50 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[170px]">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-black text-white">12-Month Wealth Forecast</h4>
                </div>

                {/* Blurred Text Container */}
                <div className="relative">
                  <p className="text-xs text-gray-400 leading-relaxed filter blur-sm select-none pointer-events-none opacity-40">
                    At this rate, your net worth of {formatCurrency(netWorthVal)} is projected to grow to {formatCurrency(Math.round(netWorthVal + (monthlyIncomeVal - monthlyExpensesVal) * 12))} in 12 months with high compound growth curves.
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                    <div className="flex items-center gap-2 bg-indigo-600/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
                      <Lock className="w-3 h-3" /> Unlock Forecast
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: AI Financial Report (Full Span) */}
            <div className="md:col-span-2 bg-[#0E1324]/50 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[150px]">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-black text-white">Full AI Financial Report</h4>
                </div>

                {/* Blurred Text Container */}
                <div className="relative">
                  <p className="text-xs text-gray-400 leading-relaxed filter blur-sm select-none pointer-events-none opacity-40">
                    A customized 15-page financial audit of your savings-to-income index, debt correlations, emergency fund coverage of 6 months, and personalized capital deployment map.
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                    <div className="flex items-center gap-2 bg-indigo-600/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
                      <Lock className="w-3 h-3" /> Unlock Complete 15-Page Report
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 3. PREMIUM OFFER (Lifetime Premium Redesign) */}
        <div className="relative bg-[#0E1324] border border-indigo-500/20 rounded-[2.5rem] p-6 sm:p-8 flex flex-col gap-8 shadow-2xl overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-4 text-center md:text-left flex-1">
              <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
                LIFETIME PREMIUM
              </span>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight text-white leading-none uppercase">
                  Lifetime Premium
                </h3>
                <p className="text-xs text-gray-300 max-w-md leading-relaxed font-medium">
                  Unlock the complete WealthOS experience with a one-time payment. <br className="hidden sm:inline" />
                  No recurring subscription. No hidden charges. Future Premium updates included.
                </p>
              </div>
            </div>

            {/* Pricing Display */}
            <div className="flex flex-col items-center bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 text-center shrink-0 min-w-[200px] shadow-lg">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">One-Time Payment</span>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <span className="text-sm font-medium text-gray-500 line-through">{PREMIUM_PRICING.formattedOriginalPrice}</span>
                <span className="text-3xl font-black text-white">{PREMIUM_PRICING.formattedPrice}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">
                Lifetime Access
              </span>
              <div className="w-full h-px bg-white/5 my-4" />
              <p className="text-[10px] text-gray-400 max-w-[150px] leading-tight font-medium">
                Immediate unlock after Razorpay checkout
              </p>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="border-t border-white/5 pt-6">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 text-center md:text-left">What's Included</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { title: "Complete Financial Analysis", desc: "Unlock in-depth reports, net worth projections, and health diagnostics." },
                { title: "Personalized AI Recommendations", desc: "Get custom strategies and resource allocation advice from Gemini." },
                { title: "Smart Spending Insights", desc: "Automatically detect spending leaks, categorization shifts, and savings options." },
                { title: "Wealth Forecast", desc: "Generate multi-year compound interest curves based on your active assets." },
                { title: "Advanced Analytics", desc: "Track debt amortization, portfolio returns, and debt-to-income limits." },
                { title: "Future Premium Features Included", desc: "All upcoming reports, SMS triggers, and academy material included." }
              ].map((benefit, i) => (
                <div key={i} className="flex flex-col gap-1 bg-white/[0.01] border border-white/[0.03] hover:border-indigo-500/20 rounded-2xl p-4 transition-all">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-gray-100">{benefit.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-normal pl-6 font-medium">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
 
        {/* 4. CALL TO ACTION BUTTONS */}
        <div className="flex flex-col items-center justify-center pt-4 w-full">
          <button 
            onClick={handleUnlockPremium}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center justify-center gap-2 group cursor-pointer"
          >
            Unlock My Financial Analysis
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={handleContinueFree}
            disabled={freeLoading}
            className="mt-6 sm:mt-8 text-sm font-medium text-[#A1A1AA] opacity-80 hover:opacity-100 hover:underline transition-opacity duration-150 cursor-pointer disabled:opacity-50 py-2 px-6 text-center bg-transparent border-none shadow-none outline-none"
          >
            {freeLoading ? 'Bypassing...' : "I'll Upgrade Later"}
          </button>
        </div>

      </div>
    </div>
  );
}
