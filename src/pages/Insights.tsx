import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Transaction, Asset, Liability } from '../services/financeService';
import { 
  calculateMonthlyIncome, 
  calculateMonthlyExpenses, 
  calculateNetWorth 
} from '../lib/financialEngine';
import { compareScenarios } from '../lib/scenarioEngine';
import { generateFinancialAdvice, FinancialAdvice } from '../lib/decisionEngine';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  ArrowLeft,
  Loader2,
  BrainCircuit
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Insights: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const transactionsPath = `users/${user.uid}/transactions`;
    const assetsPath = `users/${user.uid}/assets`;
    const liabilitiesPath = `users/${user.uid}/liabilities`;

    // Listen to Transactions
    const unsubTransactions = onSnapshot(
      query(collection(db, transactionsPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
        setTransactions(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, transactionsPath)
    );

    // Listen to Assets
    const unsubAssets = onSnapshot(
      query(collection(db, assetsPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Asset[];
        setAssets(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, assetsPath)
    );

    // Listen to Liabilities
    const unsubLiabilities = onSnapshot(
      query(collection(db, liabilitiesPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Liability[];
        setLiabilities(docs);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, liabilitiesPath);
        setLoading(false);
      }
    );

    return () => {
      unsubTransactions();
      unsubAssets();
      unsubLiabilities();
    };
  }, [user?.uid]);

  // Pipeline Execution
  const income = calculateMonthlyIncome(transactions);
  const expenses = calculateMonthlyExpenses(transactions);
  const currentAssets = assets.reduce((sum, a) => sum + (a.value || 0), 0);
  const currentLiabilities = liabilities.reduce((sum, l) => sum + (l.remainingBalance || 0), 0);

  // Run Scenario Comparison (10 years default)
  const scenarios = compareScenarios({
    income,
    expenses,
    assets: currentAssets,
    liabilities: currentLiabilities,
    years: 10
  });

  // Run Decision Engine
  let advice: FinancialAdvice | null = null;
  try {
    advice = generateFinancialAdvice({
      scenarios,
      income,
      expenses,
      liabilities: currentLiabilities
    });
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
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link to="/" className="text-indigo-600 hover:text-indigo-500 flex items-center text-sm font-medium mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Profile
        </Link>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BrainCircuit className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Financial Insights</h1>
        </div>
        <p className="mt-2 text-gray-600">Smart analysis of your financial future based on current data.</p>
      </div>

      {advice ? (
        <div className="space-y-6">
          {/* SECTION 1 — BEST DECISION */}
          <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
            <div className="bg-indigo-600 px-6 py-4">
              <h2 className="text-white font-semibold flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Recommended Strategy
              </h2>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">Best Scenario</p>
                  <p className="text-2xl font-bold text-gray-900">{advice.bestScenario}</p>
                </div>
                <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 uppercase tracking-wider font-bold">Potential Improvement</p>
                  <p className="text-xl font-bold text-green-700">
                    +₹{advice.improvement.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-green-600">over 10 years</p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-gray-700 leading-relaxed">
                  Based on our simulation, switching to the <span className="font-bold text-indigo-600">{advice.bestScenario}</span> strategy 
                  could increase your projected net worth by <span className="font-bold text-green-600">₹{advice.improvement.toLocaleString()}</span> compared 
                  to your current path.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2 — RECOMMENDATIONS */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
              Actionable Recommendations
            </h2>
            <ul className="space-y-3">
              {advice.recommendations.length > 0 ? (
                advice.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start p-3 bg-blue-50 rounded-xl text-blue-800 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                    {rec}
                  </li>
                ))
              ) : (
                <li className="text-gray-500 italic text-sm">No specific recommendations at this time.</li>
              )}
            </ul>
          </div>

          {/* SECTION 3 — WARNINGS */}
          {advice.warnings.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-red-50 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                Financial Warnings
              </h2>
              <ul className="space-y-3">
                {advice.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start p-3 bg-red-50 rounded-xl text-red-800 text-sm">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Insufficient Data</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            Add more transactions, assets, and liabilities to generate personalized financial insights and simulations.
          </p>
          <Link 
            to="/transactions" 
            className="mt-6 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
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
