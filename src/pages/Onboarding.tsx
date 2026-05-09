import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck,
  ChevronRight, 
  ChevronLeft,
  Plus,
  Home,
  Rocket,
  Sparkles,
  BarChart3,
  PieChart,
  X,
  CreditCard,
  Building2,
  Stethoscope,
  Briefcase,
  Smartphone,
  Globe,
  Coins,
  Gem,
  Car
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  addTransaction, 
  addAsset, 
  addLoan, 
  addGoal,
  addPortfolioAsset
} from '../services/financeService';
import { updateFinancialSnapshot } from '../services/snapshotService';
import { trackEvent, AnalyticsEvents } from '../services/analytics';
import { syncPortfolioPrices } from '../services/portfolioSyncService';
import { searchSymbols, SymbolResult } from '../services/marketDataService';
import { formatCurrency } from '../lib/formatCurrency';
import { toast } from 'sonner';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';

const ASSET_SUGGESTIONS = [
  // Stocks
  { name: 'Reliance Industries', symbol: 'RELIANCE.NS', type: 'Stocks' },
  { name: 'TCS', symbol: 'TCS.NS', type: 'Stocks' },
  { name: 'HDFC Bank', symbol: 'HDFCBANK.NS', type: 'Stocks' },
  { name: 'Infosys', symbol: 'INFY.NS', type: 'Stocks' },
  { name: 'ICICI Bank', symbol: 'ICICIBANK.NS', type: 'Stocks' },
  { name: 'Hindustan Unilever', symbol: 'HINDUNILVR.NS', type: 'Stocks' },
  { name: 'State Bank of India', symbol: 'SBIN.NS', type: 'Stocks' },
  { name: 'Bharti Airtel', symbol: 'BHARTIARTL.NS', type: 'Stocks' },
  { name: 'ITC', symbol: 'ITC.NS', type: 'Stocks' },
  { name: 'Adani Enterprises', symbol: 'ADANIENT.NS', type: 'Stocks' },
  // Crypto
  { name: 'Bitcoin', symbol: 'BTC', type: 'Crypto' },
  { name: 'Ethereum', symbol: 'ETH', type: 'Crypto' },
  { name: 'Solana', symbol: 'SOL', type: 'Crypto' },
  { name: 'Ripple', symbol: 'XRP', type: 'Crypto' },
  { name: 'Cardano', symbol: 'ADA', type: 'Crypto' },
  { name: 'Dogecoin', symbol: 'DOGE', type: 'Crypto' },
];

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles, description: 'Take control in 60 seconds' },
  { id: 'income', title: 'Monthly Income', icon: TrendingUp, description: 'How much do you earn each month?' },
  { id: 'expenses', title: 'Monthly Expenses', icon: TrendingDown, description: 'How much do you spend monthly?' },
  { id: 'loans', title: 'Loan Check', icon: Wallet, description: 'Any ongoing EMIs or debts?' },
  { id: 'goals', title: 'Financial Goals', icon: Target, description: 'What are you working towards?' },
  { id: 'portfolio', title: 'Portfolio', icon: PieChart, description: 'Do you have investments?' },
  { id: 'sync', title: 'Smart Sync', icon: ShieldCheck, description: 'Automatic expense tracking' },
  { id: 'summary', title: 'Snapshot', icon: BarChart3, description: 'Your financial overview' }
];

