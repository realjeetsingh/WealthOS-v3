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
  Minus,
  Briefcase,
  Home,
  Car,
  PiggyBank,
  Rocket,
  Sparkles,
  BarChart3,
  PieChart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  addTransaction, 
  addAsset, 
  addLoan, 
  addGoal 
} from '../services/financeService';
import { updateFinancialSnapshot, getFinancialSnapshot } from '../services/snapshotService';
import { formatCurrency, formatCurrencyShort } from '../lib/formatCurrency';
import { toast } from 'sonner';
import Button from '../components/ui/Button';

const STEPS = [
  { id: 'income', title: 'Monthly Income', icon: TrendingUp, description: 'How much do you earn each month?' },
  { id: 'expenses', title: 'Monthly Expenses', icon: TrendingDown, description: 'What are your typical monthly bills?' },
  { id: 'loans', title: 'Active Loans', icon: Wallet, description: 'Any ongoing EMIs or debts?' },
  { id: 'assets', title: 'Your Assets', icon: Home, description: 'What do you own? (Savings, Gold, etc.)' },
  { id: 'goals', title: 'Financial Goal', icon: Target, description: 'What are you saving for?' },
  { id: 'reward', title: 'Your Financial Health', icon: Sparkles, description: 'Instant insights based on your data' }
];

