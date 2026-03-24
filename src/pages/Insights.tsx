import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Transaction, Asset, Liability, FinancialSnapshot } from '../types';
import { 
  calculateMonthlyIncome, 
  calculateMonthlyExpenses, 
  calculateNetWorth 
} from '../lib/financialEngine';
import { compareScenarios } from '../lib/scenarioEngine';
import { generateFinancialAdvice, FinancialAdvice } from '../lib/decisionEngine';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { handleUpgrade } from '../lib/paymentService';
import { formatCurrency } from '../lib/formatCurrency';
import { 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  ArrowLeft,
  Loader2,
  BrainCircuit,
  Crown,
  Lock,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Insights: React.FC = () => {
  const { user, userProfile, isPremium } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [usingSnapshot, setUsingSnapshot] = useState(false);
  const [loading, setLoading] = useState(true);

  const onUpgrade = React.useCallback(async () => {
    console.log("onUpgrade triggered for user:", user?.uid);
    if (user?.uid) {
      await handleUpgrade(user.uid, user.email || undefined, userProfile?.name);
    }
  }, [user?.uid, user?.email, userProfile?.name]);

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

  // Pipeline Execution with Snapshot Fallback
  const income = Number((usingSnapshot && snapshot) ? snapshot.income : calculateMonthlyIncome(transactions)) || 0;
  const expenses = Number((usingSnapshot && snapshot) ? snapshot.expenses : calculateMonthlyExpenses(transactions)) || 0;
  const currentAssets = Number((usingSnapshot && snapshot) ? snapshot.assetsTotal : assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0)) || 0;
  const currentLiabilities = Number((usingSnapshot && snapshot) ? snapshot.liabilitiesTotal : liabilities.reduce((sum, l) => sum + (Number(l.remainingBalance) || 0), 0)) || 0;

  // FEATURE GATING: Limit simulation years
  const simulationYears = isPremium ? 10 : 5;

  // Run Scenario Comparison
  let scenarios = compareScenarios({
    income,
    expenses,
    assets: currentAssets,
    liabilities: currentLiabilities,
    years: simulationYears
  });

  // FEATURE GATING: Limit scenarios
  if (!isPremium) {
    scenarios = scenarios.slice(0, 3);
  }

  // Run Decision Engine
  let advice: FinancialAdvice | null = null;
  try {
    advice = generateFinancialAdvice({
      scenarios,
      income,
      expenses,
      liabilities: currentLiabilities
    });

    // Step 7: Debug Log
    console.log({
      income,
      expenses,
      netWorth: currentAssets - currentLiabilities,
      improvement: advice?.improvement
    });

    // FEATURE GATING: Hide advanced recommendations
    if (!isPremium && advice) {
      advice.recommendations = advice.recommendations.slice(0, 1);
    }
  } catch (error) {
    console.error("Advice generation error:", error);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Financial Insights</h1>
          </div>
          {isPremium ? (
            <div className="flex items-center space-x-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-100">
              <Crown className="w-3 h-3" />
              <span>PREMIUM</span>
            </div>
          ) : (
            <button 
              onClick={onUpgrade}
              className="flex items-center space-x-1 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200 hover:bg-gray-200 transition-colors"
            >
              <Lock className="w-3 h-3" />
              <span>FREE PLAN</span>
            </button>
          )}
        </div>
        <p className="mt-2 text-gray-600">Smart analysis of your financial future based on current data.</p>
      </div>

      {!isPremium && (
        <div className="mb-8 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2 flex items-center">
              <Crown className="w-5 h-5 mr-2 text-amber-400" />
              Upgrade to WealthOS Premium
            </h3>
            <p className="text-indigo-100 text-sm max-w-md mb-4">
              Unlock 10-year projections, unlimited scenarios, and advanced financial recommendations to accelerate your wealth building.
            </p>
            <button 
              onClick={onUpgrade}
              className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-all flex items-center group"
            >
              Upgrade Now
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl"></div>
        </div>
      )}

      {advice ? (
        <div className="space-y-8">
          {/* SECTION 1 — BEST DECISION */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-[#4F46E5] px-8 py-5">
              <h2 className="text-white font-bold flex items-center text-lg">
                <CheckCircle2 className="w-6 h-6 mr-3" />
                Recommended Strategy
              </h2>
            </div>
            <div className="p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Best Scenario</p>
                  <p className="text-3xl font-bold text-gray-900">{advice.bestScenario}</p>
                </div>
                <div className="bg-green-50 px-6 py-4 rounded-xl border border-green-100">
                  <p className="text-xs text-[#16A34A] uppercase tracking-wider font-bold mb-1">Potential Improvement</p>
                  <p className="text-2xl font-bold text-[#16A34A]">
                    +{formatCurrency(advice.improvement)}
                  </p>
                  <p className="text-xs text-green-600/70 mt-1">over {simulationYears} years</p>
                </div>
              </div>
              <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-gray-700 leading-relaxed text-lg">
                  Based on our simulation, switching to the <span className="font-bold text-[#4F46E5]">{advice.bestScenario}</span> strategy 
                  could increase your projected net worth by <span className="font-bold text-[#16A34A]">{formatCurrency(advice.improvement)}</span> compared 
                  to your current path.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2 — RECOMMENDATIONS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Lightbulb className="w-6 h-6 mr-3 text-yellow-500" />
              Actionable Recommendations
            </h2>
            <ul className="space-y-4">
              {advice.recommendations.length > 0 ? (
                advice.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start p-4 bg-indigo-50/50 rounded-xl text-indigo-900 text-base border border-indigo-50">
                    <div className="w-2 h-2 bg-[#4F46E5] rounded-full mt-2 mr-4 flex-shrink-0" />
                    {rec}
                  </li>
                ))
              ) : (
                <li className="text-gray-500 italic">No specific recommendations at this time.</li>
              )}
              {!isPremium && (
                <button 
                  onClick={onUpgrade}
                  className="w-full flex items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm italic hover:bg-gray-50 transition-colors"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Upgrade to unlock advanced recommendations
                </button>
              )}
            </ul>
          </div>

          {/* SECTION 3 — WARNINGS */}
          {advice.warnings.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-red-50 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-3 text-[#DC2626]" />
                Financial Warnings
              </h2>
              <ul className="space-y-4">
                {advice.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start p-4 bg-red-50 rounded-xl text-[#DC2626] text-base border border-red-100">
                    <div className="w-2 h-2 bg-[#DC2626] rounded-full mt-2 mr-4 flex-shrink-0" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="mx-auto w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <TrendingUp className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Insufficient Data</h2>
          <p className="text-gray-500 max-w-sm mx-auto text-lg">
            Add more transactions, assets, and liabilities to generate personalized financial insights and simulations.
          </p>
          <Link 
            to="/transactions" 
            className="mt-8 inline-block bg-[#4F46E5] text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Add Data
          </Link>
        </div>
      )}

      <div className="mt-10 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">
          WealthOS Decision Engine v1.0 • Deterministic Analysis
        </p>
      </div>
    </div>
  );
};

export default Insights;
