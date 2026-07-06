import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { trackEvent, AnalyticsEvents } from '../services/analytics';
import { Goal } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { formatCurrency } from '../lib/formatCurrency';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import Button from '../components/ui/Button';
import { 
  Target, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  X,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLayout } from '../contexts/LayoutContext';
import { NAVBAR_HEIGHT, FAB_SAFE_SPACING } from '../constants';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/EmptyState';

const Goals: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { isNavVisible } = useLayout();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isFABMenuOpen, setIsFABMenuOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(true), 1500);
    const hideTimer = setTimeout(() => setShowTooltip(false), 6000);
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);
  
  // New Goal Form State
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState('Savings');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const goalsPath = `users/${user.uid}/goals`;
    const q = query(collection(db, goalsPath), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Goal[];
      setGoals(docs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, goalsPath);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !title || !targetAmount) return;

    setIsSaving(true);
    try {
      const goalsPath = `users/${user.uid}/goals`;
      await addDoc(collection(db, goalsPath), {
        title,
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount) || 0,
        deadline: serverTimestamp(), // For simplicity in this demo, usually would be a date picker
        category,
        status: 'active',
        timestamp: serverTimestamp()
      });

      trackEvent(AnalyticsEvents.GOAL_CREATED, {
        title,
        targetAmount: Number(targetAmount),
        category
      });

      setIsAddingGoal(false);
      setTitle('');
      setTargetAmount('');
      setCurrentAmount('');
      setDeadline('');
    } catch (err) {
      console.error("Error adding goal:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!user?.uid || !id) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/goals`, id));
    } catch (err) {
      console.error("Error deleting goal:", err);
    }
  };

  const handleUpdateProgress = async (goal: Goal, amount: number) => {
    if (!user?.uid || !goal.id) return;
    try {
      const newAmount = goal.currentAmount + amount;
      const status = newAmount >= goal.targetAmount ? 'completed' : 'active';
      await updateDoc(doc(db, `users/${user.uid}/goals`, goal.id), {
        currentAmount: newAmount,
        status
      });
    } catch (err) {
      console.error("Error updating goal:", err);
    }
  };

  const userCurrency = userProfile?.currency || 'INR';

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Target className="w-10 h-10 text-indigo-600" />
            Financial Goals
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Set targets and track your journey to financial freedom.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-64 rounded-[2.5rem]" />
          <Skeleton className="h-64 rounded-[2.5rem]" />
          <Skeleton className="h-64 rounded-[2.5rem]" />
          <Skeleton className="h-64 rounded-[2.5rem]" />
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals set yet"
          description="What are you saving for? A new home, a dream vacation, or early retirement? Start by setting your first goal."
          actionLabel="Create Your First Goal"
          onAction={() => setIsAddingGoal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {goals.map((goal) => {
            const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            const isCompleted = goal.status === 'completed';

            return (
              <motion.div 
                key={goal.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-[2rem] p-8 border ${isCompleted ? 'border-green-100 bg-green-50/10' : 'border-gray-100'} shadow-sm hover:shadow-md transition-all group flex flex-col min-h-[280px]`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {isCompleted ? <Trophy className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 truncate">{goal.title}</h3>
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest truncate block">{goal.category}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteGoal(goal.id!)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all md:opacity-0 md:group-hover:opacity-100 shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 mt-auto">
                  <div className="flex justify-between items-end">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 truncate">Progress</p>
                      <p className="text-2xl font-black text-gray-900 truncate">
                        {progress.toFixed(0)}%
                      </p>
                    </div>
                    <div className="text-right min-w-0">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 truncate">Target</p>
                      <p className="text-lg font-bold text-gray-900 truncate">
                        <CurrencyDisplay value={goal.targetAmount} currency={userCurrency} />
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className={`h-full ${isCompleted ? 'bg-green-500' : 'bg-indigo-600'} rounded-full`}
                    />
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium truncate">
                      Saved: <span className="text-gray-900 font-bold"><CurrencyDisplay value={goal.currentAmount} currency={userCurrency} /></span>
                    </span>
                    <span className="text-gray-500 font-medium truncate">
                      Left: <span className="text-gray-900 font-bold"><CurrencyDisplay value={Math.max(0, goal.targetAmount - goal.currentAmount)} currency={userCurrency} /></span>
                    </span>
                  </div>

                  {!isCompleted && (
                    <div className="pt-4 flex gap-3">
                      <button 
                        onClick={() => handleUpdateProgress(goal, 1000)}
                        className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-all active:scale-95 text-xs truncate"
                      >
                        + {formatCurrency(1000, userCurrency)}
                      </button>
                      <button 
                        onClick={() => handleUpdateProgress(goal, 5000)}
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-100 text-xs truncate"
                      >
                        + {formatCurrency(5000, userCurrency)}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button (FAB) System */}
      <AnimatePresence>
        {!isAddingGoal && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              bottom: isNavVisible 
                ? `calc(${NAVBAR_HEIGHT + FAB_SAFE_SPACING}px + env(safe-area-inset-bottom))` 
                : `calc(${FAB_SAFE_SPACING}px + env(safe-area-inset-bottom))`
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed right-6 md:right-8 z-50 flex flex-col items-end"
          >
            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  className="mb-3 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap relative"
                >
                  Manage Goals
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Menu Popup */}
            <AnimatePresence>
              {isFABMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="mb-4 w-56 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
                >
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setIsAddingGoal(true);
                        setIsFABMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-4 hover:bg-indigo-50 rounded-2xl group transition-all"
                    >
                      <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900 leading-tight">Add New Goal</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Set target</p>
                      </div>
                    </button>
                    
                    <button
                      disabled
                      className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 rounded-2xl group transition-all opacity-40 cursor-not-allowed"
                    >
                      <div className="p-2 bg-gray-100 rounded-xl text-gray-400">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900 leading-tight">Update Progress</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Coming soon</p>
                      </div>
                    </button>

                    <button
                      disabled
                      className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 rounded-2xl group transition-all opacity-40 cursor-not-allowed"
                    >
                      <div className="p-2 bg-gray-100 rounded-xl text-gray-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900 leading-tight">Close Goal</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Coming soon</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main FAB */}
            <motion.button
              onClick={() => {
                setIsFABMenuOpen(!isFABMenuOpen);
                setShowTooltip(false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isFABMenuOpen ? 'bg-gray-900 rotate-45' : 'bg-gradient-to-r from-[#6B66FE] to-[#6334FD] shadow-indigo-200'}`}
            >
              <Plus className="w-8 h-8 text-white" />
              {!isFABMenuOpen && (
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity
                  }}
                  className="absolute inset-0 bg-white/20 rounded-full blur-sm"
                />
              )}
            </motion.button>
            
            {/* Overlay to close menu */}
            {isFABMenuOpen && (
              <div 
                className="fixed inset-0 z-[-1]" 
                onClick={() => setIsFABMenuOpen(false)} 
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {isAddingGoal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-8 border-b border-gray-100">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Set New Goal</h3>
                  <p className="text-sm text-gray-500 mt-1">Define your financial target</p>
                </div>
                <button onClick={() => setIsAddingGoal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              
              <form onSubmit={handleAddGoal} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Goal Title</label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900"
                    placeholder="e.g. New Car, Emergency Fund"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Target Amount</label>
                    <input 
                      type="number"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Initial Savings</label>
                    <input 
                      type="number"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-bold text-gray-900 appearance-none"
                  >
                    <option>Savings</option>
                    <option>Investment</option>
                    <option>Major Purchase</option>
                    <option>Debt Repayment</option>
                    <option>Travel</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="flex space-x-4 pt-4">
                  <Button variant="secondary" fullWidth onClick={() => setIsAddingGoal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" fullWidth loading={isSaving}>
                    Create Goal
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Goals;
