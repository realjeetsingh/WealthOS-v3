import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, addDoc, serverTimestamp, orderBy, limit, getDocs, where, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Transaction, Asset, Liability, Loan, FinancialSnapshot, PortfolioAsset, NetWorthSnapshot } from '../types';
import { 
  calculateMonthlyIncome, 
  calculateMonthlyExpenses, 
  calculateCashflow, 
  calculateNetWorth,
  calculateTotalEMI,
  calculateCashBalance,
  calculatePortfolioValue,
  calculateTotalLoanRemaining
} from '../lib/financialEngine';
import { 
  getMonthlyStatus, 
  getMonthlyTrend, 
  getProgressSignal,
  getWeeklySummary,
  getAlerts,
  getUpgradedInsights
} from '../lib/retentionEngine';
import { handleFirestoreError, OperationType, humanizeFirestoreError } from '../lib/firestore-errors';
import { formatCurrency, formatCurrencyShort } from '../lib/formatCurrency';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  BarChart3, 
  Loader2,
  ArrowLeft,
  Activity,
  Calendar,
  Zap,
  Smartphone,
  AlertCircle,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  History,
  X,
  Target,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import FloatingAlerts, { Alert as FloatingAlert } from '../components/FloatingAlerts';
import EmiReminder from '../components/EmiReminder';
import AIChatAssistant from '../components/AIChatAssistant';
import EmptyState from '../components/EmptyState';
import AIInsightBanner from '../components/AIInsightBanner';
import DashboardHero from '../components/DashboardHero';
import UnifiedCashflowCard from '../components/UnifiedCashflowCard';
import NotificationApprovalList from '../components/NotificationApprovalList';
import IntelligenceOnboarding from '../components/IntelligenceOnboarding';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { updateStreak, UserStreak } from '../services/streakService';
import { getDailySnapshot, DailySnapshotData } from '../services/dailyHabitEngine';

import { toDate } from '../lib/dateUtils';
import { deriveFinancialState } from '../lib/financialLogic';

const Dashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [financialSnapshot, setFinancialSnapshot] = useState<FinancialSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [isIntelligenceModalOpen, setIsIntelligenceModalOpen] = useState(false);
  const [userStreak, setUserStreak] = useState<UserStreak | null>(null);
  const [dailySnapshot, setDailySnapshot] = useState<DailySnapshotData | null>(null);
  const navigate = useNavigate();

  const handleEnableIntelligence = async () => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationSyncEnabled: true,
        notificationPermissionAsked: true
      });
      setIsIntelligenceModalOpen(false);
      toast.success('Smart Sync enabled!');
    } catch (err) {
      toast.error('Failed to enable Smart Sync');
    }
  };

  const fetchRawData = async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    try {
      const transactionsPath = `users/${user.uid}/transactions`;
      const q = query(collection(db, transactionsPath));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
      setTransactions(docs);
      console.log("MANUAL RE-FETCH COMPLETE:", docs.length, "transactions");
    } catch (err) {
      console.error("Manual re-fetch failed:", err);
      toast.error(humanizeFirestoreError(err));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const snapshotPath = `users/${user.uid}/meta/financialSnapshot`;
    const transactionsPath = `users/${user.uid}/transactions`;
    const portfolioPath = `users/${user.uid}/portfolio`;
    const loansPath = `users/${user.uid}/loans`;
    const goalsPath = `users/${user.uid}/goals`;
    const snapshotsPath = `users/${user.uid}/netWorthSnapshots`;

    // 1. Optimization Layer: Listen to Financial Snapshot
    const unsubSnapshot = onSnapshot(
      doc(db, snapshotPath),
      (docSnap) => {
        if (docSnap.exists()) {
          setFinancialSnapshot(docSnap.data() as FinancialSnapshot);
        }
      },
      (err) => {
        console.warn("Snapshot fetch failed, falling back to raw queries:", err);
      }
    );

    // 2. Fallback/Detail Layer: Listen to raw collections
    const unsubTransactions = onSnapshot(
      query(collection(db, transactionsPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
        setTransactions(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, transactionsPath)
    );

    const unsubPortfolio = onSnapshot(
      query(collection(db, portfolioPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PortfolioAsset[];
        setPortfolioAssets(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, portfolioPath)
    );

    const unsubLoans = onSnapshot(
      query(collection(db, loansPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Loan[];
        setLoans(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, loansPath)
    );

    const unsubGoals = onSnapshot(
      query(collection(db, goalsPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        setGoals(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, goalsPath)
    );

    const unsubSnapshots = onSnapshot(
      query(collection(db, snapshotsPath), orderBy('timestamp', 'asc'), limit(30)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as NetWorthSnapshot[];
        setSnapshots(docs);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, snapshotsPath);
        setLoading(false);
      }
    );

    return () => {
      unsubSnapshot();
      unsubTransactions();
      unsubPortfolio();
      unsubLoans();
      unsubGoals();
      unsubSnapshots();
    };
  }, [user?.uid]);

  // Real-time Calculations
  const cashBalance = useMemo(() => calculateCashBalance(transactions), [transactions]);
  const portfolioValue = useMemo(() => calculatePortfolioValue(portfolioAssets), [portfolioAssets]);
  const loanBalance = useMemo(() => calculateTotalLoanRemaining(loans), [loans]);
  const netWorth = useMemo(() => calculateNetWorth(cashBalance, portfolioValue, loanBalance), [cashBalance, portfolioValue, loanBalance]);
  
  const monthlyIncome = useMemo(() => calculateMonthlyIncome(transactions), [transactions]);
  const monthlyExpenses = useMemo(() => calculateMonthlyExpenses(transactions, loans), [transactions, loans]);
  const cashflow = useMemo(() => calculateCashflow(monthlyIncome, monthlyExpenses), [monthlyIncome, monthlyExpenses]);
  const totalEMI = useMemo(() => calculateTotalEMI(loans), [loans]);

  // STEP 6 — MANDATORY DEBUG LOGGING
  useEffect(() => {
    if (transactions.length > 0) {
      console.log("DASHBOARD SYNC CHECK:", {
        transactionCount: transactions.length,
        calculatedIncome: monthlyIncome,
        calculatedExpenses: monthlyExpenses,
        cashflow: cashflow
      });
    }
  }, [transactions, monthlyIncome, monthlyExpenses, cashflow]);

  const userCurrency = userProfile?.currency || 'INR';

  // Retention Engine Insights
  const monthlyStatus = useMemo(() => getMonthlyStatus(monthlyIncome, monthlyExpenses), [monthlyIncome, monthlyExpenses]);
  const monthlyTrend = useMemo(() => getMonthlyTrend(transactions), [transactions]);
  const progressSignal = useMemo(() => getProgressSignal(monthlyIncome, monthlyExpenses), [monthlyIncome, monthlyExpenses]);
  const weeklySummary = useMemo(() => getWeeklySummary(transactions), [transactions]);
  const alerts = useMemo(() => getAlerts(monthlyIncome, monthlyExpenses, userProfile?.lastActiveDate), [monthlyIncome, monthlyExpenses, userProfile?.lastActiveDate]);
  const upgradedInsights = useMemo(() => getUpgradedInsights(monthlyIncome, monthlyExpenses, transactions), [monthlyIncome, monthlyExpenses, transactions]);

  // Streak System Logic
  useEffect(() => {
    if (!user?.uid || loading) return;

    const runStreakUpdate = async () => {
      const streak = await updateStreak(user.uid);
      setUserStreak(streak);
    };

    runStreakUpdate();
  }, [user?.uid, loading]);

  // Daily Snapshot Logic
  useEffect(() => {
    if (loading || transactions.length === 0) return;
    
    const snapshot = getDailySnapshot(transactions, loans, portfolioAssets, userProfile);
    setDailySnapshot(snapshot);
  }, [loading, transactions, loans, portfolioAssets, userProfile]);

  // Snapshot Saving Logic (Daily)
  useEffect(() => {
    if (!user?.uid || loading || netWorth === 0) return;

    const checkAndSaveSnapshot = async () => {
      const snapshotsPath = `users/${user.uid}/netWorthSnapshots`;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if we already have a snapshot for today
      const q = query(
        collection(db, snapshotsPath),
        where('timestamp', '>=', today),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        await addDoc(collection(db, snapshotsPath), {
          userId: user.uid,
          netWorth,
          cashBalance,
          portfolioValue,
          loanBalance,
          timestamp: serverTimestamp()
        });
      }
    };

    checkAndSaveSnapshot();
  }, [user?.uid, netWorth, loading]);

  // Convert alerts to floating alert format
  const floatingAlerts: FloatingAlert[] = useMemo(() => alerts.map((alert, i) => ({
    id: `alert-${i}-${Date.now()}`,
    type: alert.type === 'info' ? 'info' : 
          alert.type === 'danger' ? 'danger' : 'warning',
    title: alert.title,
    message: alert.message
  })), [alerts]);

  // Trend Calculation
  const lastSnapshot = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const netWorthTrend = lastSnapshot ? netWorth - lastSnapshot.netWorth : 0;
  
  const healthSummary = deriveFinancialState(netWorth, cashflow, loanBalance, monthlyIncome);
  const savingsTrend = netWorthTrend;

  const chartData = useMemo(() => snapshots.map(s => ({
    date: toDate(s.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    value: s.netWorth || 0
  })), [snapshots]);

  // Dynamic AI Power Score calculation
  const aiPowerScore = useMemo(() => {
    if (monthlyIncome === 0) return 0;
    const savingsRate = Math.max(0, (monthlyIncome - monthlyExpenses) / monthlyIncome);
    const investmentRatio = portfolioValue / (netWorth || 1);
    const debtRatio = Math.max(0, 1 - (loanBalance / (monthlyIncome * 12 || 1)));
    
    const score = (savingsRate * 40) + (investmentRatio * 40) + (debtRatio * 20);
    return Math.min(100, Math.round(score));
  }, [monthlyIncome, monthlyExpenses, portfolioValue, netWorth, loanBalance]);

  const scoreLabel = aiPowerScore > 80 ? 'Elite' : aiPowerScore > 60 ? 'Stable' : 'Risk';

  const isDashboardEmpty = transactions.length === 0 && portfolioAssets.length === 0 && loans.length === 0;

  const hasActiveAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return loans.some(loan => {
      if (loan.status !== 'active' || !loan.nextEmiDate) return false;
      const dueDate = new Date(loan.nextEmiDate);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    });
  }, [loans]);

  if (loading) {
    return (
      <div className="w-full max-w-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <Skeleton className="lg:col-span-2 h-[320px]" />
          <Skeleton className="h-[320px]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (isDashboardEmpty && !loading) {
    return (
      <div className="w-full h-[calc(100dvh-200px)] flex items-center justify-center">
        <EmptyState
          icon={Wallet}
          title="Welcome to WealthOS"
          description="Your financial journey starts now. To see your net worth and insights, add your first transaction or link your account."
          actionLabel="Start Onboarding"
          onAction={() => navigate('/onboarding')}
          className="max-w-2xl border-none shadow-none bg-transparent"
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-4">
      <FloatingAlerts initialAlerts={floatingAlerts} />
      
      {/* 1. TOP LAYER: AI Insight Ticker */}
      {dailySnapshot && <AIInsightBanner data={dailySnapshot} />}

      {/* Header Actions (Simplified for Mobile) */}
      <div className="mb-6 md:mb-10 flex flex-row items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Wealth OS</h1>
            {userStreak && userStreak.currentStreak > 0 && (
              <div className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md text-[8px] font-black border border-orange-100 uppercase tracking-widest">
                {userStreak.currentStreak} Day Streak
              </div>
            )}
          </div>
          <p className="text-gray-400 text-[9px] md:text-xs font-bold uppercase tracking-widest leading-none truncate">
            {healthSummary.stateLabel} <span className="mx-1 text-gray-200">•</span> Updated Just Now
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
            <Button 
              onClick={fetchRawData}
              loading={refreshing}
              variant="outline"
              size="sm"
              icon={<Activity className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            >
              <span className="hidden md:inline">Sync</span>
            </Button>
            <Link to="/transactions" className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100">
              <History className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
            </Link>
        </div>
      </div>

      {/* 2. HERO SECTION: Dominant Financial State */}
      <DashboardHero 
        netWorth={netWorth}
        cashBalance={cashBalance}
        portfolioValue={portfolioValue}
        loanBalance={loanBalance}
        savingsTrend={savingsTrend}
        currency={userCurrency}
        userName={userProfile?.fullName?.split(' ')[0]}
        healthSummary={healthSummary}
        income={monthlyIncome}
        expenses={monthlyExpenses}
      />
      
      {/* 2.5 INTELLIGENCE LAYER: Pending Alerts */}
      {userProfile?.notificationSyncEnabled && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600 animate-pulse" />
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Active Intelligence</h3>
            </div>
            <Link to="/review" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1">
              View Full Queue <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <NotificationApprovalList />
        </div>
      )}

      {/* 3. MAIN VISUALIZATION: Unified Cashflow */}
      <div className="mb-12">
        <UnifiedCashflowCard 
          income={monthlyIncome}
          expenses={monthlyExpenses}
          cashflow={cashflow}
          currency={userCurrency}
          transactions={transactions}
        />
      </div>

      {/* 4. ACTION & SECONDARY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 space-y-8">
           {hasActiveAlerts && (
             <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Priority Alerts</h3>
                  <div className="h-px flex-1 bg-gray-100 ml-4" />
                </div>
                <EmiReminder loans={loans} userId={user?.uid || ''} currency={userCurrency} variant="inline" />
             </div>
           )}

           <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Wealth Goals</h3>
                <div className="h-px flex-1 bg-gray-100 ml-4" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.length > 0 ? goals.slice(0, 2).map((goal, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
                      <Target className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{goal.category || 'Goal'}</p>
                      <h4 className="text-sm font-bold text-gray-900 truncate">{goal.name}</h4>
                      <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%` }}
                          className="h-full bg-indigo-500" 
                        />
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-10 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                    <Target className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed px-4">No active strategies detected.<br/>Set a goal to optimize.</p>
                  </div>
                )}
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Wealth Intel</h3>
                <div className="h-px flex-1 bg-gray-100 ml-4" />
              </div>
              
              <div className="space-y-4">
                {!userProfile?.notificationSyncEnabled && !userProfile?.notificationPermissionAsked && (
                  <div 
                    className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group cursor-pointer"
                    onClick={() => {
                        setIsIntelligenceModalOpen(true);
                        // Track that they saw it
                        if (user?.uid) {
                          updateDoc(doc(db, 'users', user.uid), {
                            notificationEducationSeen: true
                          }).catch(() => {});
                        }
                    }}
                  >
                    <Smartphone className="absolute top-0 right-0 -mt-2 -mr-2 w-20 h-20 text-white/5 opacity-40 group-hover:rotate-12 transition-transform" />
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-indigo-200" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Smart Feature</span>
                    </div>
                    <h4 className="text-xl font-black mb-2 leading-tight">Enable Auto-Sync Intelligence</h4>
                    <p className="text-sm text-indigo-100/80 mb-6 font-medium leading-relaxed">Automatically detect transactions from your bank alerts.</p>
                    <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-indigo-600 border-none px-6">
                      Setup Now
                    </Button>
                  </div>
                )}

                <div 
                  className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer" 
                  onClick={() => navigate('/portfolio')}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                      <PieChartIcon className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors" />
                  </div>
                  <h4 className="text-lg font-black text-gray-900 mb-1">Portfolio Analysis</h4>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">Distribution is weighted heavily in {portfolioAssets[0]?.type || 'Cash'}.</p>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group cursor-pointer">
                  <Zap className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 text-white/5 opacity-40 group-hover:rotate-45 transition-transform" />
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1" id="ai-power-score-label">Financial Health</p>
                  <h4 className="text-lg font-black mb-4">AI Power Score</h4>
                  <div className="flex items-end justify-between">
                    <p className="text-4xl font-black">{aiPowerScore}</p>
                    <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                      scoreLabel === 'Elite' ? 'bg-emerald-500/20 text-emerald-300' : 
                      scoreLabel === 'Stable' ? 'bg-white/20' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {scoreLabel} <Activity className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* AI Assistant FAB */}
      <AIChatAssistant 
        context={{
          netWorth,
          monthlyIncome,
          monthlyExpenses,
          loans,
          goals,
          healthSummary: healthSummary
        }}
        isPremium={userProfile?.isPremium || false}
        onUpgrade={() => setIsProModalOpen(true)}
        currency={userCurrency}
      />

      {/* Pro Gating Modal */}
      <AnimatePresence>
        {isProModalOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl text-center space-y-6 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setIsProModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="mx-auto w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                <Zap className="w-10 h-10 text-indigo-600 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Unlock AI Power</h3>
                <p className="text-gray-500 font-medium leading-relaxed">
                  The AI Financial Assistant analyzes your data to give you personalized wealth strategies. This is a Pro feature.
                </p>
              </div>

              <div className="bg-[#6334FD]/5 rounded-2xl p-4 text-left space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-black">✓</div>
                  <p className="text-sm font-bold text-gray-700">Context-Aware Advisory</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-black">✓</div>
                  <p className="text-sm font-bold text-gray-700">Goal Planning Engine</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-black">✓</div>
                  <p className="text-sm font-bold text-gray-700">10-Year Wealth Simulations</p>
                </div>
              </div>

              <Link 
                to="/profile" 
                onClick={() => setIsProModalOpen(false)}
                className="block w-full bg-[#6334FD] text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Go Pro for Unlimited Access
              </Link>
              
              <button 
                onClick={() => setIsProModalOpen(false)}
                className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
              >
                Maybe Later
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <IntelligenceOnboarding 
        isOpen={isIntelligenceModalOpen}
        onClose={async () => {
          setIsIntelligenceModalOpen(false);
          // If they close it, we still count it as "asked" for the dashboard CTA logic
          // to prevent clutter, but they can still enable it in settings.
          if (user?.uid) {
            await updateDoc(doc(db, 'users', user.uid), {
              notificationPermissionAsked: true
            }).catch(() => {});
          }
        }}
        onEnable={handleEnableIntelligence}
      />
    </div>
  );
};

export default Dashboard;