const Onboarding: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    income: { amount: '', category: 'Salary' },
    expenses: { amount: '', category: 'General' },
    loan: { hasLoans: false },
    loans: [] as any[],
    goal: { name: '', target: '', current: '0' },
    portfolio: { hasPortfolio: false, assets: [] as any[] },
    smartSync: true
  });

  const [assetSearch, setAssetSearch] = useState('');
  const [showAssetSuggestions, setShowAssetSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<SymbolResult[]>([]);
  const [currentLoan, setCurrentLoan] = useState({ 
    name: '', 
    lender: '', 
    emi: '', 
    totalAmount: '', 
    emiDueDate: '5', 
    startDate: new Date().toISOString().split('T')[0] 
  });

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (assetSearch.length > 1) {
        const results = await searchSymbols(assetSearch);
        setSearchResults(results.slice(0, 8));
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [assetSearch]);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (currentStep === 0) {
      trackEvent(AnalyticsEvents.ONBOARDING_STARTED);
    } else {
      trackEvent('onboarding_step_reached', { step: currentStep, stepName: steps[currentStep].title });
    }
  }, [currentStep]);

  const handleSkip = () => {
    trackEvent('onboarding_skipped', { step: currentStep, stepName: steps[currentStep].title });
    setShowSkipWarning(true);
  };

  useEffect(() => {
    if (isDatePickerOpen || showSkipWarning) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isDatePickerOpen, showSkipWarning]);

  const totalMonthlyIncome = Number(formData.income.amount) || 0;
  const totalMonthlyExpenses = Number(formData.expenses.amount) || 0;
  const totalMonthlyLoans = formData.loans.reduce((sum, l) => sum + (Number(l.emiAmount) || 0), 0);
  const netSavings = totalMonthlyIncome - totalMonthlyExpenses - totalMonthlyLoans;

  const handleNext = async () => {
    if (currentStep === STEPS.length - 1) {
      await handleComplete();
      return;
    }

    // Step Validation
    if (currentStep === 1 && !formData.income.amount) {
      toast.error('Please enter your income to continue');
      return;
    }
    if (currentStep === 2 && !formData.expenses.amount) {
      toast.error('Please estimate your expenses to continue');
      return;
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const confirmSkip = () => {
    setShowSkipWarning(false);
    setCurrentStep(prev => prev + 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      if (!user?.uid) return;

      // 1. Save data to Firestore (Transactions, Loans, Goals, Assets)
      if (formData.income.amount) {
        await addTransaction(user.uid, {
          type: 'income',
          amount: Number(formData.income.amount),
          category: formData.income.category,
          notes: 'Added during onboarding',
          date: new Date().toLocaleDateString('en-GB')
        });
      }

      if (formData.expenses.amount) {
        await addTransaction(user.uid, {
          type: 'expense',
          amount: Number(formData.expenses.amount),
          category: formData.expenses.category,
          notes: 'Added during onboarding',
          date: new Date().toLocaleDateString('en-GB')
        });
      }

      if (formData.loan.hasLoans && formData.loans.length > 0) {
        for (const loan of formData.loans) {
          const emi = Number(loan.emiAmount);
          const totalAmount = Number(loan.totalAmount) || (emi * 12); // Fallback if not provided
          const principal = totalAmount; // For simplicity in onboarding
          
          await addLoan(user.uid, {
            name: loan.lenderName || 'Debt',
            lenderName: loan.lenderName || 'Bank',
            principalAmount: principal,
            interestRate: 12,
            tenureMonths: 12,
            paidMonths: 0,
            totalAmount,
            totalInterest: 0,
            emi,
            remainingAmount: totalAmount,
            startDate: loan.startDate || new Date().toISOString(),
            emiDueDate: Number(loan.emiDueDate) || 5,
            status: 'active'
          });
        }
      }

      if (formData.goal.name && formData.goal.target) {
        await addGoal(user.uid, {
          name: formData.goal.name,
          targetAmount: Number(formData.goal.target),
          currentAmount: Number(formData.goal.current) || 0,
          category: 'Saving',
          deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      if (formData.portfolio.hasPortfolio && formData.portfolio.assets.length > 0) {
        for (const asset of formData.portfolio.assets) {
          // Map to match isValidPortfolioAsset in firestore.rules
          await addPortfolioAsset(user.uid, {
            category: asset.type, // Must be 'Stocks' or 'Crypto'
            assetName: asset.name,
            symbol: asset.symbol,
            assetType: asset.type.toLowerCase() === 'crypto' ? 'crypto' : 'stock',
            investedAmount: Number(asset.investedAmount),
            currentValue: Number(asset.investedAmount),
            quantity: 1, // Default for onboarding simple entry
            avgBuyPrice: Number(asset.investedAmount),
            lastPrice: Number(asset.investedAmount),
            metadata: {
              source: 'onboarding',
              symbol: asset.symbol
            }
          });
        }
      }

      // 2. Update Profile State
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        onboardingCompleted: true,
        smartSyncEnabled: formData.smartSync,
        monthlyIncome: totalMonthlyIncome,
        monthlyExpenses: totalMonthlyExpenses
      });

      // 3. Final Snapshot
      await updateFinancialSnapshot(user.uid);
      
      // 4. Trigger Portfolio Price Sync (The "Wow" moment)
      if (formData.portfolio.hasPortfolio) {
        syncPortfolioPrices(user.uid).catch(console.error);
      }
      
      trackEvent(AnalyticsEvents.ONBOARDING_COMPLETED);
      
      toast.success('Your setup is complete!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <div className="space-y-8 text-center py-6">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-200"
            >
              <Rocket className="text-white w-12 h-12" />
            </motion.div>
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">
                Take Control of <br />
                <span className="text-indigo-600">Your Money</span>
              </h1>
              <p className="text-lg text-gray-500 font-medium tracking-tight">In just 60 seconds</p>
            </div>
            <div className="grid grid-cols-1 gap-4 pt-4 max-w-sm mx-auto">
              {[
                "Know your real net worth",
                "Project future wealth",
                "Automate expense tracking"
              ].map((text, i) => (
                <div key={i} className="flex items-center space-x-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-gray-700">{text}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 1: // Income
        return (
          <div className="space-y-8 py-4">
            <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <TrendingUp className="text-white w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Monthly Income</h2>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-0.5">Step 2/8</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-black text-gray-400 uppercase tracking-widest ml-1">What's your monthly income?</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                    <span className="text-2xl font-black text-gray-300">₹</span>
                  </div>
                  <input
                    autoFocus
                    type="number"
                    value={formData.income.amount}
                    onChange={(e) => setFormData({ ...formData, income: { ...formData.income, amount: e.target.value } })}
                    className="block w-full pl-14 pr-6 py-6 bg-gray-50 border-2 border-transparent rounded-[2.5rem] focus:bg-white focus:border-indigo-600 transition-all font-black text-3xl text-gray-900 outline-none"
                    placeholder="75,000"
                  />
                </div>
                <p className="text-xs text-gray-400 font-medium ml-1">We use this to calculate your financial health score.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {['Salary', 'Business', 'Freelance', 'Rental'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFormData({ ...formData, income: { ...formData.income, category: cat } })}
                    className={`py-4 rounded-2xl text-sm font-bold border-2 transition-all ${
                      formData.income.category === cat 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                        : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2: // Expenses
        return (
          <div className="space-y-8 py-4">
            <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-center gap-4">
              <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-100">
                <TrendingDown className="text-white w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Monthly Spending</h2>
                <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mt-0.5">Step 3/8</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-2">
                <label className="block text-sm font-black text-gray-400 uppercase tracking-widest ml-1">How much do you spend monthly?</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                    <span className="text-2xl font-black text-gray-300">₹</span>
                  </div>
                  <input
                    autoFocus
                    type="number"
                    value={formData.expenses.amount}
                    onChange={(e) => setFormData({ ...formData, expenses: { ...formData.expenses, amount: e.target.value } })}
                    className="block w-full pl-14 pr-6 py-6 bg-gray-50 border-2 border-transparent rounded-[2.5rem] focus:bg-white focus:border-rose-600 transition-all font-black text-3xl text-gray-900 outline-none"
                    placeholder="30,000"
                  />
                </div>
                <p className="text-xs text-gray-400 font-medium ml-1">Rough estimate is fine, you can fine-tune later.</p>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {['10000', '25000', '40000', '60000'].map(val => (
                  <button
                    key={val}
                    onClick={() => setFormData({ ...formData, expenses: { ...formData.expenses, amount: val } })}
                    className="flex-none px-6 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:border-rose-400 active:scale-95 transition-all"
                  >
                    ₹{(parseInt(val) / 1000).toFixed(0)}K
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3: // Loans
        return (
          <div className="space-y-8 py-4">
            <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-100">
                <CreditCard className="text-white w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Active Loans</h2>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mt-0.5">Step 4/8</p>
              </div>
            </div>

            <div className="space-y-6">
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest ml-1 text-center">Do you have any active loans?</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setFormData({ ...formData, loan: { hasLoans: true } })}
                  className={`p-10 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 ${
                    formData.loan.hasLoans 
                      ? 'bg-amber-50 border-amber-600 shadow-xl shadow-amber-50' 
                      : 'bg-white border-gray-100 opacity-60'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${formData.loan.hasLoans ? 'bg-amber-600 shadow-lg shadow-amber-200' : 'bg-gray-100'}`}>
                    <CheckCircle2 className={`w-6 h-6 ${formData.loan.hasLoans ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-xl font-black ${formData.loan.hasLoans ? 'text-gray-900' : 'text-gray-400'}`}>Yes</span>
                </button>
                <button
                  onClick={() => {
                    setFormData({ ...formData, loan: { hasLoans: false }, loans: [] });
                    setCurrentStep(prev => prev + 1);
                  }}
                  className={`p-10 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 ${
                    !formData.loan.hasLoans 
                      ? 'bg-gray-50 border-gray-200 shadow-inner' 
                      : 'bg-white border-gray-100 opacity-60'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <X className="w-6 h-6 text-gray-400" />
                  </div>
                   <span className="text-xl font-black text-gray-400">No</span>
                </button>
              </div>

              <AnimatePresence>
                {formData.loan.hasLoans && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-6 pt-4 border-t border-gray-100 overflow-hidden"
                  >
                    {/* Added Loans List */}
                    {formData.loans.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Your Loans</label>
                        <div className="space-y-2">
                          {formData.loans.map((loan, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm">
                                  <CreditCard className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-gray-900">{loan.lenderName}</p>
                                  <p className="text-[10px] font-bold text-amber-600">Due day: {loan.emiDueDate}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <p className="text-sm font-black text-gray-900">₹{Number(loan.emiAmount).toLocaleString()}/mo</p>
                                <button 
                                  onClick={() => {
                                    const newLoans = [...formData.loans];
                                    newLoans.splice(idx, 1);
                                    setFormData({ ...formData, loans: newLoans });
                                  }}
                                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Loan Entry Form */}
                    <div className="space-y-6 p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">General Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lender Name *</label>
                            <input
                              type="text"
                              value={currentLoan.lender}
                              onChange={(e) => setCurrentLoan({ ...currentLoan, lender: e.target.value })}
                              className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl font-bold focus:border-amber-500 outline-none transition-all"
                              placeholder="e.g. HDFC Bank"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">EMI Amount *</label>
                            <div className="relative">
                              <span className="absolute left-5 inset-y-0 flex items-center font-black text-gray-300">₹</span>
                              <input
                                type="number"
                                value={currentLoan.emi}
                                onChange={(e) => setCurrentLoan({ ...currentLoan, emi: e.target.value })}
                                className="w-full pl-10 pr-5 py-4 bg-white border border-gray-100 rounded-2xl font-bold focus:border-amber-500 outline-none transition-all"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Extra Details <span className="text-[10px] font-bold text-gray-400 lowercase">(Recommended)</span></h3>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Total Loan Amount</label>
                            <div className="relative">
                              <span className="absolute left-5 inset-y-0 flex items-center font-black text-gray-300">₹</span>
                              <input
                                type="number"
                                value={currentLoan.totalAmount}
                                onChange={(e) => setCurrentLoan({ ...currentLoan, totalAmount: e.target.value })}
                                className="w-full pl-10 pr-5 py-4 bg-white border border-gray-100 rounded-2xl font-bold focus:border-amber-500 outline-none transition-all"
                                placeholder="Total principal"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">EMI Due Day</label>
                              <button
                                type="button"
                                onClick={() => setIsDatePickerOpen(true)}
                                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl font-bold focus:border-amber-500 outline-none transition-all flex items-center justify-between"
                              >
                                <span>{currentLoan.emiDueDate}{[1, 21, 31].includes(Number(currentLoan.emiDueDate)) ? 'st' : [2, 22].includes(Number(currentLoan.emiDueDate)) ? 'nd' : [3, 23].includes(Number(currentLoan.emiDueDate)) ? 'rd' : 'th'} of month</span>
                                <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Loan Start Date</label>
                              <input
                                type="date"
                                value={currentLoan.startDate}
                                onChange={(e) => setCurrentLoan({ ...currentLoan, startDate: e.target.value })}
                                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl font-bold focus:border-amber-500 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (!currentLoan.lender || !currentLoan.emi) {
                            toast.error('Lender and EMI are required');
                            return;
                          }
                          setFormData({
                            ...formData,
                            loans: [...formData.loans, {
                              lenderName: currentLoan.lender,
                              emiAmount: currentLoan.emi,
                              totalAmount: currentLoan.totalAmount,
                              emiDueDate: currentLoan.emiDueDate,
                              startDate: currentLoan.startDate
                            }]
                          });
                          setCurrentLoan({
                            name: '',
                            lender: '',
                            emi: '',
                            totalAmount: '',
                            emiDueDate: '5',
                            startDate: new Date().toISOString().split('T')[0]
                          });
                          toast.success('Loan added successfully');
                        }}
                        className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-amber-100 flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add Loan
                      </button>

                      <p className="text-center text-[10px] font-bold text-gray-400">Adding more details helps us track your loan balance better.</p>
                    </div>

                    {formData.loans.length > 0 && (
                      <div className="pt-2 text-center">
                        <p className="text-xs font-bold text-amber-600/60 uppercase tracking-widest">Total Monthly EMI: ₹{formData.loans.reduce((sum, l) => sum + Number(l.emiAmount), 0).toLocaleString()}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );

      case 4: // Goals
        return (
          <div className="space-y-8 py-4">
            <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <Target className="text-white w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Wealth Goals</h2>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-0.5">Step 5/8</p>
              </div>
            </div>

            <div className="space-y-6">
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest ml-1 text-center">What are you working towards?</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Buy a Bike', icon: Rocket, amount: '150000' },
                  { name: 'Buy a Car', icon: Car, amount: '1200000' },
                  { name: 'Emergency Fund', icon: Stethoscope, amount: '300000' },
                  { name: 'House Downpayment', icon: Home, amount: '2000000' }
                ].map(g => (
                  <button
                    key={g.name}
                    onClick={() => setFormData({ ...formData, goal: { ...formData.goal, name: g.name, target: g.amount } })}
                    className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${
                      formData.goal.name === g.name 
                        ? 'bg-indigo-50 border-indigo-600 shadow-xl shadow-indigo-50' 
                        : 'bg-white border-gray-100'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${formData.goal.name === g.name ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                      <g.icon className="w-6 h-6" />
                    </div>
                    <span className={`text-sm font-black text-center ${formData.goal.name === g.name ? 'text-gray-900' : 'text-gray-500'}`}>{g.name}</span>
                  </button>
                ))}
              </div>

              <div className="pt-4 space-y-4">
                <input
                  type="number"
                  value={formData.goal.target}
                  onChange={(e) => setFormData({ ...formData, goal: { ...formData.goal, target: e.target.value } })}
                  className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-3xl font-black text-2xl text-center focus:bg-white focus:border-indigo-600 transition-all outline-none"
                  placeholder="Goal Amount (₹)"
                />
                <p className="text-center text-xs font-bold text-gray-400 italic">"Visualizing your goal is the first step to owning it."</p>
              </div>
            </div>
          </div>
        );

      case 5: // Portfolio
        const displayedSuggestions = searchResults.length > 0 
          ? searchResults.map(r => ({ name: r.description || r.symbol, symbol: r.symbol, type: r.type === 'crypto' ? 'Crypto' : 'Stocks' }))
          : ASSET_SUGGESTIONS.filter(s => 
              s.name.toLowerCase().includes(assetSearch.toLowerCase()) || 
              s.symbol.toLowerCase().includes(assetSearch.toLowerCase())
            );

        return (
          <div className="space-y-8 py-4">
            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                <PieChart className="text-white w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Your Portfolio</h2>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Step 6/8</p>
              </div>
            </div>

            <div className="space-y-6">
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest ml-1 text-center">Do you have investments?</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setFormData({ ...formData, portfolio: { ...formData.portfolio, hasPortfolio: true } })}
                  className={`p-10 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${
                    formData.portfolio.hasPortfolio 
                      ? 'bg-emerald-50 border-emerald-600 shadow-xl shadow-emerald-50' 
                      : 'bg-white border-gray-100 opacity-60'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${formData.portfolio.hasPortfolio ? 'bg-emerald-600 shadow-lg shadow-emerald-200' : 'bg-gray-100'}`}>
                    <CheckCircle2 className={`w-6 h-6 ${formData.portfolio.hasPortfolio ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-xl font-black ${formData.portfolio.hasPortfolio ? 'text-gray-900' : 'text-gray-400'}`}>Yes</span>
                </button>
                <button
                  onClick={() => {
                    setFormData({ ...formData, portfolio: { hasPortfolio: false, assets: [] } });
                    setCurrentStep(prev => prev + 1);
                  }}
                  className={`p-10 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${
                    !formData.portfolio.hasPortfolio 
                      ? 'bg-gray-50 border-gray-200 shadow-inner' 
                      : 'bg-white border-gray-100 opacity-60'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <X className="w-6 h-6 text-gray-400" />
                  </div>
                   <span className="text-xl font-black text-gray-400">No</span>
                </button>
              </div>

              <AnimatePresence>
                {formData.portfolio.hasPortfolio && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-6 pt-4 border-t border-gray-100 overflow-hidden"
                  >
                    {/* Added Assets List */}
                    {formData.portfolio.assets.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Added Assets</label>
                        <div className="space-y-2">
                          {formData.portfolio.assets.map((asset, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm">
                                  {asset.type === 'Crypto' ? <Coins className="w-4 h-4 text-emerald-600" /> : <BarChart3 className="w-4 h-4 text-emerald-600" />}
                                </div>
                                <div className="max-w-[120px] sm:max-w-none">
                                  <p className="text-sm font-black text-gray-900 truncate">{asset.name}</p>
                                  <p className="text-[10px] font-bold text-emerald-600">{asset.symbol}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <p className="text-sm font-black text-gray-900">₹{Number(asset.investedAmount).toLocaleString()}</p>
                                <button 
                                  onClick={() => {
                                    const newAssets = [...formData.portfolio.assets];
                                    newAssets.splice(idx, 1);
                                    setFormData({ ...formData, portfolio: { ...formData.portfolio, assets: newAssets } });
                                  }}
                                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add New Asset */}
                    <div className="space-y-4">
                      <div className="relative">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Search Asset (e.g. Reliance, Bitcoin)</label>
                        <div className="relative mt-1">
                          <input
                            type="text"
                            value={assetSearch}
                            onChange={(e) => {
                              setAssetSearch(e.target.value);
                              setShowAssetSuggestions(true);
                            }}
                            onFocus={() => setShowAssetSuggestions(true)}
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.5rem] font-bold focus:bg-white focus:border-emerald-600 transition-all outline-none"
                            placeholder="Type to search..."
                          />
                          {showAssetSuggestions && assetSearch && (
                            <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-48 overflow-y-auto overflow-x-hidden">
                              {displayedSuggestions.map((s, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setAssetSearch(s.name);
                                    setShowAssetSuggestions(false);
                                  }}
                                  className="w-full px-6 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                                >
                                  <div className="max-w-[70%]">
                                    <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                                    <p className="text-[10px] font-bold text-gray-400">{s.symbol}</p>
                                  </div>
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0 ml-2">{s.type}</span>
                                </button>
                              ))}
                              {displayedSuggestions.length === 0 && (
                                <div className="px-6 py-4 text-center text-xs font-bold text-gray-400">No assets found. Try another name.</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Manual Entry or Selected Asset Details */}
                      {(displayedSuggestions.some(s => s.name === assetSearch) || (assetSearch && !showAssetSuggestions)) && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount Invested</label>
                            <div className="relative">
                              <span className="absolute left-6 inset-y-0 flex items-center font-black text-gray-300 text-xl">₹</span>
                              <input
                                id="asset-amount"
                                type="number"
                                className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.5rem] font-black focus:bg-white focus:border-emerald-600 transition-all outline-none"
                                placeholder="0"
                              />
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => {
                              const amountInput = document.getElementById('asset-amount') as HTMLInputElement;
                              const amount = amountInput?.value;
                              if (!amount || Number(amount) <= 0) {
                                toast.error('Enter a valid amount');
                                return;
                              }
                              
                              let asset = ASSET_SUGGESTIONS.find(s => s.name === assetSearch);
                              if (!asset && searchResults.length > 0) {
                                const matched = searchResults.find(r => r.description === assetSearch || r.symbol === assetSearch);
                                if (matched) {
                                  asset = { name: matched.description || matched.symbol, symbol: matched.symbol, type: matched.type === 'crypto' ? 'Crypto' : 'Stocks' };
                                }
                              }

                              // Fallback to manual name if no match
                              const finalAsset = asset || { name: assetSearch, symbol: assetSearch.toUpperCase(), type: 'Stocks' };
                              
                              setFormData({
                                ...formData,
                                portfolio: {
                                  ...formData.portfolio,
                                  assets: [...formData.portfolio.assets, { ...finalAsset, investedAmount: amount }]
                                }
                              });
                              setAssetSearch('');
                              if (amountInput) amountInput.value = '';
                              toast.success(`${finalAsset.name} added to portfolio`);
                            }}
                            className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> Add Asset
                          </Button>
                        </motion.div>
                      )}
                      
                      <div className="pt-4 text-center">
                        <p className="text-xs font-bold text-emerald-600/60 uppercase tracking-widest mb-1">Total Portfolio: ₹{formData.portfolio.assets.reduce((sum, a) => sum + Number(a.investedAmount), 0).toLocaleString()}</p>
                        <p className="text-[10px] font-medium text-gray-400">You can add more detailed holdings later in the dashboard.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );

      case 6: // Permission
        return (
          <div className="space-y-8 py-4">
            <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <ShieldCheck className="text-white w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Smart Sync</h2>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-0.5">Step 7/8</p>
              </div>
            </div>

            <div className="space-y-8 text-center">
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-gray-900">Want automatic tracking?</h3>
                <p className="text-gray-500 font-medium max-w-sm mx-auto">
                  WealthOS can read your bank SMS and automatically categorize expenses. Skip manual entry forever.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 max-w-xs mx-auto">
                <div className="flex items-center gap-3 text-left bg-emerald-50 p-4 rounded-2xl">
                  <Globe className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-emerald-700 leading-relaxed">No bank logins or passwords needed. We only read transactional SMS.</span>
                </div>
                <div className="flex items-center gap-3 text-left bg-indigo-50 p-4 rounded-2xl">
                  <Briefcase className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-indigo-700 leading-relaxed">Privacy first. Your data stays in the sandbox.</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  onClick={() => {
                    setFormData({ ...formData, smartSync: true });
                    handleNext();
                  }}
                  fullWidth
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100"
                >
                  Enable Smart Sync
                </Button>
                <button 
                  onClick={() => {
                    setFormData({ ...formData, smartSync: false });
                    handleNext();
                  }}
                  className="text-gray-400 font-bold text-sm py-2 hover:text-gray-600 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        );

      case 7: // Summary
        return (
          <div className="space-y-8 py-4">
            <div className="text-center space-y-4">
               <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-200"
              >
                <CheckCircle2 className="text-white w-10 h-10" />
              </motion.div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">Your Financial <br/><span className="text-indigo-600">Snapshot</span></h2>
              <p className="text-gray-500 font-medium">Initial system analysis complete.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Income</p>
                <p className="text-xl font-black text-gray-900">{formatCurrency(totalMonthlyIncome)}</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fixed Bills</p>
                <p className="text-xl font-black text-rose-600">{formatCurrency(totalMonthlyExpenses + totalMonthlyLoans)}</p>
              </div>
              <div className="col-span-2 bg-indigo-900 p-6 rounded-[2rem] text-white flex items-center justify-between shadow-2xl shadow-indigo-100">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Monthly Savings</p>
                  <p className="text-2xl font-black text-white">{formatCurrency(netSavings < 0 ? 0 : netSavings)}</p>
                </div>
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="text-white w-7 h-7" />
                </div>
              </div>
            </div>

            <div className="p-6 bg-amber-50 rounded-[2rem] border-2 border-amber-200/50 flex gap-4 items-start">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
              <div className="space-y-1">
                <h4 className="text-sm font-black text-amber-900">Onboarding Insight</h4>
                <p className="text-xs font-bold text-amber-700 leading-relaxed">
                  {netSavings > 0 
                    ? `You can reach your goal for ${formData.goal.name} in approx ${Math.ceil(Number(formData.goal.target) / (netSavings || 1))} months at this pace.`
                    : `Your current expenses exceed your income. Our AI will help you identify waste once we start syncing bills.`}
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 md:p-8 pt-6 pb-6 overflow-y-auto font-sans">
      <div className="max-w-2xl w-full flex flex-col min-h-0">
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-6 px-2 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <Logo size={24} />
             </div>
             <div className="hidden sm:block">
                <h1 className="text-sm font-black text-gray-900 uppercase tracking-widest leading-none">WealthOS</h1>
                <p className="text-[10px] font-bold text-indigo-600 tracking-tighter">Financial Intelligence</p>
             </div>
          </div>
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
             <div className="h-1.5 w-20 sm:w-24 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                  className="h-full bg-indigo-600"
                />
             </div>
             <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] whitespace-nowrap">Step {currentStep + 1}/{STEPS.length}</span>
          </div>
        </div>

        {/* Content Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.98, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.98, x: -20 }}
          className="flex-1 bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl shadow-indigo-100/30 border border-gray-100 overflow-hidden relative flex flex-col min-h-[500px]"
        >
          <div className="p-6 md:p-12 flex-1 overflow-y-auto scrollbar-hide pb-40">
            {renderStep()}
          </div>

          {/* Actions Bottom Bar */}
          <div className="p-6 md:p-8 border-t border-gray-50 flex flex-col items-center bg-white/90 backdrop-blur-md absolute bottom-0 left-0 right-0 z-10">
            <div className="w-full flex items-center gap-3">
              {currentStep > 0 && (
                <button 
                  onClick={handleBack}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-[1.5rem] bg-gray-50 text-gray-400 hover:text-gray-600 border border-gray-100 flex items-center justify-center transition-all active:scale-90 shrink-0"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 h-6" />
                </button>
              )}
              
              <Button
                onClick={handleNext}
                loading={loading}
                fullWidth
                size="lg"
                className="bg-indigo-600 hover:opacity-95 shadow-xl shadow-indigo-100 h-14 md:h-16 rounded-2xl md:rounded-[1.5rem] text-base md:text-lg flex-1 font-black uppercase tracking-widest"
              >
                {currentStep === 0 ? 'Start Setup' : currentStep === STEPS.length - 1 ? 'Go to Dashboard' : 'Continue'}
              </Button>
            </div>

            {currentStep > 0 && currentStep < STEPS.length - 1 && (
              <button
                onClick={() => setShowSkipWarning(true)}
                className="mt-4 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] hover:text-indigo-600 transition-colors py-2 px-6"
              >
                Skip for now
              </button>
            )}
            
            {/* Safe area spacing for mobile home bar */}
            <div className="h-6 w-full md:hidden" />
          </div>
        </motion.div>

        {/* Floating Trust Badge */}
        <div className="mt-8 flex items-center justify-center gap-8 opacity-40">
           <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Encrypted</span>
           </div>
           <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Bank-Grade Security</span>
           </div>
        </div>
      </div>

      {/* EMI Due Date Picker Bottom Sheet */}
      <AnimatePresence>
        {isDatePickerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDatePickerOpen(false)}
              className="fixed inset-0 z-[1100] bg-gray-900/40 backdrop-blur-sm md:hidden"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[1200] bg-white rounded-t-[3rem] shadow-2xl md:hidden flex flex-col h-[70vh] md:h-auto"
            >
              {/* Fixed Header */}
              <div className="p-6 pb-2 shrink-0 bg-white rounded-t-[3rem] z-10 border-b border-gray-50">
                <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-6" />
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-gray-900">EMI Due Day</h3>
                  <button onClick={() => setIsDatePickerOpen(false)} className="p-2 bg-gray-50 rounded-xl">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
              
              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="grid grid-cols-4 gap-3 pb-8">
                  {[...Array(31)].map((_, i) => {
                    const day = i + 1;
                    const isSelected = Number(currentLoan.emiDueDate) === day;
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          setCurrentLoan({ ...currentLoan, emiDueDate: day.toString() });
                        }}
                        className={`h-16 rounded-2xl font-black text-base transition-all ${
                          isSelected 
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' 
                            : 'bg-gray-50 text-gray-500 active:bg-gray-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-6 pt-2 pb-10 shrink-0 bg-white border-t border-gray-50 z-10">
                <Button 
                  onClick={() => setIsDatePickerOpen(false)}
                  fullWidth
                  size="lg"
                  className="bg-gray-900 hover:bg-gray-800 text-white shadow-xl shadow-gray-200 rounded-2xl h-16"
                >
                  Confirm Day
                </Button>
              </div>
            </motion.div>

            {/* Desktop Modal version */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[1100] hidden md:flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md"
              onClick={() => setIsDatePickerOpen(false)}
            >
              <div 
                className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-2xl font-black text-gray-900 mb-8 text-center">Select EMI Due Day</h3>
                <div className="grid grid-cols-7 gap-3 mb-8">
                  {[...Array(31)].map((_, i) => {
                    const day = i + 1;
                    const isSelected = Number(currentLoan.emiDueDate) === day;
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          setCurrentLoan({ ...currentLoan, emiDueDate: day.toString() });
                        }}
                        className={`w-full aspect-square rounded-xl flex items-center justify-center font-bold transition-all ${
                          isSelected 
                            ? 'bg-amber-500 text-white shadow-lg' 
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <Button 
                  onClick={() => setIsDatePickerOpen(false)}
                  fullWidth
                  className="rounded-2xl h-14 bg-gray-900"
                >
                  Confirm Selection
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Skip Warning Modal */}
      <AnimatePresence>
        {showSkipWarning && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.2)] text-center space-y-6"
            >
              <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="text-rose-500 w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">Wait, accuracy matters!</h3>
                <p className="text-gray-500 font-medium leading-relaxed">
                  Skipping this step will reduce the accuracy of your financial insights and AI predictions.
                </p>
              </div>
              <div className="flex flex-col gap-3 py-2">
                <Button 
                  onClick={() => setShowSkipWarning(false)}
                  fullWidth
                  size="lg"
                  className="rounded-2xl h-14 bg-indigo-600 shadow-xl shadow-indigo-100"
                >
                  I'll add it now
                </Button>
                <button 
                  onClick={confirmSkip}
                  className="w-full py-4 text-xs font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-all"
                >
                  Skip Anyway
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
