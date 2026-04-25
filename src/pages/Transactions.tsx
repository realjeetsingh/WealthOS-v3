import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  addTransaction, 
  updateTransaction, 
  deleteTransaction, 
  deleteTransactionsBulk,
  resetTransactions,
  checkDuplicate
} from '../services/financeService';
import { generateFingerprint } from '../lib/smsParser';
import { Transaction } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { formatCurrency, formatCurrencyShort } from '../lib/formatCurrency';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { CURRENCIES, DEFAULT_CURRENCY } from '../lib/currency';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import SMSParser from '../components/SMSParser';
import SmartSyncModal from '../components/SmartSyncModal';
import { 
  PlusCircle, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Tag, 
  FileText, 
  Loader2,
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  ArrowLeft,
  Edit2,
  Edit3,
  Trash2,
  X,
  CheckCircle,
  Save,
  Zap,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  Trash,
  LayoutDashboard
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { motion, AnimatePresence } from 'motion/react';
import { useLayout } from '../contexts/LayoutContext';
import { getCategoryEmoji, CATEGORIES } from '../lib/categorizationEngine';

const Transactions: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { isNavVisible } = useLayout();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<boolean>(false);
  const [skipDuplicateCheck, setSkipDuplicateCheck] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [notes, setNotes] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isFABMenuOpen, setIsFABMenuOpen] = useState(false);
  const [showFABTooltip, setShowFABTooltip] = useState(() => {
    return localStorage.getItem('fab_tooltip_shown') !== 'true';
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Modal & Detail States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeletingInsideModal, setIsDeletingInsideModal] = useState(false);
  const [isEditingCategoryQuickly, setIsEditingCategoryQuickly] = useState(false);
  const [quickCategory, setQuickCategory] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedDetailTransaction, setSelectedDetailTransaction] = useState<Transaction | null>(null);

  // Filter & Selection States
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    if (showFABTooltip) {
      const timer = setTimeout(() => setShowFABTooltip(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showFABTooltip]);

  const closeFAB = () => {
    setIsFABMenuOpen(false);
    if (showFABTooltip) {
      setShowFABTooltip(false);
      localStorage.setItem('fab_tooltip_shown', 'true');
    }
  };
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
  const [isSmartSyncOpen, setIsSmartSyncOpen] = useState(false);
  const [isSmartSyncEnabled, setIsSmartSyncEnabled] = useState(() => {
    return localStorage.getItem('smartSyncEnabled') === 'true';
  });

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // TASK 6: RESET DATABASE (One-time)
    const hasReset = localStorage.getItem(`db_reset_v2_${user.uid}`);
    if (!hasReset) {
      resetTransactions(user.uid).then(() => {
        localStorage.setItem(`db_reset_v2_${user.uid}`, 'true');
      });
    }

    const path = `users/${user.uid}/transactions`;
    const q = query(
      collection(db, path), 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(docs);
      setLoading(false);
    }, (err) => {
      console.error("Firestore snapshot error:", err);
      handleFirestoreError(err, OperationType.LIST, path, user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // TASK 4 & 5: AUTO RESET & SMART DEFAULTS
  useEffect(() => {
    if (type === 'income') {
      setCategory('Salary');
    } else {
      setCategory('Food');
    }
    setIsCustomCategory(false);
    setCustomCategoryName('');
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    setError(null);
    setSubmitting(true);

    try {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("Please enter a valid amount");
      }

      const finalCategory = isCustomCategory ? customCategoryName.trim() : category;
      if (!finalCategory) {
        throw new Error("Please select or enter a category");
      }

      const txDate = new Date().toLocaleDateString('en-GB');
      const txNotes = notes.trim() || null;
      const txMerchant = txNotes || finalCategory || 'Manual Entry';

      // TASK 5: MANUAL ENTRY COLLISION
      if (!skipDuplicateCheck) {
        const fingerprint = generateFingerprint({
          amount: numAmount,
          date: txDate,
          merchant: txMerchant
        });

        const isDup = await checkDuplicate(user.uid, fingerprint);
        if (isDup) {
          setDuplicateWarning(true);
          setSubmitting(false);
          return;
        }
      }

      await addTransaction(user.uid, {
        type,
        amount: numAmount,
        category: finalCategory,
        notes: txNotes,
        source: 'manual',
        date: txDate
      });

      // Reset form
      setType('expense');
      setAmount('');
      setCategory('Food');
      setNotes('');
      setIsCustomCategory(false);
      setCustomCategoryName('');
      setDuplicateWarning(false);
      setSkipDuplicateCheck(false);
    } catch (err: any) {
      setError(err.message || "Failed to process transaction");
    } finally {
      if (!duplicateWarning) {
        setSubmitting(false);
      }
    }
  };

  const handleConfirmDuplicate = () => {
    setSkipDuplicateCheck(true);
    setDuplicateWarning(false);
    // The next submit will skip check
    setTimeout(() => {
       const form = document.querySelector('form');
       form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, 100);
  };

  const handleEdit = (t: Transaction) => {
    setSelectedTransaction(t);
    setEditType(t.type);
    setEditAmount(t.amount.toString());
    setEditCategory(t.category);
    setEditNotes(t.notes || '');
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !selectedTransaction) return;

    setEditError(null);
    setEditSubmitting(true);

    try {
      const numAmount = parseFloat(editAmount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("Please enter a valid amount");
      }

      await updateTransaction(user.uid, selectedTransaction.id, {
        type: editType,
        amount: numAmount,
        category: editCategory,
        notes: editNotes.trim() || null,
        source: selectedTransaction.source // Preserve original source
      });

      setIsEditModalOpen(false);
      setSelectedTransaction(null);
    } catch (err: any) {
      setEditError(err.message || "Failed to update transaction");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.uid) return;
    setDeletingId(id);
    try {
      await deleteTransaction(user.uid, id);
      setDeleteConfirmId(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete transaction");
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!user?.uid || selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await deleteTransactionsBulk(user.uid, selectedIds);
      setIsBulkDeleteConfirmOpen(false);
      setIsSelectionMode(false);
      setSelectedIds([]);
    } catch (err: any) {
      setError(err.message || "Failed to delete transactions");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredTransactions = filterCategory 
    ? transactions.filter(t => t.category === filterCategory)
    : transactions;

  const currencyConfig = CURRENCIES.find(c => c.code === (userProfile?.currency || DEFAULT_CURRENCY)) || CURRENCIES[0];
  const currencySymbol = currencyConfig.symbol;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="space-y-8">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-[400px] w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <SMSParser 
        isOpen={isSMSModalOpen}
        onClose={() => setIsSMSModalOpen(false)}
        onParse={async (data) => {
          if (!user?.uid) return;
          await addTransaction(user.uid, data);
        }}
      />
      
      <SmartSyncModal 
        isOpen={isSmartSyncOpen}
        onClose={() => setIsSmartSyncOpen(false)}
        onSyncComplete={() => {
          setIsSmartSyncEnabled(true);
          localStorage.setItem('smartSyncEnabled', 'true');
        }}
      />

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              Transactions
                {isSmartSyncEnabled && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#6334FD]/10 text-[#6334FD] text-[10px] font-black uppercase tracking-widest rounded-full border border-[#6334FD]/20 animate-in fade-in zoom-in group relative overflow-hidden">
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <span className="relative flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#6334FD] rounded-full animate-pulse" />
                      {isIOS ? 'Last Sync: Today' : 'Smart Sync Active'}
                    </span>
                  </span>
                )}
            </h1>
            <p className="mt-2 text-gray-600">
              {filterCategory ? (
                <span className="flex items-center gap-2">
                  Showing <span className="text-[#6334FD] font-bold">{filterCategory}</span> transactions
                  <button onClick={() => setFilterCategory(null)} className="text-[10px] underline text-gray-400 hover:text-gray-600 font-bold uppercase tracking-widest">Clear</button>
                </span>
              ) : "Manage your income and expenses securely."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="primary"
              size="lg"
              onClick={() => setIsSmartSyncOpen(true)}
              icon={<Sparkles className="w-5 h-5" />}
              className="shadow-[#6334FD]/20 hover:shadow-[#6334FD]/40 transition-shadow"
            >
              Sync History
            </Button>
          </div>
        </div>

        {/* Smart Sync CTA Card - Hierarchy Correction */}
        {!isSmartSyncEnabled && (
          <div className="bg-gradient-to-br from-[#6B66FE] to-[#6334FD] rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">Stop Manual Entry</h3>
                </div>
                <p className="text-indigo-100 font-medium max-w-md">
                  Enable Smart Sync to automatically track bank transactions from your SMS. Secure, private, and 100% automated.
                </p>
              </div>
              <Button 
                onClick={() => setIsSmartSyncOpen(true)}
                variant="primary"
                size="lg"
                className="bg-white text-[#6334FD] hover:bg-indigo-50 shadow-none px-10 h-16 text-lg border-none animate-bounce sm:animate-none"
              >
                Enable Smart Sync
              </Button>
            </div>
            {/* Background Flair */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-black/10 rounded-full blur-2xl" />
          </div>
        )}

        {/* Floating Action Button (FAB) System */}
        <motion.div 
          animate={{ 
            bottom: isNavVisible 
              ? 'calc(90px + env(safe-area-inset-bottom))' 
              : 'calc(20px + env(safe-area-inset-bottom))'
          }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed right-6 md:right-8 z-[9999] flex flex-col items-end"
        >
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
                      setIsAddModalOpen(true);
                      closeFAB();
                    }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-indigo-50 rounded-2xl group transition-all"
                  >
                    <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-gray-900 leading-tight">Add Transaction</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Manual Entry</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setIsSMSModalOpen(true);
                      closeFAB();
                    }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-100 rounded-2xl group transition-all"
                  >
                    <div className="p-2 bg-gray-100 rounded-xl text-gray-600 group-hover:bg-gray-200 transition-colors">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-gray-700 leading-tight">Manual Parse</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Paste SMS text</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setIsFilterModalOpen(true);
                      closeFAB();
                    }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-100 rounded-2xl group transition-all"
                  >
                    <div className="p-2 bg-gray-100 rounded-xl text-gray-600 group-hover:bg-gray-200 transition-colors">
                      <Filter className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-gray-700 leading-tight">Filter Category</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">View by category</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setIsSelectionMode(true);
                      closeFAB();
                    }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-100 rounded-2xl group transition-all"
                  >
                    <div className="p-2 bg-gray-100 rounded-xl text-gray-600 group-hover:bg-gray-200 transition-colors">
                      <CheckSquare className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-gray-700 leading-tight">Bulk Actions</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Select multiple</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tooltip */}
          <AnimatePresence>
            {showFABTooltip && !isFABMenuOpen && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="mb-3 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap relative mr-2"
              >
                Add something new!
                <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main FAB */}
          <motion.button
            onClick={() => setIsFABMenuOpen(!isFABMenuOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isFABMenuOpen ? 'bg-gray-900 rotate-45' : 'bg-gradient-to-r from-[#6B66FE] to-[#6334FD] shadow-indigo-200'}`}
          >
            <PlusCircle className={`w-8 h-8 text-white transition-opacity ${isFABMenuOpen ? 'opacity-100' : 'opacity-100'}`} />
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

        {/* Transaction List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{isSelectionMode ? `Selected ${selectedIds.length}` : 'Recent Activity'}</h2>
            {isSelectionMode && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="danger" 
                  disabled={selectedIds.length === 0}
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
                  icon={<Trash className="w-4 h-4" />}
                >
                  Delete
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedIds([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-gray-50 rounded-full">
                <FileText className="w-12 h-12 text-gray-300" />
              </div>
              <div>
                <p className="text-gray-900 font-bold text-xl">{filterCategory ? `No ${filterCategory} transactions` : "No transactions yet"}</p>
                <p className="text-gray-500 font-medium mt-1">Start tracking your income and expenses to see them here.</p>
              </div>
              {!filterCategory && (
                <Button
                  variant="outline"
                  onClick={() => setIsAddModalOpen(true)}
                  icon={<PlusCircle className="w-5 h-5" />}
                >
                  Add your first transaction
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {filteredTransactions.map((t) => (
                  <div 
                    key={t.id} 
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleSelection(t.id!);
                      } else {
                        setSelectedDetailTransaction(t);
                        setIsDetailModalOpen(true);
                      }
                    }}
                    className={`p-4 md:p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors group gap-4 cursor-pointer ${selectedIds.includes(t.id!) ? 'bg-indigo-50/50' : ''}`}
                  >
                    <div className="flex items-center space-x-3 md:space-x-5 min-w-0 flex-1">
                      {isSelectionMode ? (
                        <div className={`p-1.5 rounded-lg border-2 transition-colors ${selectedIds.includes(t.id!) ? 'bg-[#6334FD] border-[#6334FD] text-white' : 'border-gray-200 text-transparent'}`}>
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className={`p-2.5 md:p-3 rounded-xl shrink-0 ${t.type === 'income' ? 'bg-green-50 text-[#16A34A]' : 'bg-red-50 text-[#DC2626]'}`}>
                          {t.type === 'income' ? <ArrowUpCircle className="w-5 h-5 md:w-6 md:h-6" /> : <ArrowDownCircle className="w-5 h-5 md:w-6 md:h-6" />}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-base md:text-lg flex items-center gap-2 flex-wrap">
                          <span className="truncate flex items-center gap-1.5">
                            <span className="text-xl leading-none">{getCategoryEmoji(t.category)}</span>
                            {t.category}
                          </span>
                          {!t.isCategoryConfirmed && t.source === 'auto' && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest rounded-md border border-amber-200 animate-pulse">
                              Auto
                            </span>
                          )}
                          {t.status === 'review' && (
                            <span className="p-1 bg-amber-50 rounded-full shrink-0" title="Incomplete import - Needs review">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                            </span>
                          )}
                          {t.source === 'auto' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#6334FD]/10 text-[#6334FD] text-[8px] font-black uppercase tracking-tighter rounded-full border border-[#6334FD]/20 shadow-sm shrink-0" title="Auto-imported ⚡">
                              <Zap className="w-2.5 h-2.5 fill-[#6334FD]" />
                              Auto-imported
                            </span>
                          )}
                          {t.source === 'sms' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-tighter rounded-full border border-blue-100 shadow-sm shrink-0">
                               <FileText className="w-2.5 h-2.5" />
                               SMS Sync
                            </span>
                          )}
                          {t.source === 'manual' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 text-[8px] font-black uppercase tracking-tighter rounded-full border border-gray-100 shadow-sm shrink-0">
                               <Edit3 className="w-2.5 h-2.5" />
                               Manually Added
                            </span>
                          )}
                        </p>
                        <p className="text-xs md:text-sm text-gray-500 font-medium truncate">
                            {t.source === 'manual' ? (t.notes || 'Manual Entry') : (t.notes || 'No notes')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 md:space-x-6 shrink-0">
                      <div className="text-right">
                        <p className={`text-base md:text-xl font-bold whitespace-nowrap ${t.type === 'income' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                          {t.type === 'income' ? '+' : '-'}<CurrencyDisplay value={t.amount} />
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
                          {(typeof t.timestamp?.toDate === 'function') ? t.timestamp.toDate().toLocaleDateString() : 'Recent'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setIsDeletingInsideModal(false);
          setIsEditingCategoryQuickly(false);
        }}
        title={isDeletingInsideModal ? "Confirm Delete" : "Transaction Details"}
        maxWidth="max-w-lg"
      >
        {selectedDetailTransaction && (
          <div className="space-y-8 relative">
            <AnimatePresence mode="wait">
              {isDeletingInsideModal ? (
                <motion.div 
                  key="delete-confirm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="py-6 text-center space-y-6"
                >
                  <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-600 shadow-inner">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Are you sure?</h3>
                    <p className="text-gray-500 font-medium px-4">
                      This will permanently remove the <span className="font-bold text-gray-900">{selectedDetailTransaction.category}</span> transaction of <span className="font-bold text-gray-900">{currencySymbol}{selectedDetailTransaction.amount}</span>.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 pt-4 px-4">
                    <Button
                      variant="danger"
                      fullWidth
                      size="lg"
                      loading={deletingId === selectedDetailTransaction.id}
                      onClick={async () => {
                        await handleDelete(selectedDetailTransaction.id!);
                        setIsDetailModalOpen(false);
                        setIsDeletingInsideModal(false);
                      }}
                    >
                      Yes, Delete Transaction
                    </Button>
                    <Button
                      variant="ghost"
                      fullWidth
                      onClick={() => setIsDeletingInsideModal(false)}
                      className="text-gray-500 hover:text-gray-800"
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className={`p-8 rounded-[2.5rem] flex flex-col items-center text-center space-y-4 mb-8 ${selectedDetailTransaction.type === 'income' ? 'bg-green-50 shadow-green-100/50' : 'bg-red-50 shadow-red-100/50'} shadow-2xl transition-colors duration-500`}>
                    <div className={`p-4 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${selectedDetailTransaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedDetailTransaction.type === 'income' ? <ArrowUpCircle className="w-12 h-12" /> : <ArrowDownCircle className="w-12 h-12" />}
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${selectedDetailTransaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedDetailTransaction.type}
                        </p>
                        {selectedDetailTransaction.source === 'auto' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#6334FD]/10 text-[#6334FD] text-[8px] font-black uppercase tracking-tighter rounded-full border border-[#6334FD]/20">
                            <Zap className="w-2 h-2 fill-[#6334FD]" />
                            Auto-imported
                          </span>
                        )}
                        {selectedDetailTransaction.source === 'sms' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-tighter rounded-full border border-blue-100">
                             <FileText className="w-2 h-2" />
                             Imported from SMS
                          </span>
                        )}
                        {selectedDetailTransaction.source === 'manual' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 text-[8px] font-black uppercase tracking-tighter rounded-full border border-gray-100">
                             <Edit3 className="w-2 h-2" />
                             Manually Added
                          </span>
                        )}
                      </div>
                      <h3 className={`text-5xl font-black tracking-tight ${selectedDetailTransaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDetailTransaction.type === 'income' ? '+' : '-'}<CurrencyDisplay value={selectedDetailTransaction.amount} />
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-8 px-2">
                    <div className="space-y-1.5 relative group cursor-pointer" onClick={() => {
                        setQuickCategory(selectedDetailTransaction.category);
                        setIsEditingCategoryQuickly(true);
                    }}>
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</p>
                      </div>
                      
                      {/* LOW CONFIDENCE ALERT */}
                      {!selectedDetailTransaction.isCategoryConfirmed && (
                        <div className="absolute -top-10 left-0 right-0 bg-amber-50 border border-amber-100 rounded-xl p-3 shadow-xl z-10 animate-in fade-in slide-in-from-bottom-2">
                          <p className="text-[9px] font-bold text-amber-800 flex items-center gap-1.5">
                            <BrainCircuit className="w-3 h-3" />
                            AI Suggesion — Is this correct?
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTransaction(user?.uid, selectedDetailTransaction.id!, { 
                                  isCategoryConfirmed: true,
                                  notes: selectedDetailTransaction.notes // Trigger learning with notes
                                });
                                setSelectedDetailTransaction({ ...selectedDetailTransaction, isCategoryConfirmed: true });
                              }}
                              className="flex-1 bg-amber-600 text-white text-[9px] font-black uppercase py-1.5 rounded-lg active:scale-95 transition-transform"
                            >
                              Confirm
                            </button>
                            <button 
                              onClick={() => {
                                setQuickCategory(selectedDetailTransaction.category);
                                setIsEditingCategoryQuickly(true);
                              }}
                              className="flex-1 bg-white border border-amber-200 text-amber-900 text-[9px] font-black uppercase py-1.5 rounded-lg active:scale-95 transition-transform"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      )}

                      {isEditingCategoryQuickly ? (
                        <div className="flex gap-2">
                             <select
                                className="w-full text-sm font-bold border-b border-indigo-600 outline-none bg-transparent"
                                autoFocus
                                value={quickCategory}
                                onChange={async (e) => {
                                    const newCat = e.target.value;
                                    setQuickCategory(newCat);
                                    if (newCat) {
                                        await updateTransaction(user!.uid, selectedDetailTransaction?.id!, { category: newCat });
                                        setSelectedDetailTransaction({ ...selectedDetailTransaction, category: newCat });
                                        setIsEditingCategoryQuickly(false);
                                    }
                                }}
                                onBlur={() => setIsEditingCategoryQuickly(false)}
                             >
                                <option value="" disabled>Select Category</option>
                                {CATEGORIES.filter(c => c.type === selectedDetailTransaction.type).map(cat => (
                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                ))}
                             </select>
                        </div>
                      ) : (
                        <p className="font-black text-gray-900 text-xl flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                            {selectedDetailTransaction.category}
                            <Edit2 className="w-3 h-3 md:opacity-0 group-hover:opacity-100" />
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p>
                      </div>
                      <p className="font-bold text-gray-900 text-lg">
                        {(typeof selectedDetailTransaction.timestamp?.toDate === 'function') ? selectedDetailTransaction.timestamp.toDate().toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Recent'}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Source</p>
                      </div>
                      <p className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        {selectedDetailTransaction.source === 'auto' ? 'Imported via Sync' : (selectedDetailTransaction.source === 'sms' ? `SMS from ${selectedDetailTransaction.senderId || 'Bank'}` : 'Manual Entry')}
                      </p>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
                      </div>
                      <p className={`font-black text-lg ${selectedDetailTransaction.status === 'review' ? 'text-amber-600' : 'text-green-600'}`}>
                        {selectedDetailTransaction.status === 'review' ? 'Review Needed' : 'Verified'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100/50 mb-8 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Notes</p>
                    </div>
                    <p className="text-gray-700 font-medium leading-relaxed italic text-sm">
                      {selectedDetailTransaction.notes || 'No detailed notes provided for this transaction.'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <Button
                      variant="secondary"
                      fullWidth
                      size="lg"
                      onClick={() => {
                        handleEdit(selectedDetailTransaction);
                        setIsDetailModalOpen(false);
                      }}
                      icon={<Edit2 className="w-5 h-5" />}
                      className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-none bg-white font-black"
                    >
                      Edit Details
                    </Button>
                    <div className="flex justify-center">
                        <button
                        onClick={() => setIsDeletingInsideModal(true)}
                        className="text-stone-400 hover:text-stone-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 py-2 px-6 rounded-full hover:bg-gray-100 transition-all"
                        >
                        <Trash2 className="w-3 h-3" />
                        Delete Permanently
                        </button>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <label className="flex items-center justify-between cursor-pointer group">
                             <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                                    <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                                </div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Developer Debug Mode</span>
                             </div>
                             <input 
                                type="checkbox" 
                                checked={isDebugMode} 
                                onChange={(e) => setIsDebugMode(e.target.checked)}
                                className="w-4 h-4 rounded text-[#6334FD] focus:ring-[#6334FD]"
                             />
                        </label>
                        
                        {isDebugMode && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-4 p-4 bg-gray-900 rounded-2xl overflow-hidden"
                            >
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Internal Payload Check</p>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Transaction ID</p>
                                        <p className="text-[10px] font-mono text-gray-400 break-all">{selectedDetailTransaction.id}</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Source Type</p>
                                            <p className="text-xs font-bold text-white uppercase">{selectedDetailTransaction.source || 'undefined'}</p>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Sender ID</p>
                                            <p className="text-xs font-mono text-white mt-0.5">{selectedDetailTransaction.senderId || 'Local-Entry'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Raw SMS Payload</p>
                                        <p className="text-[10px] font-medium text-gray-300 leading-relaxed mt-1 break-words bg-black/30 p-2 rounded-lg border border-white/5">
                                            {selectedDetailTransaction.rawSMS || 'N/A — Manually Created Entry'}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                                        <div className="text-[8px] font-bold text-indigo-300 uppercase tracking-tight flex items-center gap-1">
                                            <BrainCircuit className="w-2.5 h-2.5" />
                                            Confidence Score
                                        </div>
                                        <div className="text-xs font-black text-white">{selectedDetailTransaction.categoryConfidence ? Math.round(selectedDetailTransaction.categoryConfidence * 100) + '%' : '100% (Manual)'}</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </Modal>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Transaction"
        maxWidth="max-w-2xl"
      >
        {error && (
          <div className="mb-8 bg-red-50 border-l-4 border-[#DC2626] p-4 rounded-lg flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-[#DC2626] mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {duplicateWarning && (
          <div className="mb-8 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-xl flex flex-col space-y-3">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm text-amber-900 font-bold leading-tight">Similar transaction already exists</p>
                <p className="text-xs text-amber-700 mt-1 font-medium leading-relaxed">
                  We found a transaction with the same amount and category recorded for today. 
                  Do you want to add this duplicate?
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end items-center">
              <button 
                type="button"
                onClick={() => {
                  setDuplicateWarning(false);
                  setSubmitting(false);
                }}
                className="text-xs font-bold text-gray-500 hover:text-gray-700 uppercase tracking-widest px-4 py-2"
              >
                No, Cancel
              </button>
              <button 
                type="button"
                onClick={handleConfirmDuplicate}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 uppercase tracking-widest px-4 py-2 bg-amber-100 rounded-lg"
              >
                Yes, Add anyway
              </button>
            </div>
          </div>
        )}

        <form onSubmit={async (e) => {
          await handleSubmit(e);
          if (!error) setIsAddModalOpen(false);
        }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Type</label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all active:scale-[0.98] duration-150 flex items-center justify-center ${
                    type === 'expense' 
                      ? 'bg-red-50 border-red-200 text-[#DC2626] ring-4 ring-red-50' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ArrowDownCircle className="w-5 h-5 mr-2" />
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all active:scale-[0.98] duration-150 flex items-center justify-center ${
                    type === 'income' 
                      ? 'bg-green-50 border-green-200 text-[#16A34A] ring-4 ring-green-50' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ArrowUpCircle className="w-5 h-5 mr-2" />
                  Income
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Amount</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 font-bold">{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-[#4F46E5] text-lg font-bold transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Category</label>
              <div className="space-y-4">
                <div className="relative">
                  <Tag className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <select
                    required={!isCustomCategory}
                    value={isCustomCategory ? 'custom' : category}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomCategory(true);
                        setCategory('');
                      } else {
                        setIsCustomCategory(false);
                        setCategory(e.target.value);
                      }
                    }}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-[#4F46E5] text-base transition-all bg-white"
                  >
                    <option value="" disabled>Select Category</option>
                    {CATEGORIES.filter(c => c.type === type).map(cat => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                    <option value="custom">+ Add Custom Category</option>
                  </select>
                </div>

                {isCustomCategory && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                  >
                    <PlusCircle className="absolute left-4 top-3.5 h-5 w-5 text-[#6334FD]" />
                    <input
                      type="text"
                      required
                      placeholder="Enter custom category name"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      className="block w-full pl-12 pr-4 py-3 border-2 border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-[#6334FD] text-base transition-all"
                    />
                  </motion.div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Notes (Optional)</label>
              <div className="relative">
                <FileText className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Add a note..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-[#4F46E5] text-base transition-all"
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <Button
              type="submit"
              loading={submitting}
              fullWidth
              size="lg"
              icon={<PlusCircle className="w-6 h-6" />}
            >
              Add Transaction
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Transaction"
        maxWidth="max-w-2xl"
      >
        {editError && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{editError}</p>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Type</label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setEditType('expense')}
                    className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all active:scale-[0.98] duration-150 flex items-center justify-center ${
                      editType === 'expense' 
                        ? 'bg-red-50 border-red-200 text-[#DC2626] ring-4 ring-red-50' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ArrowDownCircle className="w-5 h-5 mr-2" />
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType('income')}
                    className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all active:scale-[0.98] duration-150 flex items-center justify-center ${
                      editType === 'income' 
                        ? 'bg-green-50 border-green-200 text-[#16A34A] ring-4 ring-green-50' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ArrowUpCircle className="w-5 h-5 mr-2" />
                    Income
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Amount</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 font-bold">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-[#4F46E5] text-lg font-bold transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Category</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <select
                    required
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-[#4F46E5] text-base transition-all bg-white"
                  >
                    {CATEGORIES.filter(c => c.type === editType).map(cat => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                    {!CATEGORIES.find(c => c.name === editCategory) && (
                       <option value={editCategory}>{editCategory} (Custom)</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Notes (Optional)</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Add a note..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-[#4F46E5] text-base transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              fullWidth
              size="lg"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={editSubmitting}
              fullWidth
              size="lg"
              icon={<Save className="w-6 h-6" />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-4 text-red-600 mb-6">
              <div className="p-3 bg-red-50 rounded-xl">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold">Confirm Delete</h3>
            </div>
            <p className="text-gray-600 text-lg mb-8">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                fullWidth
                loading={deletingId === deleteConfirmId}
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm */}
      {isBulkDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
          >
             <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                <Trash className="w-10 h-10" />
             </div>
             <h3 className="text-2xl font-black text-gray-900 mb-2">Delete {selectedIds.length} items?</h3>
             <p className="text-gray-500 font-medium mb-8">This action is permanent and cannot be reversed.</p>
             <div className="flex gap-3">
                <Button variant="ghost" fullWidth onClick={() => setIsBulkDeleteConfirmOpen(false)}>Cancel</Button>
                <Button variant="danger" fullWidth loading={isBulkDeleting} onClick={handleBulkDelete}>Delete All</Button>
             </div>
          </motion.div>
        </div>
      )}

      {/* Filter Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter by Category"
        maxWidth="max-w-sm"
      >
        <div className="grid grid-cols-1 gap-2 p-2">
            <button 
                onClick={() => {
                    setFilterCategory(null);
                    setIsFilterModalOpen(false);
                }}
                className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${!filterCategory ? 'bg-indigo-50 border-2 border-indigo-200' : 'hover:bg-gray-50'}`}
            >
                <div className="p-2 bg-gray-100 rounded-lg"><LayoutDashboard className="w-5 h-5" /></div>
                <span className="font-bold text-gray-900">All Transactions</span>
            </button>
            <div className="space-y-4">
              <div>
                <p className="px-4 text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-2">Income Categories</p>
                <div className="space-y-1">
                  {CATEGORIES.filter(c => c.type === 'income').map(cat => (
                      <button 
                          key={cat.name}
                          onClick={() => {
                              setFilterCategory(cat.name);
                              setIsFilterModalOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${filterCategory === cat.name ? 'bg-indigo-50 border-2 border-indigo-200' : 'hover:bg-gray-50'}`}
                      >
                          <div className="p-2 bg-gray-50 rounded-lg text-xl leading-none">{getCategoryEmoji(cat.name)}</div>
                          <span className="font-bold text-gray-900">{cat.name}</span>
                      </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="px-4 text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-2">Expense Categories</p>
                <div className="space-y-1">
                  {CATEGORIES.filter(c => c.type === 'expense').map(cat => (
                      <button 
                          key={cat.name}
                          onClick={() => {
                              setFilterCategory(cat.name);
                              setIsFilterModalOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${filterCategory === cat.name ? 'bg-indigo-50 border-2 border-indigo-200' : 'hover:bg-gray-50'}`}
                      >
                          <div className="p-2 bg-gray-50 rounded-lg text-xl leading-none">{getCategoryEmoji(cat.name)}</div>
                          <span className="font-bold text-gray-900">{cat.name}</span>
                      </button>
                  ))}
                </div>
              </div>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default Transactions;
