import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Transaction, Asset, Liability, FinancialSnapshot } from '../types';
import { 
  calculateMonthlyIncome, 
  calculateMonthlyExpenses, 
  calculateCashflow, 
  calculateNetWorth 
} from '../lib/financialEngine';
import { 
  getDailyStatus, 
  getMonthlyTrend, 
  getProgressSignal 
} from '../lib/retentionEngine';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  BarChart3, 
  Loader2,
  ArrowLeft,
  Activity,
  Calendar,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [usingSnapshot, setUsingSnapshot] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const snapshotPath = `users/${user.uid}/meta/financialSnapshot`;
    const transactionsPath = `users/${user.uid}/transactions`;
    const assetsPath = `users/${user.uid}/assets`;
    const liabilitiesPath = `users/${user.uid}/liabilities`;

    // 1. Optimization Layer: Listen to Financial Snapshot
    const unsubSnapshot = onSnapshot(
      doc(db, snapshotPath),
      (docSnap) => {
        if (docSnap.exists()) {
          setSnapshot(docSnap.data() as FinancialSnapshot);
          setUsingSnapshot(true);
          setLoading(false);
        } else {
          setUsingSnapshot(false);
        }
      },
      (err) => {
        console.warn("Snapshot fetch failed, falling back to full queries:", err);
        setUsingSnapshot(false);
      }
    );

    // 2. Fallback/Detail Layer: Listen to raw collections
    // We keep these for real-time updates when snapshot is not yet updated
    // and for the retention engine which needs raw transaction data.
    const unsubTransactions = onSnapshot(
      query(collection(db, transactionsPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
        setTransactions(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, transactionsPath)
    );

    const unsubAssets = onSnapshot(
      query(collection(db, assetsPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Asset[];
        setAssets(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, assetsPath)
    );

    const unsubLiabilities = onSnapshot(
      query(collection(db, liabilitiesPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Liability[];
        setLiabilities(docs);
        if (!usingSnapshot) setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, liabilitiesPath);
        if (!usingSnapshot) setLoading(false);
      }
    );

    return () => {
      unsubSnapshot();
      unsubTransactions();
      unsubAssets();
      unsubLiabilities();
    };
  }, [user?.uid, usingSnapshot]);

  // Calculations with Snapshot Fallback
  const monthlyIncome = Number((usingSnapshot && snapshot) ? snapshot.income : calculateMonthlyIncome(transactions)) || 0;
  const monthlyExpenses = Number((usingSnapshot && snapshot) ? snapshot.expenses : calculateMonthlyExpenses(transactions)) || 0;
  const cashflow = Number((usingSnapshot && snapshot) ? snapshot.cashflow : calculateCashflow(monthlyIncome, monthlyExpenses)) || 0;
  const netWorth = Number((usingSnapshot && snapshot) ? snapshot.netWorth : calculateNetWorth(assets, liabilities)) || 0;

  // Retention Engine Insights with Snapshot Fallback
  const dailyStatus = (usingSnapshot && snapshot) ? snapshot.dailyStatus : getDailyStatus(transactions);
  const monthlyTrend = (usingSnapshot && snapshot) ? snapshot.monthlyTrend : getMonthlyTrend(transactions);
  const progressSignal = (usingSnapshot && snapshot) ? snapshot.progressSignal : getProgressSignal(monthlyIncome, monthlyExpenses);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: number, icon: any, colorClass: string }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-gray-900">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link to="/" className="text-indigo-600 hover:text-indigo-500 flex items-center text-sm font-medium mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Profile
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Financial Dashboard</h1>
          <p className="mt-2 text-gray-600">Real-time overview of your financial health.</p>
        </div>
        <Link 
          to="/transactions" 
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Manage Data
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Monthly Income" 
          value={monthlyIncome} 
          icon={TrendingUp} 
          colorClass="bg-green-50 text-green-600" 
        />
        <StatCard 
          title="Monthly Expenses" 
          value={monthlyExpenses} 
          icon={TrendingDown} 
          colorClass="bg-red-50 text-red-600" 
        />
        <StatCard 
          title="Cashflow" 
          value={cashflow} 
          icon={BarChart3} 
          colorClass={cashflow >= 0 ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"} 
        />
        <StatCard 
          title="Net Worth" 
          value={netWorth} 
          icon={Wallet} 
          colorClass="bg-indigo-50 text-indigo-600" 
        />
      </div>

      {/* Retention Engine Section */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-gray-900">Daily Status</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{dailyStatus}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-gray-900">Monthly Trend</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{monthlyTrend}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Zap className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-gray-900">Progress Signal</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{progressSignal}</p>
        </div>
      </div>

      <div className="mt-12 p-8 bg-indigo-900 rounded-3xl text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-4">Financial Summary</h2>
          <p className="text-indigo-100 max-w-2xl">
            Your current savings rate is <span className="font-bold text-white">{(monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome * 100).toFixed(1) : 0)}%</span>. 
            Keep tracking your transactions to maintain an accurate financial state.
          </p>
        </div>
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-800 rounded-full opacity-20 blur-3xl"></div>
      </div>
    </div>
  );
};

export default Dashboard;
