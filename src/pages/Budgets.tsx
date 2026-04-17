import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Budget, Transaction } from '../types';
import { addBudget, updateBudget, deleteBudget } from '../services/financeService';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { formatCurrency } from '../lib/formatCurrency';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { 
  Target, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  Edit2,
  Trash2,
  PieChart,
  ArrowUpRight,
  Zap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORY_SUGGESTIONS = [
  'Food', 'Rent', 'Shopping', 'Transport', 'Entertainment', 
  'Health', 'Utilities', 'Insurance', 'Savings', 'Other'
];

const Budgets: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const budgetsPath = `users/${user.uid}/budgets`;
    const transactionsPath = `users/${user.uid}/transactions`;

    const unsubBudgets = onSnapshot(
      query(collection(db, budgetsPath), orderBy('timestamp', 'desc')),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Budget[];
        setBudgets(docs);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, budgetsPath)
    );

    const unsubTransactions = onSnapshot(
      query(collection(db, transactionsPath), orderBy('timestamp', 'desc')),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
        setTransactions(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, transactionsPath)
    );

    return () => {
      unsubBudgets();
      unsubTransactions();
    };
  }, [user?.uid]);

  // Financial Calculations
  const currentMonthData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthTransactions = transactions.filter(t => {
      const date = t.timestamp?.toDate();
      return date >= startOfMonth;
    });

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expensesByCategory = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const totalSpent = Object.values(expensesByCategory).reduce((sum: number, amt: number) => sum + amt, 0);

    return { income, expensesByCategory, totalSpent };
  }, [transactions]);

  const budgetStats = useMemo(() => {
    const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
    
    const categoryStats = budgets.map(budget => {
      const spent = currentMonthData.expensesByCategory[budget.category] || 0;
      const remaining = budget.limit - spent;
      const progress = (spent / budget.limit) * 100;
      
      let statusColor = 'bg-green-500';
      if (progress > 90) statusColor = 'bg-red-500';
      else if (progress > 70) statusColor = 'bg-yellow-500';

      return { ...budget, spent, remaining, progress, statusColor };
    });

    const totalSpentInBudgets = categoryStats.reduce((sum, b) => sum + b.spent, 0);
    const overallProgress = totalBudgetLimit > 0 ? (totalSpentInBudgets / totalBudgetLimit) * 100 : 0;
    
    let overallColor = 'bg-green-500';
    if (overallProgress > 90) overallColor = 'bg-red-500';
    else if (overallProgress > 70) overallColor = 'bg-yellow-500';

    return { totalBudgetLimit, categoryStats, totalSpentInBudgets, overallProgress, overallColor };
  }, [budgets, currentMonthData]);

  const insights = useMemo(() => {
    const list: string[] = [];
    
    budgetStats.categoryStats.forEach(b => {
      if (b.spent > b.limit) {
        list.push(`You are overspending in ${b.category} by ${formatCurrency(b.spent - b.limit)}`);
      }
    });

    if (currentMonthData.totalSpent > 0) {
      const potentialSavings = currentMonthData.totalSpent * 0.1; // Example: 10% reduction
      list.push(`Reducing expenses by ${formatCurrency(potentialSavings)}/month can save ${formatCurrency(potentialSavings * 12)}/year`);
    }

    if (budgetStats.overallProgress > 80 && budgetStats.overallProgress <= 100) {
      list.push("You've used over 80% of your total budget. Consider slowing down non-essential spending.");
    }

    return list;
  }, [budgetStats, currentMonthData]);

  const handleOpenModal = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget);
      setCategory(budget.category);
      setLimit(budget.limit.toString());
    } else {
      setEditingBudget(null);
      setCategory('');
      setLimit('');
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    const numLimit = parseFloat(limit);
    if (isNaN(numLimit) || numLimit <= 0) {
      setError("Please enter a valid budget limit");
      return;
    }

    if (!category.trim()) {
      setError("Category is required");
      return;
    }

    setSubmitting(true);
    try {
      if (editingBudget?.id) {
        await updateBudget(user.uid, editingBudget.id, {
          category: category.trim(),
          limit: numLimit
        });
      } else {
        await addBudget(user.uid, {
          category: category.trim(),
          limit: numLimit
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to save budget");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setSelectedBudgetId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!user?.uid || !selectedBudgetId) return;
    
    setSubmitting(true);
    try {
      await deleteBudget(user.uid, selectedBudgetId);
      setIsDeleteModalOpen(false);
      setSelectedBudgetId(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete budget");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Budget Management</h1>
          <p className="text-gray-500 mt-1">Plan your spending and reach your financial goals.</p>
        </div>
        <Button 
          onClick={() => handleOpenModal()}
          icon={<Plus className="w-5 h-5" />}
          size="lg"
          className="shadow-lg shadow-indigo-200"
        >
          Add Budget
        </Button>
      </div>

      {budgets.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-black/5 border border-gray-100 p-20 text-center flex flex-col items-center justify-center space-y-6">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
            <Target className="w-10 h-10 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Start by setting your first budget</h2>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              Budgets help you track spending by category and ensure you're staying within your financial limits.
            </p>
          </div>
          <Button 
            onClick={() => handleOpenModal()}
            size="lg"
            icon={<Plus className="w-5 h-5" />}
          >
            Create Budget
          </Button>
        </div>
      ) : (
        <>
          {/* Monthly Budget Overview Card */}
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-black/5 border border-gray-100 p-10 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <PieChart className="w-7 h-7 text-indigo-600" />
                  Monthly Budget Overview
                </h2>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Income</p>
                  <p className="text-2xl font-black text-green-600">
                    <CurrencyDisplay value={currentMonthData.income} />
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Budget Limit</p>
                  <p className="text-2xl font-black text-gray-900">
                    <CurrencyDisplay value={budgetStats.totalBudgetLimit} />
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Spent</p>
                  <p className="text-2xl font-black text-red-600">
                    <CurrencyDisplay value={budgetStats.totalSpentInBudgets} />
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Remaining</p>
                  <p className={`text-2xl font-black ${budgetStats.totalBudgetLimit - budgetStats.totalSpentInBudgets >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                    <CurrencyDisplay value={budgetStats.totalBudgetLimit - budgetStats.totalSpentInBudgets} />
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="text-gray-500">Overall Budget Usage</span>
                  <span className={budgetStats.overallProgress > 100 ? 'text-red-600' : 'text-indigo-600'}>
                    {Math.round(budgetStats.overallProgress)}%
                  </span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(budgetStats.overallProgress, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${budgetStats.overallColor} rounded-full`}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                  <span>0%</span>
                  <span>70%</span>
                  <span>90%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
            
            {/* Decorative Background */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Category Budget List */}
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 px-2">
                <Target className="w-5 h-5 text-indigo-600" />
                Category Budgets
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                  {budgetStats.categoryStats.map((budget) => (
                    <motion.div 
                      key={budget.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-black/5 hover:shadow-indigo-500/5 transition-all group flex flex-col min-h-[180px]"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${budget.statusColor} bg-opacity-10 ${budget.statusColor.replace('bg-', 'text-')}`}>
                            <Target className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-gray-900 text-lg truncate">{budget.category}</h4>
                            <p className="text-xs text-gray-500 font-medium truncate">
                              <CurrencyDisplay value={budget.spent} /> of <CurrencyDisplay value={budget.limit} /> used
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button 
                            onClick={() => handleOpenModal(budget)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => budget.id && handleDeleteClick(budget.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 mt-auto">
                        <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(budget.progress, 100)}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full ${budget.statusColor} rounded-full`}
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${budget.spent > budget.limit ? 'text-red-600' : 'text-gray-400'}`}>
                            {budget.spent > budget.limit ? 'Overspent' : `${Math.round(budget.progress)}% Used`}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                            {budget.remaining >= 0 ? (
                              <><CurrencyDisplay value={budget.remaining} /> Left</>
                            ) : (
                              <><CurrencyDisplay value={Math.abs(budget.remaining)} /> Over</>
                            )}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Insights Card */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 px-2">
                <Zap className="w-5 h-5 text-[#6334FD]" />
                Smart Insights
              </h3>
              <div className="bg-gradient-to-br from-[#6B66FE] to-[#6334FD] rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden">
                <div className="relative z-10 space-y-6">
                  {insights.length > 0 ? (
                    insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-4 group">
                        <div className="mt-1 p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-indigo-50">
                          {insight}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                      </div>
                      <p className="text-sm font-bold">You're doing great! No budget alerts at the moment.</p>
                    </div>
                  )}
                </div>
                
                {/* Decorative */}
                <div className="absolute -left-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              </div>

              {/* Tips Card */}
              <div className="bg-[#6334FD]/5 border border-[#6334FD]/10 rounded-[2rem] p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-[#6334FD]/10 rounded-xl">
                    <Info className="w-5 h-5 text-[#6334FD]" />
                  </div>
                  <h4 className="font-bold text-[#6334FD]">Budgeting Tip</h4>
                </div>
                <p className="text-sm text-[#6334FD]/80 leading-relaxed font-bold">
                  The 50/30/20 rule is a great starting point: 50% for needs, 30% for wants, and 20% for savings or debt repayment.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBudget ? "Edit Budget" : "Add New Budget"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Category</label>
              <input 
                type="text"
                list="budget-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Food, Rent, Entertainment"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all font-bold text-gray-900"
                required
              />
              <datalist id="budget-categories">
                {CATEGORY_SUGGESTIONS.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Monthly Limit</label>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                  {userProfile?.currency || '₹'}
                </div>
                <input 
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all font-bold text-gray-900 text-lg"
                  required
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button 
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              fullWidth
              loading={submitting}
            >
              {editingBudget ? "Save Changes" : "Create Budget"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Budget?"
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <p className="text-gray-600 font-medium">
                Are you sure you want to delete this budget? This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline"
              fullWidth
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              variant="primary"
              fullWidth
              onClick={handleConfirmDelete}
              loading={submitting}
              className="bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700 shadow-lg shadow-red-100"
            >
              Delete Budget
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Budgets;
