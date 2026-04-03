import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Transaction, Asset, Liability, Loan, FinancialSnapshot, PortfolioAsset } from '../types';
import { 
  calculateMonthlyIncome, 
  calculateMonthlyExpenses, 
  calculateNetWorth,
  calculate10YearProjection,
  calculateFinancialImpact
} from '../lib/financialEngine';
import { compareScenarios } from '../lib/scenarioEngine';
import { generateFinancialAdvice, FinancialAdvice } from '../lib/decisionEngine';
import { getSmartFinancialAnalysis, SmartFinancialAnalysis, isSmartFinancialAnalysis } from '../services/geminiService';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { handleUpgrade } from '../lib/paymentService';
import { formatCurrency, formatCurrencyShort } from '../lib/formatCurrency';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { saveSmartAnalysis, getSmartAnalysis } from '../services/snapshotService';
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
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Target,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Insights: React.FC = () => {
  const { user, userProfile, isPremium } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [usingSnapshot, setUsingSnapshot] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadedCollections, setLoadedCollections] = useState<Set<string>>(new Set());
  const [smartAnalysis, setSmartAnalysis] = useState<SmartFinancialAnalysis | null>(null);
  const [generatingSmart, setGeneratingSmart] = useState(false);
  const [smartError, setSmartError] = useState<string | null>(null);
  const [isLowConfidence, setIsLowConfidence] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

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
    const loansPath = `users/${user.uid}/loans`;
    const portfolioPath = `users/${user.uid}/portfolio`;

    const markLoaded = (name: string) => {
      setLoadedCollections(prev => {
        const next = new Set(prev);
        next.add(name);
        return next;
      });
    };

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
          markLoaded('snapshot');
        }
      },
      (err) => {
        console.warn("Snapshot fetch failed, falling back to full queries:", err);
        setUsingSnapshot(false);
        markLoaded('snapshot');
      }
    );

    // 2. Fallback/Detail Layer: Listen to raw collections
    const unsubTransactions = onSnapshot(
      query(collection(db, transactionsPath), orderBy('timestamp', 'desc')),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
        setTransactions(docs);
        markLoaded('transactions');
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, transactionsPath);
        markLoaded('transactions');
      }
    );

    const unsubAssets = onSnapshot(
      query(collection(db, assetsPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Asset[];
        setAssets(docs);
        markLoaded('assets');
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, assetsPath);
        markLoaded('assets');
      }
    );

    const unsubLiabilities = onSnapshot(
      query(collection(db, liabilitiesPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Liability[];
        setLiabilities(docs);
        markLoaded('liabilities');
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, liabilitiesPath);
        markLoaded('liabilities');
      }
    );

    const unsubLoans = onSnapshot(
      query(collection(db, loansPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Loan[];
        setLoans(docs);
        markLoaded('loans');
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, loansPath);
        markLoaded('loans');
      }
    );

    const unsubPortfolio = onSnapshot(
      query(collection(db, portfolioPath)),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PortfolioAsset[];
        setPortfolio(docs);
        markLoaded('portfolio');
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, portfolioPath);
        markLoaded('portfolio');
      }
    );

    // Fetch cached smart analysis
    getSmartAnalysis(user.uid).then(cached => {
      if (cached) {
        setSmartAnalysis(cached as SmartFinancialAnalysis);
      }
    });

    return () => {
      unsubSnapshot();
      unsubTransactions();
      unsubAssets();
      unsubLiabilities();
      unsubLoans();
      unsubPortfolio();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!usingSnapshot && loadedCollections.size >= 6) {
      setLoading(false);
    }
  }, [loadedCollections, usingSnapshot]);

  // Pipeline Execution with Snapshot Fallback
  const income = Number((usingSnapshot && snapshot) ? snapshot.income : calculateMonthlyIncome(transactions)) || 0;
  const expenses = Number((usingSnapshot && snapshot) ? snapshot.expenses : calculateMonthlyExpenses(transactions, loans)) || 0;
  
  const assetsTotal = assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  const portfolioTotal = portfolio.reduce((sum, p) => sum + (Number(p.currentValue) || 0), 0);
  const currentAssets = Number((usingSnapshot && snapshot) ? snapshot.assetsTotal : (assetsTotal + portfolioTotal)) || 0;
  
  const liabilitiesTotal = liabilities.reduce((sum, l) => sum + (Number(l.remainingBalance) || 0), 0);
  const loansTotal = loans.reduce((sum, l) => sum + (Number(l.remainingAmount) || 0), 0);
  const currentLiabilities = Number((usingSnapshot && snapshot) ? snapshot.liabilitiesTotal : (liabilitiesTotal + loansTotal)) || 0;

  // ALWAYS use 10-year projections for maximum impact
  const simulationYears = 10;

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

  const handleGenerateSmartAnalysis = async () => {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }

    // STEP 2 — LOADING LOCK
    if (generatingSmart) return;

    setGeneratingSmart(true);
    setSmartError(null);
    setIsLowConfidence(false);

    // STEP 1 — CREATE SINGLE SOURCE OF TRUTH
    const financialData = {
      income: Number(income) || 0,
      expenses: Number(expenses) || 0,
      assets: Number(currentAssets) || 0,
      liabilities: Number(currentLiabilities) || 0,
      transactions: transactions || []
    };

    // STEP 6 — MANDATORY DEBUG LOGGING
    console.log("FINANCIAL DATA PIPELINE CHECK:", financialData);

    // STEP 5 — REVISED VALIDATION LOGIC
    // Insights should be generated if ANY of the following are true:
    // income > 0 OR transactions exist OR assets > 0
    const hasAnyData = financialData.income > 0 || financialData.transactions.length > 0 || financialData.assets > 0;

    if (!hasAnyData) {
      setSmartError("Add more financial data to unlock insights");
      setGeneratingSmart(false);
      return;
    }

    // Ensure transactions are sorted by date descending for the AI
    const sortedTransactions = [...financialData.transactions].sort((a, b) => {
      const dateA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
      const dateB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
      return dateB - dateA;
    });

    try {
      const currentNetWorth = financialData.assets - financialData.liabilities;
      
      // PART 2 — BUILD DETERMINISTIC ENGINE
      // Use actual formulas for projections
      const projectedNetWorthBase = calculate10YearProjection(currentNetWorth, financialData.income - financialData.expenses, 0.08);
      const bestScenarioValue = scenarios.reduce((max, s) => s.value > max ? s.value : max, 0);
      const projectedNetWorthOptimized = Math.max(projectedNetWorthBase, bestScenarioValue);
      
      // PART 3 — FIX “IMPACT” CALCULATION
      // impact = (Projected Wealth with Strategy) - (Current Path Projection)
      const financialImpact = calculateFinancialImpact(projectedNetWorthBase, projectedNetWorthOptimized);

      const analysis = await getSmartFinancialAnalysis({
        income: financialData.income,
        expenses: financialData.expenses,
        assets: financialData.assets,
        liabilities: financialData.liabilities,
        transactions: sortedTransactions,
        userProfile,
        systemCalculations: {
          currentNetWorth,
          projectedNetWorthBase,
          projectedNetWorthOptimized,
          financialImpact,
          scenarios
        }
      });

      if (!isSmartFinancialAnalysis(analysis)) {
        // STEP 4 — FAIL SILENTLY (Show fallback UI)
        throw new Error("Analysis failed");
      }

      // VALIDATION: IF AI projected net worth deviates more than 30% from simulation
      const deviation = Math.abs(analysis.projectedNetWorth - projectedNetWorthBase) / (projectedNetWorthBase || 1);
      if (deviation > 0.3) {
        setIsLowConfidence(true);
      }

      setSmartAnalysis(analysis);
      
      // STEP 3 — CACHE LAST RESULT
      if (user?.uid) {
        await saveSmartAnalysis(user.uid, analysis);
      }
    } catch (err) {
      console.error("Smart analysis error:", err);
      
      // STEP 4 — FAIL SILENTLY: Show fallback UI instead of error text
      // PART 7 — UI FIX: Never show “Failed to generate analysis”
      const currentNetWorth = currentAssets - currentLiabilities;
      const projectedNetWorthBase = calculate10YearProjection(currentNetWorth, income - expenses, 0.08);
      
      const fallbackAnalysis: SmartFinancialAnalysis = {
        projectedNetWorth: projectedNetWorthBase,
        confidenceScore: 70,
        keyInsights: [
          "Based on your current cashflow, your wealth is projected to grow steadily.",
          "Maintaining a positive net worth is critical for long-term stability.",
          "Consider reducing high-interest liabilities to accelerate growth."
        ],
        strategicPlan: {
          shortTerm: ["Track all daily expenses", "Build an emergency fund", "Review loan interest rates"],
          longTerm: ["Increase monthly investment amount", "Diversify asset portfolio", "Aim for debt-free status"]
        },
        riskAssessment: "Moderate risk due to current expense-to-income ratio. Inflation may impact long-term purchasing power.",
        futureScenarios: {
          optimistic: "With disciplined savings and 8% annual returns, you could significantly exceed your base projection.",
          conservative: "Economic downturns or unexpected expenses could slow your progress by 15-20%."
        }
      };
      
      setSmartAnalysis(fallbackAnalysis);
      // We don't set setSmartError here to "fail silently" with a fallback UI
    } finally {
      setGeneratingSmart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BrainCircuit className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Financial Insights</h1>
          </div>
        </div>
        <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600">Smart analysis of your financial future based on current data.</p>
      </div>

      {!isPremium && (
        <div className="mb-8 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2 flex items-center">
              <Crown className="w-5 h-5 mr-2 text-amber-400" />
              Upgrade to WealthOS Premium
            </h3>
            <p className="text-indigo-100 text-sm max-w-md mb-4">
              Unlock deep AI-powered strategic insights, unlimited financial scenarios, and personalized wealth-building recommendations.
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
          {/* SECTION 1 — BEST DECISION (SYSTEM PRIMARY) */}
          {advice.improvement >= 1000 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-[#4F46E5] px-6 md:px-8 py-4 md:py-5">
                <h2 className="text-white font-bold flex items-center text-base md:text-lg">
                  <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 mr-3" />
                  Recommended Strategy
                </h2>
              </div>
              <div className="p-5 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 uppercase tracking-wider font-bold mb-2 md:mb-4">Best Scenario</p>
                    <p className="text-2xl md:text-4xl font-black text-gray-900 tracking-tighter">{advice.bestScenario}</p>
                  </div>
                  <div className="bg-green-50 px-6 md:px-8 py-4 md:py-6 rounded-2xl border-2 border-green-200 shadow-sm">
                    <p className="text-xs md:text-sm text-[#16A34A] uppercase tracking-widest font-black mb-2 md:mb-4">1-Year Impact</p>
                    <div className="text-3xl md:text-5xl font-black text-[#16A34A] tracking-tighter">
                      <CurrencyDisplay value={advice.improvement} />
                    </div>
                    <p className="text-[10px] md:text-sm font-bold text-green-600/80 mt-1 md:mt-2 italic">difference over 1 year</p>
                  </div>
                </div>
                <div className="mt-6 md:mt-8 p-5 md:p-8 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                  <p className="text-gray-800 leading-relaxed text-lg md:text-xl">
                    By switching to the <span className="font-black text-[#4F46E5] underline decoration-indigo-200 underline-offset-4">{advice.bestScenario}</span> strategy, 
                    you could see a massive <span className="font-black text-[#16A34A] text-xl md:text-2xl"><CurrencyDisplay value={advice.improvement} /> improvement</span> in your 
                    total wealth over the next year.
                  </p>
                </div>

                {/* AI STRATEGIC HIGHLIGHT */}
                {smartAnalysis && (
                  <div className="mt-6 p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center mb-3">
                      <Sparkles className="w-5 h-5 text-[#4F46E5] mr-2" />
                      <span className="text-sm font-bold text-[#4F46E5] uppercase tracking-widest">AI Strategic Insight</span>
                    </div>
                    <p className="text-indigo-900 font-medium leading-relaxed">
                      {smartAnalysis.keyInsights[0]}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500 font-medium">Increase activity to unlock meaningful insights</p>
            </div>
          )}

          {/* SMART ANALYSIS SECTION (AI SECONDARY) */}
          <div className="mb-10">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <Sparkles className="w-6 h-6 mr-3 text-indigo-600" />
                      Smart Financial Analysis
                    </h2>
                    <p className="text-gray-500 mt-1">AI-powered deep dive into your financial future.</p>
                  </div>
                  {!smartAnalysis && (
                    <button
                      onClick={handleGenerateSmartAnalysis}
                      disabled={generatingSmart}
                      className={`flex items-center px-6 py-3 rounded-xl font-bold transition-all shadow-md ${
                        generatingSmart 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-[#4F46E5] text-white hover:bg-indigo-700 active:scale-95'
                      }`}
                    >
                      {generatingSmart ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Analyzing your financial data...
                        </>
                      ) : (
                        <>
                          <BrainCircuit className="w-5 h-5 mr-2" />
                          Generate Smart Analysis
                        </>
                      )}
                    </button>
                  )}
                </div>

                {smartError && (
                  <div className={`mb-6 p-4 rounded-xl flex items-center ${
                    smartError === "Add more financial data to unlock insights"
                      ? "bg-amber-50 border border-amber-100 text-amber-700"
                      : "bg-gray-50 border border-gray-100 text-gray-500"
                  }`}>
                    {smartError === "Add more financial data to unlock insights" ? (
                      <AlertTriangle className="w-5 h-5 mr-3" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 mr-3 text-gray-400" />
                    )}
                    <span className="text-sm font-medium">{smartError}</span>
                  </div>
                )}

                {showPaywall && !isPremium && (
                  <div className="mb-8 animate-in zoom-in-95 duration-300">
                    <div className="bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-100 rounded-2xl p-5 md:p-8 shadow-xl relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                          <div className="p-2 md:p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white" />
                          </div>
                          <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest flex items-center">
                            <Crown className="w-3 h-3 mr-1" />
                            PREMIUM ONLY
                          </div>
                        </div>
                        
                        <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-1">Unlock Your Financial Future</h3>
                        <p className="text-gray-600 mb-4 md:mb-8 text-sm md:text-base leading-tight">
                          See your 1-year financial growth with AI
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
                          <div className="p-3 md:p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 mb-1 md:mb-2" />
                            <p className="text-[10px] md:text-xs font-bold text-gray-900">10-Year Projection</p>
                            <p className="text-[9px] md:text-[10px] text-gray-500 mt-0.5 leading-tight">See exactly where you'll be in a decade.</p>
                          </div>
                          <div className="p-3 md:p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <BrainCircuit className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 mb-1 md:mb-2" />
                            <p className="text-[10px] md:text-xs font-bold text-gray-900">AI Insights</p>
                            <p className="text-[9px] md:text-[10px] text-gray-500 mt-0.5 leading-tight">Strategic advice tailored to your habits.</p>
                          </div>
                          <div className="p-3 md:p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 mb-1 md:mb-2" />
                            <p className="text-[10px] md:text-xs font-bold text-gray-900">Risk Analysis</p>
                            <p className="text-[9px] md:text-[10px] text-gray-500 mt-0.5 leading-tight">Identify and fix financial blindspots.</p>
                          </div>
                        </div>

                        <div className="bg-indigo-600 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                          <div className="text-center md:text-left">
                            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-1">Limited Time Offer</p>
                            <p className="text-xl md:text-2xl font-black mb-3 md:mb-4">Unlock Your Financial Plan</p>
                            <ul className="space-y-1.5 md:space-y-2 mb-4">
                              <li className="flex items-center text-xs md:text-sm font-bold text-indigo-100">
                                <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2 text-white" />
                                Close loans faster
                              </li>
                              <li className="flex items-center text-xs md:text-sm font-bold text-indigo-100">
                                <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2 text-white" />
                                Increase net worth
                              </li>
                              <li className="flex items-center text-xs md:text-sm font-bold text-indigo-100">
                                <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2 text-white" />
                                Reduce unnecessary expenses
                              </li>
                            </ul>
                            <div className="text-indigo-200 text-[10px] font-bold"><CurrencyDisplay value={299} />/month • Start improving today</div>
                          </div>
                          <div className="w-full md:w-auto text-center">
                            <button 
                              onClick={onUpgrade}
                              className="w-full md:w-auto bg-white text-indigo-600 px-8 py-4 md:px-10 md:py-5 rounded-xl font-black text-sm md:text-base hover:scale-105 transition-transform shadow-2xl flex items-center justify-center"
                            >
                              Generate Insights
                              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                            </button>
                            <p className="mt-2 text-[10px] text-indigo-200 font-medium">Based on your real financial data</p>
                          </div>
                        </div>

                        <div className="mt-6 flex items-center justify-center space-x-2 text-indigo-600/60">
                          <Sparkles className="w-4 h-4" />
                          <p className="text-xs font-bold italic">
                            Most users improve savings by 15–25%
                          </p>
                        </div>
                      </div>
                      
                      {/* Decorative Elements */}
                      <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-50"></div>
                      <div className="absolute -top-12 -left-12 w-48 h-48 bg-violet-100 rounded-full blur-3xl opacity-50"></div>
                    </div>

                    {/* BLURRED PREVIEW */}
                    <div className="mt-8 relative opacity-40 select-none pointer-events-none grayscale blur-[2px]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="bg-gray-100 h-32 rounded-xl"></div>
                        <div className="bg-gray-100 h-32 rounded-xl"></div>
                      </div>
                      <div className="bg-gray-100 h-48 rounded-xl mb-8"></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-gray-100 h-40 rounded-xl"></div>
                        <div className="bg-gray-100 h-40 rounded-xl"></div>
                      </div>
                    </div>
                  </div>
                )}

                {smartAnalysis ? (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* 10-YEAR PROJECTION */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                      <div className="bg-indigo-50/50 p-6 md:p-8 rounded-xl border border-indigo-100 relative">
                        {isLowConfidence && (
                          <div className="absolute top-4 right-4 flex items-center bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold border border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            LOW CONFIDENCE
                          </div>
                        )}
                        <p className="text-xs md:text-sm text-indigo-600 uppercase tracking-wider font-bold mb-3 md:mb-4">10-Year Projected Net Worth</p>
                        <div className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">
                          <CurrencyDisplay value={smartAnalysis.projectedNetWorth} />
                        </div>
                        <div className="mt-4 md:mt-6 flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2 mr-4">
                            <div 
                              className="bg-[#4F46E5] h-full rounded-full" 
                              style={{ width: `${smartAnalysis.confidenceScore}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] md:text-xs font-bold text-indigo-600 whitespace-nowrap">
                            {smartAnalysis.confidenceScore}% Confidence
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-amber-50/50 p-6 md:p-8 rounded-xl border border-amber-100">
                        <h3 className="text-xs md:text-sm text-amber-700 uppercase tracking-wider font-bold mb-3 md:mb-4 flex items-center">
                          <ShieldAlert className="w-4 h-4 mr-2" />
                          Risk Assessment
                        </h3>
                        <p className="text-sm md:text-base text-gray-700 leading-relaxed italic">
                          "{smartAnalysis.riskAssessment}"
                        </p>
                      </div>
                    </div>

                    {/* KEY INSIGHTS */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                        <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                        Key Strategic Insights
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {smartAnalysis.keyInsights.map((insight, idx) => (
                          <div key={idx} className="p-4 bg-white border border-gray-100 rounded-xl flex items-start shadow-sm">
                            <div className="w-2 h-2 bg-[#4F46E5] rounded-full mt-2 mr-4 flex-shrink-0" />
                            <p className="text-gray-700 text-sm leading-relaxed">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* STRATEGIC PLAN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                          <Target className="w-5 h-5 mr-2 text-indigo-600" />
                          Short-Term Plan (6-12m)
                        </h3>
                        <div className="space-y-3">
                          {smartAnalysis.strategicPlan.shortTerm.map((step, idx) => (
                            <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100">
                              <ArrowRight className="w-4 h-4 mr-3 text-indigo-400" />
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                          <TrendingUp className="w-5 h-5 mr-2 text-[#16A34A]" />
                          Long-Term Strategy (5-10y)
                        </h3>
                        <div className="space-y-3">
                          {smartAnalysis.strategicPlan.longTerm.map((step, idx) => (
                            <div key={idx} className="flex items-center p-3 bg-green-50/50 rounded-lg text-sm text-gray-700 border border-green-100">
                              <ArrowRight className="w-4 h-4 mr-3 text-green-400" />
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* FUTURE SCENARIOS */}
                    <div className="pt-6 border-t border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h4 className="text-xs font-bold text-[#16A34A] uppercase tracking-widest mb-2">Optimistic Future</h4>
                          <p className="text-sm text-gray-600 leading-relaxed italic">
                            {smartAnalysis.futureScenarios.optimistic}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Conservative Future</h4>
                          <p className="text-sm text-gray-600 leading-relaxed italic">
                            {smartAnalysis.futureScenarios.conservative}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* DISCLAIMER */}
                    <div className="pt-6 border-t border-gray-100 text-center">
                      <p className="text-xs text-gray-400 italic">
                        AI insights are advisory and based on current assumptions. Always consult with a professional financial advisor.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <BrainCircuit className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 max-w-xs mx-auto">
                      {isPremium 
                        ? "Ready to see your financial future? Click the button above to generate your smart analysis." 
                        : "Unlock Your Financial Plan to access AI-powered smart analysis of your financial future."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2 — RECOMMENDATIONS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center">
              <Lightbulb className="w-5 h-5 md:w-6 md:h-6 mr-3 text-yellow-500" />
              Actionable Recommendations
            </h2>
            <ul className="space-y-4">
              {/* AI INSIGHTS (IF AVAILABLE) */}
              {smartAnalysis && smartAnalysis.keyInsights.map((insight, index) => (
                <li key={`ai-${index}`} className="flex items-start p-4 bg-indigo-50/50 rounded-xl text-indigo-900 text-base border border-indigo-100 shadow-sm">
                  <div className="flex items-center justify-center w-6 h-6 bg-indigo-100 rounded-full mr-4 flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-[#4F46E5]" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-1">AI Insight</span>
                    {insight}
                  </div>
                </li>
              ))}

              {/* DETERMINISTIC RECOMMENDATIONS */}
              {advice.recommendations.length > 0 ? (
                advice.recommendations.map((rec, index) => (
                  <li key={`det-${index}`} className="flex items-start p-4 bg-gray-50 rounded-xl text-gray-700 text-base border border-gray-100">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-4 flex-shrink-0" />
                    {rec}
                  </li>
                ))
              ) : (
                !smartAnalysis && <li className="text-gray-500 italic">No specific recommendations at this time.</li>
              )}
              {!isPremium && (
                  <button 
                    onClick={onUpgrade}
                    className="w-full flex items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm italic hover:bg-gray-50 transition-colors"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Unlock Your Financial Plan for advanced recommendations
                  </button>
              )}
            </ul>
          </div>

          {/* SECTION 3 — WARNINGS */}
          {advice.warnings.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-red-50 p-6 md:p-8">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center">
                <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 mr-3 text-[#DC2626]" />
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
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Add more data to unlock insights</h2>
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