const Onboarding: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (userProfile && userProfile.hasSeenIntro === false) {
      setShowIntro(true);
    }
  }, [userProfile]);

  const startJourney = async () => {
    setIsTransitioning(true);
    try {
      const userRef = doc(db, 'users', user!.uid);
      await updateDoc(userRef, {
        hasSeenIntro: true
      });
      setTimeout(() => {
        setShowIntro(false);
        setIsTransitioning(false);
      }, 2000);
    } catch (error) {
      console.error("Error updating intro status:", error);
      setShowIntro(false);
      setIsTransitioning(false);
    }
  };

  // Form States
  const [income, setIncome] = useState({ amount: '', category: 'Salary', notes: '' });
  const [expense, setExpense] = useState({ amount: '', category: 'Rent', notes: '' });
  const [loan, setLoan] = useState({ name: '', principalAmount: '', emi: '', tenureMonths: '', paidMonths: '0' });
  const [asset, setAsset] = useState({ name: '', value: '', type: 'Savings' });
  const [goal, setGoal] = useState({ name: '', targetAmount: '', currentAmount: '0' });
  const [selectedGoalOption, setSelectedGoalOption] = useState<string | null>(null);

  const totalMonthlyIncome = Number(income.amount) || 0;
  const totalMonthlyExpenses = Number(expense.amount) || 0;
  const totalMonthlyEMI = Number(loan.emi) || 0;
  const monthlyCashflow = totalMonthlyIncome - totalMonthlyExpenses - totalMonthlyEMI;
  const expenseRatio = totalMonthlyIncome > 0 ? ((totalMonthlyExpenses + totalMonthlyEMI) / totalMonthlyIncome) * 100 : 0;

  const getFinancialFeedback = () => {
    if (totalMonthlyIncome === 0) return null;
    if (expenseRatio > 70) {
      return {
        message: `You're spending ${expenseRatio.toFixed(0)}% of your income. That's quite high!`,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-100',
        icon: AlertTriangle
      };
    }
    if (expenseRatio > 50) {
      return {
        message: `You're spending ${expenseRatio.toFixed(0)}% of your income. Good, but we can optimize.`,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-100',
        icon: TrendingDown
      };
    }
    return {
      message: `Great! You're saving ${formatCurrency(monthlyCashflow)} every month.`,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      icon: CheckCircle2
    };
  };

  const feedback = getFinancialFeedback();

  const getStepGuidance = () => {
    if (currentStep === 1) return "Good start — now let’s understand your spending";
    if (currentStep === 2 && totalMonthlyExpenses > 0) return `You’re spending ${formatCurrency(totalMonthlyExpenses)}/month — we’ll optimize this`;
    if (currentStep === 3 && totalMonthlyEMI > 0) {
      const emiLoad = (totalMonthlyEMI / totalMonthlyIncome) * 100;
      return `Your EMI load is ${emiLoad.toFixed(0)}% of your income`;
    }
    return null;
  };

  const guidance = getStepGuidance();

  const GOAL_OPTIONS = [
    { id: 'save_1l', name: `Save ${formatCurrencyShort(100000)}`, target: 100000, icon: PiggyBank },
    { id: 'debt_free', name: 'Become debt-free', target: totalMonthlyEMI * 12 || 500000, icon: ShieldCheck },
    { id: 'build_10l', name: `Build ${formatCurrencyShort(1000000)} portfolio`, target: 1000000, icon: TrendingUp },
    { id: 'custom', name: 'Custom goal', target: 0, icon: Plus }
  ];

  const calculateGoalProjection = () => {
    const target = Number(goal.targetAmount) || 0;
    const current = Number(goal.currentAmount) || 0;
    const remaining = target - current;
    
    if (remaining <= 0) return "You've already reached this goal!";
    if (monthlyCashflow <= 0) return "Increase your cashflow to reach this goal";
    
    const months = Math.ceil(remaining / monthlyCashflow);
    if (months > 120) return "This will take over 10 years at your current pace";
    return `At your current pace, you’ll reach this in ${months} month${months > 1 ? 's' : ''}`;
  };

  const LivePreview = () => {
    if (currentStep > 2 || totalMonthlyIncome === 0) return null;
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mt-8 p-6 rounded-2xl border ${feedback?.borderColor} ${feedback?.bgColor} space-y-4`}
      >
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2 text-indigo-600" />
            Live Preview
          </h4>
          <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded-md ${feedback?.bgColor} ${feedback?.color} border ${feedback?.borderColor}`}>
            Real-time
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monthly Cashflow</p>
            <p className={`text-xl font-black ${monthlyCashflow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {monthlyCashflow >= 0 ? '+' : ''}{formatCurrency(monthlyCashflow)}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Savings Potential</p>
            <p className="text-xl font-black text-indigo-600">
              {expenseRatio > 100 ? '0%' : `${(100 - expenseRatio).toFixed(0)}%`}
            </p>
          </div>
        </div>

        {feedback && (
          <div className={`flex items-start space-x-3 pt-3 border-t ${feedback.borderColor}`}>
            <feedback.icon className={`w-5 h-5 ${feedback.color} mt-0.5 flex-shrink-0`} />
            <p className={`text-sm font-bold ${feedback.color}`}>{feedback.message}</p>
          </div>
        )}
      </motion.div>
    );
  };

  const progress = (currentStep / (STEPS.length - 1)) * 100;

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setLoading(true);
      try {
        // Save data based on current step
        if (currentStep === 0 && income.amount) {
          await addTransaction(user?.uid, { 
            type: 'income', 
            amount: Number(income.amount), 
            category: income.category, 
            notes: income.notes 
          });
        } else if (currentStep === 1 && expense.amount) {
          await addTransaction(user?.uid, { 
            type: 'expense', 
            amount: Number(expense.amount), 
            category: expense.category, 
            notes: expense.notes 
          });
        } else if (currentStep === 2 && loan.name && loan.principalAmount) {
          const principal = Number(loan.principalAmount);
          const emi = Number(loan.emi);
          const tenure = Number(loan.tenureMonths);
          const paid = Number(loan.paidMonths);
          const totalAmount = emi * tenure;
          const totalInterest = totalAmount - principal;
          const remainingAmount = totalAmount - (emi * paid);
          
          await addLoan(user?.uid, {
            name: loan.name,
            principalAmount: principal,
            tenureMonths: tenure,
            paidMonths: paid,
            totalAmount,
            totalInterest,
            emi,
            remainingAmount,
            endDate: new Date(Date.now() + (tenure - paid) * 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active'
          });
        } else if (currentStep === 3 && asset.name && asset.value) {
          await addAsset(user?.uid, {
            name: asset.name,
            value: Number(asset.value),
            type: asset.type
          });
        } else if (currentStep === 4 && goal.name && goal.targetAmount) {
          await addGoal(user?.uid, {
            name: goal.name,
            targetAmount: Number(goal.targetAmount),
            currentAmount: Number(goal.currentAmount)
          });
        }

        if (currentStep === 4) {
          // Final step before reward - calculate snapshot
          const newSnapshot = await updateFinancialSnapshot(user!.uid);
          setSnapshot(newSnapshot);
        }

        setCurrentStep(prev => prev + 1);
      } catch (error) {
        console.error("Error saving onboarding data:", error);
        toast.error("Failed to save data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSkip = () => {
    if (currentStep === 4) {
      // If skipping the last step, we still need to calculate snapshot
      setLoading(true);
      updateFinancialSnapshot(user!.uid).then(snap => {
        setSnapshot(snap);
        setCurrentStep(prev => prev + 1);
        setLoading(false);
      });
    } else {
      setShowSkipWarning(true);
    }
  };

  const confirmSkip = () => {
    setShowSkipWarning(false);
    setCurrentStep(prev => prev + 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user!.uid);
      await updateDoc(userRef, {
        onboardingCompleted: true
      });
      navigate('/dashboard');
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Failed to complete onboarding.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    const step = STEPS[currentStep];
    
    switch (step.id) {
      case 'income':
        return (
          <div className="space-y-6">
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <TrendingUp className="text-white w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Primary Income</h3>
                <p className="text-sm text-gray-600">Enter your main monthly take-home pay.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Monthly Amount</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-bold">{userProfile?.currency || '₹'}</span>
                  </div>
                  <input
                    type="number"
                    value={income.amount}
                    onChange={(e) => setIncome({ ...income, amount: e.target.value })}
                    className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-lg"
                    placeholder="e.g. 75000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                <select
                  value={income.category}
                  onChange={(e) => setIncome({ ...income, category: e.target.value })}
                  className="block w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                >
                  <option>Salary</option>
                  <option>Business</option>
                  <option>Freelance</option>
                  <option>Rental</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <LivePreview />
          </div>
        );
      case 'expenses':
        return (
          <div className="space-y-6">
            <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 flex items-center space-x-4">
              <div className="w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
                <TrendingDown className="text-white w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Fixed Expenses</h3>
                <p className="text-sm text-gray-600">Rent, groceries, utilities, etc.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Monthly Amount</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-bold">{userProfile?.currency || '₹'}</span>
                  </div>
                  <input
                    type="number"
                    value={expense.amount}
                    onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
                    className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-bold text-lg"
                    placeholder="e.g. 35000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                <select
                  value={expense.category}
                  onChange={(e) => setExpense({ ...expense, category: e.target.value })}
                  className="block w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-medium"
                >
                  <option>Rent</option>
                  <option>Groceries</option>
                  <option>Utilities</option>
                  <option>Transport</option>
                  <option>Entertainment</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <LivePreview />
          </div>
        );
      case 'loans':
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex items-center space-x-4">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                <Wallet className="text-white w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Active Loans (Optional)</h3>
                <p className="text-sm text-gray-600">Home loan, Car loan, Personal loan, etc.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Loan Name</label>
                <input
                  type="text"
                  value={loan.name}
                  onChange={(e) => setLoan({ ...loan, name: e.target.value })}
                  className="block w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-medium"
                  placeholder="e.g. HDFC Home Loan"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Principal Amount</label>
                <input
                  type="number"
                  value={loan.principalAmount}
                  onChange={(e) => setLoan({ ...loan, principalAmount: e.target.value })}
                  className="block w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-medium"
                  placeholder="e.g. 5000000"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Monthly EMI</label>
                <input
                  type="number"
                  value={loan.emi}
                  onChange={(e) => setLoan({ ...loan, emi: e.target.value })}
                  className="block w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-medium"
                  placeholder="e.g. 45000"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Total Tenure (Months)</label>
                <input
                  type="number"
                  value={loan.tenureMonths}
                  onChange={(e) => setLoan({ ...loan, tenureMonths: e.target.value })}
                  className="block w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-medium"
                  placeholder="e.g. 240"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Months Paid</label>
                <input
                  type="number"
                  value={loan.paidMonths}
                  onChange={(e) => setLoan({ ...loan, paidMonths: e.target.value })}
                  className="block w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-medium"
                  placeholder="e.g. 12"
                />
              </div>
            </div>
            <LivePreview />
          </div>
        );
      case 'assets':
        return (
          <div className="space-y-6">
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-center space-x-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <Home className="text-white w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Your First Asset</h3>
                <p className="text-sm text-gray-600">Savings account, FD, Gold, or Property.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Asset Name</label>
                <input
                  type="text"
                  value={asset.name}
                  onChange={(e) => setAsset({ ...asset, name: e.target.value })}
                  className="block w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                  placeholder="e.g. Emergency Fund"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Current Value</label>
                  <input
                    type="number"
                    value={asset.value}
                    onChange={(e) => setAsset({ ...asset, value: e.target.value })}
                    className="block w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                    placeholder="e.g. 200000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Asset Type</label>
                  <select
                    value={asset.type}
                    onChange={(e) => setAsset({ ...asset, type: e.target.value })}
                    className="block w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                  >
                    <option>Savings</option>
                    <option>Fixed Deposit</option>
                    <option>Gold</option>
                    <option>Real Estate</option>
                    <option>Stocks</option>
                    <option>Crypto</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      case 'goals':
        return (
          <div className="space-y-8">
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Target className="text-white w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">What’s your financial goal?</h3>
                <p className="text-sm text-gray-600">Select one to see your path to wealth.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GOAL_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setSelectedGoalOption(option.id);
                    if (option.id !== 'custom') {
                      setGoal({ ...goal, name: option.name, targetAmount: option.target.toString() });
                    } else {
                      setGoal({ ...goal, name: '', targetAmount: '' });
                    }
                  }}
                  className={`p-[14px] md:p-[18px] rounded-[12px] md:rounded-[16px] border-2 text-left transition-all duration-150 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] flex items-center space-x-4 min-h-[48px] sm:min-h-[56px] md:min-h-[60px] ${
                    selectedGoalOption === option.id 
                      ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-500/10' 
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedGoalOption === option.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <option.icon className="w-5 h-5" />
                  </div>
                  <span className={`font-bold ${selectedGoalOption === option.id ? 'text-indigo-900' : 'text-gray-700'}`}>
                    {option.name}
                  </span>
                </button>
              ))}
            </div>

            <AnimatePresence>
              {(selectedGoalOption === 'custom' || (selectedGoalOption && selectedGoalOption !== 'custom')) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-6 pt-4 border-t border-gray-100"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Goal Name</label>
                      <input
                        type="text"
                        value={goal.name}
                        onChange={(e) => setGoal({ ...goal, name: e.target.value })}
                        className="block w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                        placeholder="e.g. New Car"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Target Amount</label>
                      <input
                        type="number"
                        value={goal.targetAmount}
                        onChange={(e) => setGoal({ ...goal, targetAmount: e.target.value })}
                        className="block w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                        placeholder="e.g. 1000000"
                      />
                    </div>
                  </div>

                  {goal.targetAmount && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-indigo-900 p-6 rounded-2xl text-white flex items-center space-x-4 shadow-xl shadow-indigo-200"
                    >
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                        <Rocket className="text-indigo-300 w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">AI Projection</p>
                        <p className="font-black text-lg leading-tight">
                          {calculateGoalProjection()}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      case 'reward':
        return (
          <div className="space-y-8 py-4">
            <div className="text-center space-y-4">
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-200"
              >
                <CheckCircle2 className="text-white w-12 h-12" />
              </motion.div>
              
              <div className="space-y-2">
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-black text-gray-900 tracking-tight leading-tight"
                >
                  Your financial system <br />
                  <span className="text-emerald-600">is now active</span>
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-gray-500 font-medium text-lg"
                >
                  We've analyzed your data. Here is your current standing.
                </motion.p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Net Worth', value: snapshot?.netWorth || 0, icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Monthly Cashflow', value: snapshot?.cashflow || 0, icon: PieChart, color: 'text-emerald-600', bg: 'bg-emerald-50', prefix: '+' },
                { label: '1-Year Projection', value: (snapshot?.netWorth || 0) + (snapshot?.cashflow || 0) * 12, icon: Rocket, color: 'text-amber-600', bg: 'bg-amber-50' }
              ].map((item, i) => (
                <motion.div 
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center space-y-2 hover:shadow-md transition-shadow"
                >
                  <div className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center mx-auto mb-3`}>
                    <item.icon className={`${item.color} w-6 h-6`} />
                  </div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                  <p className={`text-2xl font-black ${item.label === 'Monthly Cashflow' ? item.color : 'text-gray-900'}`}>
                    {item.prefix || ''}{formatCurrency(item.value)}
                  </p>
                </motion.div>
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-gray-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl shadow-gray-200"
            >
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left space-y-2">
                  <h4 className="text-2xl font-black">Ready to grow?</h4>
                  <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-xs">
                    Your personalized wealth-building strategies are waiting in your dashboard.
                  </p>
                </div>
                <Button 
                  onClick={handleComplete}
                  loading={loading}
                  size="lg"
                  icon={<ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />}
                >
                  Go to Dashboard
                </Button>
              </div>
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
            </motion.div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 md:p-8">
      <AnimatePresence mode="wait">
        {showIntro ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-white flex flex-col items-center overflow-y-auto p-6 pt-10 pb-24 text-center"
          >
            {!isTransitioning ? (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="max-w-xl w-full space-y-12"
              >
                <div className="space-y-4">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-200 rotate-12"
                  >
                    <Rocket className="text-white w-10 h-10" />
                  </motion.div>
                  <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                    Take Control of Your <br />
                    <span className="text-indigo-600">Financial Future</span>
                  </h1>
                  <p className="text-xl text-gray-500 font-medium">
                    Track, analyze, and grow your wealth with AI-powered insights
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 text-left">
                  {[
                    { text: "Know your real net worth", icon: BarChart3 },
                    { text: "See your future wealth in 1 year", icon: TrendingUp },
                    { text: "Identify where your money is leaking", icon: AlertTriangle }
                  ].map((benefit, i) => (
                    <motion.div 
                      key={i}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.5 + (i * 0.1) }}
                      className="flex items-center space-x-4 bg-gray-50 p-4 rounded-2xl border border-gray-100"
                    >
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <benefit.icon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="font-bold text-gray-700">{benefit.text}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-8">
                  <p className="text-gray-600 font-medium italic">
                    "Most people don’t know where their money goes. <br />
                    <span className="text-gray-900 font-bold not-italic">You’re about to change that."</span>
                  </p>
                  <Button
                    onClick={startJourney}
                    fullWidth
                    size="lg"
                    icon={<ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />}
                  >
                    Start My Financial Journey
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-6"
              >
                <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                  Welcome to the new era <br />
                  of your finances
                </h2>
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Progress Header */}
      <div className="max-w-2xl w-full mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <span className="text-white font-black text-xl">W</span>
            </div>
            <span className="font-black text-gray-900 tracking-tighter text-xl">WealthOS Onboarding</span>
          </div>
          <span className="text-sm font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-100">
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-indigo-600"
          />
        </div>
      </div>

      {/* Main Content Card */}
      <motion.div 
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-xl shadow-indigo-100/50 border border-gray-100 overflow-hidden"
      >
        <div className="p-8 md:p-12">
          {currentStep < STEPS.length - 1 && (
            <div className="mb-10">
              <AnimatePresence mode="wait">
                {guidance && (
                  <motion.div 
                    key={guidance}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mb-4 inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-widest rounded-full border border-indigo-100"
                  >
                    <Sparkles className="w-3 h-3 mr-2" />
                    {guidance}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-center space-x-3 mb-2">
                {React.createElement(STEPS[currentStep].icon, { className: "w-6 h-6 text-indigo-600" })}
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{STEPS[currentStep].title}</h2>
              </div>
              <p className="text-gray-500 font-medium">{STEPS[currentStep].description}</p>
            </div>
          )}

          {renderStepContent()}

          {currentStep < STEPS.length - 1 && (
            <div className="mt-12 flex items-center space-x-4">
              {currentStep > 0 && (
                <Button 
                  variant="secondary"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  icon={<ChevronLeft className="w-6 h-6" />}
                />
              )}
              <Button 
                onClick={handleNext}
                loading={loading}
                fullWidth
                icon={<ChevronRight className="w-5 h-5" />}
              >
                Continue
              </Button>
              <Button 
                variant="ghost"
                onClick={handleSkip}
              >
                Skip
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Skip Warning Modal */}
      <AnimatePresence>
        {showSkipWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-gray-100"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle className="text-amber-500 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">Are you sure?</h3>
              <p className="text-gray-600 leading-relaxed mb-8">
                Skipping this step will reduce the accuracy of your financial insights and AI-powered recommendations.
              </p>
              <div className="flex flex-col space-y-3">
                <Button 
                  onClick={() => setShowSkipWarning(false)}
                  fullWidth
                  size="lg"
                >
                  I'll add it now
                </Button>
                <Button 
                  variant="secondary"
                  onClick={confirmSkip}
                  fullWidth
                  size="lg"
                >
                  Skip anyway
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Trust */}
      <div className="mt-8 flex items-center space-x-6 text-gray-400 text-xs font-bold uppercase tracking-widest">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Secure Encryption</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>AI Powered</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Private Data</span>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
