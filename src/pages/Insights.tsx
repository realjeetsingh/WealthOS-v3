import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, orderBy, getDocs, getDoc } from 'firebase/firestore';
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
import { 
  getMonthlyStatus, 
  getMonthlyTrend, 
  getProgressSignal,
  getUpgradedInsights
} from '../lib/retentionEngine';
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
  ArrowRight,
  PlusCircle,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import AIAssistantButton from '../components/AIAssistantButton';

const Insights: React.FC = () => {
  const { user, userProfile, isPremium } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
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
          setLoading(false);
        } else {
          markLoaded('snapshot');
        }
      },
      (err) => {
        console.warn("Snapshot fetch failed, falling back to full queries:", err);
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
    if (loadedCollections.size >= 6) {
      setLoading(false);
    }
  }, [loadedCollections]);

  // Pipeline Execution with Snapshot Fallback
  const income = calculateMonthlyIncome(transactions) || 0;
  const expenses = calculateMonthlyExpenses(transactions, loans) || 0;
  
  const assetsTotal = assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  const portfolioTotal = portfolio.reduce((sum, p) => sum + (Number(p.currentValue) || 0), 0);
  const currentAssets = (assetsTotal + portfolioTotal) || 0;
  
  const liabilitiesTotal = liabilities.reduce((sum, l) => sum + (Number(l.remainingBalance) || 0), 0);
  const loansTotal = loans.reduce((sum, l) => sum + (Number(l.remainingAmount) || 0), 0);
  const currentLiabilities = (liabilitiesTotal + loansTotal) || 0;

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

  const userCurrency = userProfile?.currency || 'INR';
  const upgradedInsights = getUpgradedInsights(income, expenses, transactions);

  const handleGenerateSmartAnalysis = async (): Promise<SmartFinancialAnalysis | null> => {
    if (!isPremium) {
      setShowPaywall(true);
      return null;
    }

    // STEP 2 — LOADING LOCK
    if (generatingSmart) return null;

    setGeneratingSmart(true);
    setSmartError(null);
    setIsLowConfidence(false);

    if (!user?.uid) return null;

    try {
      // STEP 5 — REVISED FETCH LOGIC: Use getDocs for fresh point-in-time data
      const transactionsPath = `users/${user.uid}/transactions`;
      const assetsPath = `users/${user.uid}/assets`;
      const liabilitiesPath = `users/${user.uid}/liabilities`;
      const loansPath = `users/${user.uid}/loans`;
      const portfolioPath = `users/${user.uid}/portfolio`;

      const [tSnap, aSnap, lSnap, loSnap, pSnap] = await Promise.all([
        getDocs(query(collection(db, transactionsPath), orderBy('timestamp', 'desc'))),
        getDocs(collection(db, assetsPath)),
        getDocs(collection(db, liabilitiesPath)),
        getDocs(collection(db, loansPath)),
        getDocs(collection(db, portfolioPath))
      ]);

      const freshTransactions = tSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[];
      const freshAssets = aSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Asset[];
      const freshLiabilities = lSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Liability[];
      const freshLoans = loSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Loan[];
      const freshPortfolio = pSnap.docs.map(d => ({ id: d.id, ...d.data() })) as PortfolioAsset[];

      // Recalculate deterministic values with fresh data
      const freshIncome = calculateMonthlyIncome(freshTransactions) || 0;
      const freshExpenses = calculateMonthlyExpenses(freshTransactions, freshLoans) || 0;
      const freshAssetsTotal = freshAssets.reduce((sum, a) => sum + (Number(a.value) || 0), 0) + 
                               freshPortfolio.reduce((sum, p) => sum + (Number(p.currentValue) || 0), 0);
      const freshLiabilitiesTotal = freshLiabilities.reduce((sum, l) => sum + (Number(l.remainingBalance) || 0), 0) + 
                                    freshLoans.reduce((sum, l) => sum + (Number(l.remainingAmount) || 0), 0);
      const freshNetWorth = freshAssetsTotal - freshLiabilitiesTotal;

      // STEP 1 — CREATE SINGLE SOURCE OF TRUTH
      const financialData = {
        income: freshIncome,
        expenses: freshExpenses,
        assets: freshAssetsTotal,
        liabilities: freshLiabilitiesTotal,
        transactions: freshTransactions
      };

      // STEP 6 — MANDATORY DEBUG LOGGING
      console.log("FINANCIAL DATA PIPELINE CHECK (FRESH):", financialData);

      const hasAnyData = financialData.income > 0 || financialData.transactions.length > 0 || financialData.assets > 0;

      if (!hasAnyData) {
        setSmartError("Add more financial data to unlock insights");
        setGeneratingSmart(false);
        return null;
      }

      // Ensure transactions are sorted by date descending for the AI
      const sortedTransactions = [...financialData.transactions].sort((a, b) => {
        const dateA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const dateB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return dateB - dateA;
      });

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
      return analysis;
    } catch (err) {
      console.error("Smart analysis error:", err);
      
      // STEP 4 — FAIL SILENTLY: Show fallback UI instead of error text
      // PART 7 — UI FIX: Never show “Failed to generate analysis”
      const currentNetWorth = currentAssets - currentLiabilities;
      const projectedNetWorthBase = calculate10YearProjection(currentNetWorth, income - expenses, 0.08);
      
      const fallbackAnalysis: SmartFinancialAnalysis = {
        projectedNetWorth: projectedNetWorthBase,
        confidenceScore: 70,
        confidenceReason: "Moderate score due to lack of complete transaction history.",
        keyInsights: [
          {
            type: "risk",
            problem: "High expense-to-income ratio (₹43K > ₹40K)",
            impact: "This limits your ability to save and invest, leading to potential debt.",
            fix: "Review non-essential subscriptions and daily small spends.",
            action: { label: "Fix this now", path: "/budgets" }
          },
          {
            type: "warning",
            problem: "Lack of emergency fund (₹0 saved)",
            impact: "Unexpected expenses could force you into high-interest debt.",
            fix: "Aim to save 3 months of basic expenses in a liquid account.",
            action: { label: "Fix this now", path: "/goals" }
          },
          {
            type: "optimization",
            problem: "Low investment diversification",
            impact: "Your wealth is concentrated, increasing market risk.",
            fix: "Explore index funds or SIPs to spread risk.",
            action: { label: "Fix this now", path: "/portfolio" }
          }
        ],
        strategicPlan: {
          shortTerm: ["Track all daily expenses", "Build an emergency fund", "Review loan interest rates"],
          longTerm: ["Increase monthly investment amount", "Diversify asset portfolio", "Aim for debt-free status"]
        },
        riskAssessment: "Moderate risk due to current expense-to-income ratio. Inflation may impact long-term purchasing power.",
        futureScenarios: {
          optimistic: "With disciplined savings and 8% annual returns, you could significantly exceed your base projection.",
          conservative: "Economic downturns or unexpected expenses could slow your progress by 15-20%."
        },
        suggestedModule: {
          name: "Budgets",
          path: "/budgets",
          label: "Manage Budgets"
        }
      };
      
      setSmartAnalysis(fallbackAnalysis);
      return fallbackAnalysis;
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
    <div className="max-w-4xl mx-auto w-full overflow-x-hidden max-w-full">
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
            <Button 
              onClick={onUpgrade}
              variant="secondary"
              size="sm"
              icon={<ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />}
            >
              Upgrade Now
            </Button>
          </div>
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl"></div>
        </div>
      )}

      {/* Upgraded Actionable Insights */}
      {upgradedInsights.length > 0 && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {upgradedInsights.map((insight, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col min-h-[160px]">
              <div className="flex items-start gap-4 mb-3">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-gray-900 truncate">{insight.title}</h4>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{insight.description}</p>
                </div>
              </div>
              <div className="mt-auto">
                <div className="inline-flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full truncate max-w-full">
                  Action: {insight.action}
                </div>
              </div>
            </div>
          ))}
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
                {smartAnalysis && smartAnalysis.keyInsights.length > 0 && (
                  <div className="mt-6 p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center mb-3">
                      <Sparkles className="w-5 h-5 text-[#4F46E5] mr-2" />
                      <span className="text-sm font-bold text-[#4F46E5] uppercase tracking-widest">AI Strategic Insight</span>
                    </div>
                    <p className="text-indigo-900 font-medium leading-relaxed">
                      {smartAnalysis.keyInsights[0].problem} — {smartAnalysis.keyInsights[0].fix}
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

          {/* SECTION 2 — RECOMMENDATIONS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center">
              <Lightbulb className="w-5 h-5 md:w-6 md:h-6 mr-3 text-yellow-500" />
              Actionable Recommendations
            </h2>
            <ul className="space-y-4">
              {/* AI INSIGHTS (IF AVAILABLE) */}
              {smartAnalysis && smartAnalysis.keyInsights.map((insight, index) => {
                // Guard against legacy string insights or malformed data
                if (typeof insight === 'string' || !insight?.action) return null;
                
                return (
                  <li key={`ai-${index}`} className="flex items-start p-4 bg-indigo-50/50 rounded-xl text-indigo-900 text-base border border-indigo-100 shadow-sm">
                    <div className="flex items-center justify-center w-6 h-6 bg-indigo-100 rounded-full mr-4 flex-shrink-0">
                      <Sparkles className="w-3 h-3 text-[#4F46E5]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">AI {insight.type}</span>
                        <Link 
                          to={insight.action.path}
                          className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                        >
                          {insight.action.label} →
                        </Link>
                      </div>
                      <p className="font-bold text-sm mb-1">{insight.problem}</p>
                      <p className="text-xs text-gray-600">{insight.fix}</p>
                    </div>
                  </li>
                );
              })}

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
                    Upgrade to unlock AI-powered strategic insights
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
        <div className="bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-100 p-16 text-center flex flex-col items-center justify-center space-y-6">
          <div className="p-6 bg-gray-50 rounded-full">
            <TrendingUp className="w-12 h-12 text-gray-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unlock Your Financial Future</h2>
            <p className="text-gray-500 max-w-sm mx-auto text-lg leading-relaxed">
              Add more transactions, assets, and liabilities to generate personalized financial insights and simulations.
            </p>
          </div>
          <Link to="/transactions">
            <Button
              variant="primary"
              size="lg"
              icon={<PlusCircle className="w-5 h-5" />}
            >
              Add your first transaction
            </Button>
          </Link>
        </div>
      )}

      {/* FLOATING AI ASSISTANT BUTTON */}
      <AIAssistantButton 
        onGenerate={handleGenerateSmartAnalysis}
        isPremium={isPremium}
        onUpgrade={onUpgrade}
        currency={userCurrency}
      />

      <div className="mt-10 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">
          WealthOS Decision Engine v1.0 • Deterministic Analysis
        </p>
      </div>
    </div>
  );
};

export default Insights;
