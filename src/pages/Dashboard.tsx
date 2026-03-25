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
  getMonthlyStatus, 
  getMonthlyTrend, 
  getProgressSignal 
} from '../lib/retentionEngine';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { formatCurrency } from '../lib/formatCurrency';
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
  const monthlyStatus = (usingSnapshot && snapshot) ? snapshot.monthlyStatus : getMonthlyStatus(monthlyIncome, monthlyExpenses);
  const monthlyTrend = (usingSnapshot && snapshot) ? snapshot.monthlyTrend : getMonthlyTrend(transactions);
  const progressSignal = (usingSnapshot && snapshot) ? snapshot.progressSignal : getProgressSignal(monthlyIncome, monthlyExpenses);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, colorClass, isHighlighted = false }: { title: string, value: number, icon: any, colorClass: string, isHighlighted?: boolean }) => (
    <div className={`p-8 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-5 transition-all hover:shadow-md ${isHighlighted ? 'bg-indigo-600 border-indigo-600' : 'bg-white'}`}>
      <div className={`p-4 rounded-xl ${isHighlighted ? 'bg-white/20 text-white' : colorClass}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className={`text-3xl font-bold tracking-tight ${isHighlighted ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(value)}</p>
        <p className={`text-sm font-medium ${isHighlighted ? 'text-indigo-100' : 'text-gray-500'}`}>{title}</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          title="Monthly Income" 
          value={monthlyIncome} 
          icon={TrendingUp} 
          colorClass="bg-green-50 text-[#16A34A]" 
        />
        <StatCard 
          title="Monthly Expenses" 
          value={monthlyExpenses} 
          icon={TrendingDown} 
          colorClass="bg-red-50 text-[#DC2626]" 
        />
        <StatCard 
          title="Cashflow" 
          value={cashflow} 
          icon={BarChart3} 
          colorClass={cashflow >= 0 ? "bg-indigo-50 text-[#4F46E5]" : "bg-orange-50 text-orange-600"} 
        />
        <StatCard 
          title="Net Worth" 
          value={netWorth} 
          icon={Wallet} 
          colorClass="bg-indigo-50 text-[#4F46E5]" 
          isHighlighted={true}
        />
      </div>

      {/* Retention Engine Section */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-indigo-50 rounded-lg">
              <Activity className="w-6 h-6 text-[#4F46E5]" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Monthly Status</h3>
          </div>
          <p className="text-gray-600 leading-relaxed">{monthlyStatus}</p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-indigo-50 rounded-lg">
              <Calendar className="w-6 h-6 text-[#4F46E5]" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Monthly Trend</h3>
          </div>
          <p className="text-gray-600 leading-relaxed">{monthlyTrend}</p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-indigo-50 rounded-lg">
              <Zap className="w-6 h-6 text-[#4F46E5]" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Progress Signal</h3>
          </div>
          <p className="text-gray-600 leading-relaxed">{progressSignal}</p>
        </div>
      </div>

      <div className="mt-16 p-10 bg-[#4F46E5] rounded-xl text-white relative overflow-hidden shadow-lg">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-4">Financial Summary</h2>
          <p className="text-indigo-100 max-w-2xl">
            Your current savings rate is <span className="font-bold text-white">{(monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome * 100).toFixed(1) : 0)}%</span>. 
            Keep tracking your transactions to maintain an accurate financial state.
          </p>
        </div>
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-800 rounded-full opacity-20 blur-3xl"></div>
      </div>
    </>
  );
};

export default Dashboard;
