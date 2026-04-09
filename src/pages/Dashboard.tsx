import React, { useState, useEffect } from 'react';
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
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
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
  AlertCircle,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  History
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
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

const Dashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [financialSnapshot, setFinancialSnapshot] = useState<FinancialSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      unsubSnapshots();
    };
  }, [user?.uid]);

  // Real-time Calculations
  const cashBalance = calculateCashBalance(transactions);
  const portfolioValue = calculatePortfolioValue(portfolioAssets);
  const loanBalance = calculateTotalLoanRemaining(loans);
  const netWorth = calculateNetWorth(cashBalance, portfolioValue, loanBalance);
  
  const monthlyIncome = calculateMonthlyIncome(transactions);
  const monthlyExpenses = calculateMonthlyExpenses(transactions, loans);
  const cashflow = calculateCashflow(monthlyIncome, monthlyExpenses);
  const totalEMI = calculateTotalEMI(loans);

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
  const monthlyStatus = getMonthlyStatus(monthlyIncome, monthlyExpenses);
  const monthlyTrend = getMonthlyTrend(transactions);
  const progressSignal = getProgressSignal(monthlyIncome, monthlyExpenses);
  const weeklySummary = getWeeklySummary(transactions);
  const alerts = getAlerts(monthlyIncome, monthlyExpenses, userProfile?.lastActiveDate);
  const upgradedInsights = getUpgradedInsights(monthlyIncome, monthlyExpenses, transactions);

  // Streak System Logic
  useEffect(() => {
    if (!user?.uid || !userProfile || loading) return;

    const updateStreak = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastActive = userProfile.lastActiveDate?.toDate();
      if (lastActive) {
        lastActive.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - lastActive.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return; // Already updated today

        if (diffDays === 1) {
          // Increment streak
          await updateDoc(doc(db, 'users', user.uid), {
            streakCount: (userProfile.streakCount || 0) + 1,
            lastActiveDate: serverTimestamp()
          });
        } else if (diffDays > 1) {
          // Reset streak
          await updateDoc(doc(db, 'users', user.uid), {
            streakCount: 1,
            lastActiveDate: serverTimestamp()
          });
        }
      } else {
        // First time
        await updateDoc(doc(db, 'users', user.uid), {
          streakCount: 1,
          lastActiveDate: serverTimestamp()
        });
      }
    };

    updateStreak();
  }, [user?.uid, userProfile?.lastActiveDate, loading]);

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

  // Trend Calculation
  const lastSnapshot = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const netWorthTrend = lastSnapshot ? netWorth - lastSnapshot.netWorth : 0;
  const isIncreasing = netWorthTrend >= 0;

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

  const chartData = snapshots.map(s => ({
    date: s.timestamp?.toDate ? s.timestamp.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '',
    value: s.netWorth
  }));

  return (
    <div className="w-full max-w-full">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight truncate">Financial Dashboard</h1>
            {userProfile?.streakCount && (
              <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-sm font-black border border-orange-100 animate-pulse">
                <Zap className="w-4 h-4 fill-orange-600" />
                {userProfile.streakCount} DAY STREAK
              </div>
            )}
          </div>
          <p className="text-gray-600">Focusing on your long-term wealth and progress.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button 
            onClick={fetchRawData}
            loading={refreshing}
            variant="outline"
            icon={<Activity className="w-4 h-4" />}
            title="Force recalculation from raw transactions"
          >
            Refresh
          </Button>
          <Link 
            to="/portfolio" 
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-all active:scale-[0.98] duration-150 shadow-sm whitespace-nowrap"
          >
            <PieChartIcon className="w-4 h-4" />
            Portfolio
          </Link>
          <Link 
            to="/transactions" 
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-all active:scale-[0.98] duration-150 shadow-md whitespace-nowrap"
          >
            <TrendingUp className="w-4 h-4" />
            Manage Data
          </Link>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="mb-8 space-y-3">
          {alerts.map((alert, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                alert.type === 'danger' ? 'bg-red-50 border-red-100 text-red-700' :
                alert.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                'bg-blue-50 border-blue-100 text-blue-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold text-sm">{alert.title}</p>
                  <p className="text-xs opacity-90">{alert.message}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Primary Net Worth Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 bg-indigo-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-indigo-100 font-medium mb-1">Total Net Worth</p>
                <h2 className="text-5xl font-black tracking-tighter">
                  <CurrencyDisplay value={netWorth} currency={userCurrency} />
                </h2>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${isIncreasing ? 'bg-green-400/20 text-green-300' : 'bg-red-400/20 text-red-300'}`}>
                {isIncreasing ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {isIncreasing ? 'Increasing' : 'Decreasing'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-indigo-500/50">
              <div>
                <p className="text-indigo-200 text-xs uppercase tracking-wider font-bold mb-1">Cash</p>
                <div className="text-xl font-bold">
                  <CurrencyDisplay value={cashBalance} currency={userCurrency} />
                </div>
              </div>
              <div>
                <p className="text-indigo-200 text-xs uppercase tracking-wider font-bold mb-1">Portfolio</p>
                <div className="text-xl font-bold">
                  <CurrencyDisplay value={portfolioValue} currency={userCurrency} />
                </div>
              </div>
              <div>
                <p className="text-indigo-200 text-xs uppercase tracking-wider font-bold mb-1">Loans</p>
                <div className="text-xl font-bold text-red-300">
                  -<CurrencyDisplay value={loanBalance} currency={userCurrency} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-500 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-60 h-60 bg-indigo-400 rounded-full opacity-10 blur-3xl"></div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Net Worth Trend
              </h3>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Last 30 Days</span>
            </div>
            <div className="h-40 w-full">
              {snapshots.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    <RechartsTooltip 
                      formatter={(value: number) => [formatCurrencyShort(value, userCurrency), 'Net Worth']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm text-center">
                  <Activity className="w-8 h-8 mb-2 opacity-20" />
                  <p>Keep using the app to<br/>see your wealth trend.</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-50">
            <div className="text-sm text-gray-600">
              {netWorthTrend !== 0 ? (
                <>Your net worth {isIncreasing ? 'increased' : 'decreased'} by <span className={`font-bold ${isIncreasing ? 'text-green-600' : 'text-red-600'}`}><CurrencyDisplay value={Math.abs(netWorthTrend)} currency={userCurrency} /></span> since your last visit.</>
              ) : (
                "Start tracking your assets and liabilities to see your wealth grow."
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] duration-150 cursor-pointer flex flex-col min-h-[160px]">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider truncate">Monthly Income</p>
            <div className="p-2 bg-green-50 rounded-lg text-green-600 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter truncate">
            <CurrencyDisplay value={monthlyIncome} currency={userCurrency} />
          </h3>
          <p className="text-xs text-gray-400 mt-auto line-clamp-2">Total earnings from all sources this month.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] duration-150 cursor-pointer flex flex-col min-h-[160px]">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider truncate">Monthly Expenses</p>
            <div className="p-2 bg-red-50 rounded-lg text-red-600 shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter truncate">
            <CurrencyDisplay value={monthlyExpenses} currency={userCurrency} />
          </h3>
          <p className="text-xs text-gray-400 mt-auto line-clamp-2">Total spending including EMIs and bills.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] duration-150 cursor-pointer flex flex-col min-h-[160px]">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider truncate">Monthly Cashflow</p>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-3xl font-black tracking-tighter truncate ${cashflow >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
            <CurrencyDisplay value={cashflow} currency={userCurrency} />
          </h3>
          <p className="text-xs text-gray-400 mt-auto line-clamp-2">Net savings after all expenses.</p>
        </div>
      </div>

      {/* Retention Engine Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[220px]">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-indigo-50 rounded-lg shrink-0">
              <Activity className="w-6 h-6 text-[#4F46E5]" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg truncate">Monthly Status</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">{monthlyStatus}</p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[220px]">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-indigo-50 rounded-lg shrink-0">
              <Calendar className="w-6 h-6 text-[#4F46E5]" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg truncate">Weekly Summary</h3>
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">This Week:</span>
              <span className="font-bold text-gray-900"><CurrencyDisplay value={weeklySummary.thisWeek.savings} currency={userCurrency} /></span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Last Week:</span>
              <span className="font-bold text-gray-900"><CurrencyDisplay value={weeklySummary.lastWeek.savings} currency={userCurrency} /></span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 line-clamp-2">
            {weeklySummary.thisWeek.savings > weeklySummary.lastWeek.savings 
              ? "Great! You've saved more than last week." 
              : "Try to reduce expenses to beat last week's savings."}
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[220px]">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-indigo-50 rounded-lg shrink-0">
              <Zap className="w-6 h-6 text-[#4F46E5]" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg truncate">Smart Insights</h3>
          </div>
          <div className="space-y-4 flex-1 overflow-hidden">
            {upgradedInsights.length > 0 ? (
              <div className="space-y-3">
                {upgradedInsights.slice(0, 2).map((insight, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{insight.title}</p>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest truncate">Action: {insight.action}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">{progressSignal}</p>
            )}
          </div>
        </div>
      </div>

      {totalEMI > 0 && (
        <div className="mb-12">
          {(() => {
            const emiRatio = monthlyIncome > 0 ? (totalEMI / monthlyIncome) * 100 : 0;
            let pressure = {
              text: "Your EMI load is manageable, but can still be optimized",
              color: 'text-indigo-600',
              bgColor: 'bg-indigo-50',
              borderColor: 'border-indigo-100',
              icon: <Zap className="w-6 h-6 text-indigo-600" />
            };

            if (emiRatio > 40) {
              pressure = {
                text: (
                  <>
                    High EMI burden: <CurrencyDisplay value={totalEMI} currency={userCurrency} />/month is limiting your financial growth
                  </>
                ),
                color: 'text-red-600',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-100',
                icon: <ShieldAlert className="w-6 h-6 text-red-600" />
              };
            } else if (emiRatio >= 20) {
              pressure = {
                text: (
                  <>
                    <CurrencyDisplay value={totalEMI} currency={userCurrency} />/month in EMIs is reducing your savings potential
                  </>
                ),
                color: 'text-amber-600',
                bgColor: 'bg-amber-50',
                borderColor: 'border-amber-100',
                icon: <AlertCircle className="w-6 h-6 text-amber-600" />
              };
            }

            return (
              <div className={`${pressure.bgColor} ${pressure.borderColor} border-2 p-8 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm`}>
                <div className="flex items-center space-x-5">
                  <div className="p-4 rounded-xl bg-white shadow-sm">
                    {pressure.icon}
                  </div>
                  <div>
                    <p className={`text-xl font-bold ${pressure.color} leading-tight`}>
                      {pressure.text}
                    </p>
                    {monthlyIncome > 0 && (
                      <p className="text-sm font-medium text-gray-500 mt-2">
                        EMIs consume <span className="text-gray-900 font-bold">{emiRatio.toFixed(1)}%</span> of your monthly income. Reducing this can increase your monthly savings by <span className="text-gray-900 font-bold"><CurrencyDisplay value={totalEMI} currency={userCurrency} /></span>.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 text-center md:text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Debt Freedom Score</p>
                  <p className={`text-4xl font-bold ${emiRatio > 40 ? 'text-red-600' : emiRatio > 20 ? 'text-amber-600' : 'text-green-600'}`}>
                    {Math.max(0, 100 - Math.round(emiRatio))}%
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
