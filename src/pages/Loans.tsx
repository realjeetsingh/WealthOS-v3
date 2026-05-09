import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLayout } from '../contexts/LayoutContext';
import { NAVBAR_HEIGHT, FAB_SAFE_SPACING } from '../constants';
import { toast } from 'sonner';
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { addLoan, updateLoan, deleteLoan } from '../services/financeService';
import { Loan, FinancialSnapshot, Transaction, LoanSuggestion } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { formatCurrency, formatCurrencyShort } from '../lib/formatCurrency';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { CURRENCIES, DEFAULT_CURRENCY } from '../lib/currency';
import { calculateTotalEMI, calculateMonthlyIncome } from '../lib/financialEngine';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { detectLoanSuggestions } from '../services/loanDetectionService';
import { 
  calculateEMI, 
  calculateTotalPayable, 
  calculateTotalInterest, 
  getLoanBreakdown, 
  simulatePrepayment, 
  calculateLoanHealth 
} from '../lib/loanUtils';
import { 
  PlusCircle, 
  Wallet, 
  Calendar, 
  Percent, 
  ArrowRightCircle, 
  Loader2,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Clock,
  TrendingDown,
  Zap,
  ShieldAlert,
  Save,
  Building2,
  Info,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Bell,
  Briefcase
} from 'lucide-react';
import EmptyState from '../components/EmptyState';

const Loans: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { isNavVisible } = useLayout();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [lenderName, setLenderName] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidMonths, setPaidMonths] = useState('0');
  const [totalAmount, setTotalAmount] = useState('');
  const [emi, setEmi] = useState('');
  const [nextEmiDate, setNextEmiDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  // Detection state
  const [suggestions, setSuggestions] = useState<LoanSuggestion[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [currentDetectionSource, setCurrentDetectionSource] = useState<'manual' | 'sms' | 'aa'>('manual');
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(true), 1500);
    const hideTimer = setTimeout(() => setShowTooltip(false), 6000);
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Simulation state
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [simLoan, setSimLoan] = useState<Loan | null>(null);
  const [prepaymentAmount, setPrepaymentAmount] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [editName, setEditName] = useState('');
  const [editLenderName, setEditLenderName] = useState('');
  const [editPrincipalAmount, setEditPrincipalAmount] = useState('');
  const [editInterestRate, setEditInterestRate] = useState('');
  const [editTenureMonths, setEditTenureMonths] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editPaidMonths, setEditPaidMonths] = useState('0');
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [editEmi, setEditEmi] = useState('');
  const [editNextEmiDate, setEditNextEmiDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Auto-calculations for UI feedback
  useEffect(() => {
    const p = parseFloat(principalAmount) || 0;
    const r = parseFloat(interestRate) || 0;
    const t = parseFloat(tenureMonths) || 0;

    if (p > 0 && r > 0 && t > 0) {
      const calculatedEmi = calculateEMI(p, r, t);
      const totalRepayable = calculateTotalPayable(calculatedEmi, t);
      setEmi(calculatedEmi.toString());
      setTotalAmount(totalRepayable.toString());

      // Auto-calculate end date
      if (startDate) {
        const start = new Date(startDate);
        start.setMonth(start.getMonth() + t);
        setEndDate(start.toISOString().split('T')[0]);
        
        // Next EMI Date logic
        const next = new Date(startDate);
        const now = new Date();
        const paid = parseFloat(paidMonths) || 0;
        next.setMonth(next.getMonth() + paid + 1);
        setNextEmiDate(next.toISOString().split('T')[0]);
      }
    }
  }, [principalAmount, interestRate, tenureMonths, startDate, paidMonths]);

  // Auto-calculations for Edit Modal
  useEffect(() => {
    const p = parseFloat(editPrincipalAmount) || 0;
    const r = parseFloat(editInterestRate) || 0;
    const t = parseFloat(editTenureMonths) || 0;

    if (p > 0 && r > 0 && t > 0) {
      const calculatedEmi = calculateEMI(p, r, t);
      const totalRepayable = calculateTotalPayable(calculatedEmi, t);
      setEditEmi(calculatedEmi.toString());
      setEditTotalAmount(totalRepayable.toString());
      
      if (editStartDate) {
        const start = new Date(editStartDate);
        start.setMonth(start.getMonth() + t);
        setEditEndDate(start.toISOString().split('T')[0]);
      }
    }
  }, [editPrincipalAmount, editInterestRate, editTenureMonths, editStartDate]);

  const calculatedInterest = (pAmount: string, tAmount: string, emiVal: string, totAmount: string) => {
    const p = parseFloat(pAmount) || 0;
    const tot = parseFloat(totAmount) || 0;
    const e = parseFloat(emiVal) || 0;
    const t = parseFloat(tAmount) || 0;
    
    let finalTotal = tot;
    if (e > 0 && t > 0 && !tot) finalTotal = e * t;
    
    if (p > 0 && finalTotal > 0) {
      return finalTotal - p;
    }
    return 0;
  };

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const path = `users/${user.uid}/loans`;
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));

    const snapshotPath = `users/${user.uid}/meta/financialSnapshot`;
    const unsubSnapshot = onSnapshot(doc(db, snapshotPath), (docSnap) => {
      if (docSnap.exists()) {
        setSnapshot(docSnap.data() as FinancialSnapshot);
      }
    });

    const transactionsPath = `users/${user.uid}/transactions`;
    const unsubTransactions = onSnapshot(query(collection(db, transactionsPath)), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
      setTransactions(docs);
    });

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Loan[];
      setLoans(docs);
      setLoading(false);
    }, (err) => {
      console.error("Firestore snapshot error:", err);
      handleFirestoreError(err, OperationType.LIST, path, user);
      setLoading(false);
    });

    // Fetch ignored suggestions
    const metaPath = `users/${user.uid}/meta/loanSettings`;
    const unsubMeta = onSnapshot(doc(db, metaPath), (docSnap) => {
      if (docSnap.exists()) {
        setIgnoredIds(docSnap.data().ignoredSuggestions || []);
      }
    });

    return () => {
      unsubscribe();
      unsubSnapshot();
      unsubTransactions();
      unsubMeta();
    };
  }, [user?.uid]);

  // Run detection logic
  useEffect(() => {
    if (transactions.length > 0) {
      const detected = detectLoanSuggestions(transactions, loans, ignoredIds);
      setSuggestions(detected);
    }
  }, [transactions, loans, ignoredIds]);

  const handleIgnoreSuggestion = async (suggestionId: string) => {
    if (!user?.uid) return;
    try {
      const metaPath = `users/${user.uid}/meta/loanSettings`;
      const docRef = doc(db, metaPath);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          ignoredSuggestions: arrayUnion(suggestionId)
        });
      } else {
        await setDoc(docRef, {
          ignoredSuggestions: [suggestionId]
        });
      }
    } catch (err) {
      console.error("Failed to ignore suggestion:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    setError(null);
    setSubmitting(true);

    try {
      const numPrincipal = parseFloat(principalAmount) || 0;
      const numInterestRate = parseFloat(interestRate) || 0;
      const numTenure = parseFloat(tenureMonths) || 0;
      const numPaid = parseFloat(paidMonths) || 0;
      const numEmi = parseFloat(emi) || 0;
      const numTotal = parseFloat(totalAmount) || 0;

      if (!name) throw new Error("Loan name is required");
      if (!lenderName) throw new Error("Lender name is required");
      if (numPrincipal <= 0) throw new Error("Principal amount must be greater than 0");
      if (numInterestRate <= 0) throw new Error("Interest rate must be greater than 0");
      if (numTenure <= 0) throw new Error("Tenure must be greater than 0");

      const numInterest = numTotal - numPrincipal;
      const numRemaining = numTotal - (numEmi * numPaid);

      const loanData: Omit<Loan, 'id' | 'timestamp'> = {
        name,
        lenderName,
        principalAmount: numPrincipal,
        interestRate: numInterestRate,
        tenureMonths: numTenure,
        paidMonths: numPaid,
        totalAmount: numTotal,
        totalInterest: numInterest,
        emi: numEmi,
        remainingAmount: Math.max(0, numRemaining),
        startDate,
        nextEmiDate,
        endDate,
        status: (numPaid >= numTenure) ? 'completed' : 'active',
        dataSource: currentDetectionSource
      };

      await addLoan(user.uid, loanData);

      // Reset form
      setName('');
      setLenderName('');
      setPrincipalAmount('');
      setInterestRate('');
      setTenureMonths('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setPaidMonths('0');
      setTotalAmount('');
      setEmi('');
      setNextEmiDate('');
      setEndDate('');
      setCurrentDetectionSource('manual');
      setIsAddModalOpen(false);
      toast.success("Loan added successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to process loan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (l: Loan) => {
    setSelectedLoan(l);
    setEditName(l.name);
    setEditLenderName(l.lenderName || '');
    setEditPrincipalAmount(l.principalAmount?.toString() || '');
    setEditInterestRate(l.interestRate?.toString() || '');
    setEditTenureMonths(l.tenureMonths?.toString() || '');
    setEditStartDate(l.startDate || '');
    setEditPaidMonths(l.paidMonths?.toString() || '0');
    setEditTotalAmount(l.totalAmount.toString());
    setEditEmi(l.emi.toString());
    setEditNextEmiDate(l.nextEmiDate || '');
    setEditEndDate(l.endDate);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !selectedLoan) return;

    setEditError(null);
    setEditSubmitting(true);

    try {
      const numPrincipal = parseFloat(editPrincipalAmount) || 0;
      const numInterestRate = parseFloat(editInterestRate) || 0;
      const numTenure = parseFloat(editTenureMonths) || 0;
      const numPaid = parseFloat(editPaidMonths) || 0;
      const numEmi = parseFloat(editEmi) || 0;
      const numTotal = parseFloat(editTotalAmount) || 0;

      if (!editName) throw new Error("Loan name is required");
      if (!editLenderName) throw new Error("Lender name is required");
      if (numPrincipal <= 0) throw new Error("Principal amount must be greater than 0");
      if (numInterestRate <= 0) throw new Error("Interest rate must be greater than 0");
      if (numTenure <= 0) throw new Error("Tenure must be greater than 0");

      const numInterest = numTotal - numPrincipal;
      const numRemaining = numTotal - (numEmi * numPaid);

      const loanData: Partial<Loan> = {
        name: editName,
        lenderName: editLenderName,
        principalAmount: numPrincipal,
        interestRate: numInterestRate,
        tenureMonths: numTenure,
        paidMonths: numPaid,
        totalAmount: numTotal,
        totalInterest: numInterest,
        emi: numEmi,
        remainingAmount: Math.max(0, numRemaining),
        startDate: editStartDate,
        nextEmiDate: editNextEmiDate,
        endDate: editEndDate,
        status: (numPaid >= numTenure) ? 'completed' : 'active'
      };

      await updateLoan(user.uid, selectedLoan.id!, loanData);
      setIsEditModalOpen(false);
      setSelectedLoan(null);
    } catch (err: any) {
      setEditError(err.message || "Failed to update loan");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleMarkPaid = async (l: Loan) => {
    if (!user?.uid || !l.id) return;
    if (l.paidMonths >= l.tenureMonths) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const newPaidMonths = l.paidMonths + 1;
      const newRemaining = Math.max(0, l.remainingAmount - l.emi);
      const isCompleted = newPaidMonths >= l.tenureMonths;
      
      let nextDateStr = l.nextEmiDate;
      if (l.nextEmiDate) {
        const nextDate = new Date(l.nextEmiDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDateStr = nextDate.toISOString().split('T')[0];
      }

      await updateLoan(user.uid, l.id, {
        paidMonths: newPaidMonths,
        remainingAmount: newRemaining,
        nextEmiDate: nextDateStr,
        lastPaidDate: today,
        status: isCompleted ? 'completed' : 'active'
      });
    } catch (err: any) {
      setError(err.message || "Failed to update loan progress");
    }
  };
  const handleDelete = async (id: string) => {
    if (!user?.uid) return;
    try {
      await deleteLoan(user.uid, id);
      setDeleteConfirmId(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete loan");
    }
  };

  const isEndingSoon = (endDateStr: string) => {
    if (!endDateStr) return false;
    const end = new Date(endDateStr);
    const now = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(now.getMonth() + 6);
    return end > now && end <= sixMonthsFromNow;
  };

  const getTimeLeft = (endDateStr: string) => {
    if (!endDateStr) return 'N/A';
    const end = new Date(endDateStr);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Completed';
    if (diffDays < 30) return `${diffDays} days left`;
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    return months > 12 
      ? `${Math.floor(months / 12)}y ${months % 12}m left`
      : `${months}m ${remainingDays}d left`;
  };

  const currencyConfig = CURRENCIES.find(c => c.code === (userProfile?.currency || DEFAULT_CURRENCY)) || CURRENCIES[0];
  const currencySymbol = currencyConfig.symbol;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const totalEMI = calculateTotalEMI(loans);
  const monthlyIncome = calculateMonthlyIncome(transactions);
  const health = calculateLoanHealth(monthlyIncome, totalEMI, loans.filter(l => l.status === 'active').length);

  const getHealthUI = () => {
    switch (health.status) {
      case 'Critical':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-100',
          icon: <ShieldAlert className="w-6 h-6 text-red-600" />
        };
      case 'Risky':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-100',
          icon: <AlertCircle className="w-6 h-6 text-orange-600" />
        };
      default:
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-100',
          icon: <CheckCircle className="w-6 h-6 text-green-600" />
        };
    }
  };

  const healthUI = getHealthUI();

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto w-full px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-[70px] w-48 rounded-2xl" />
        </div>
        <Skeleton className="h-[120px] w-full rounded-[2rem] mb-10" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full overflow-x-hidden max-w-full">
      <div className="space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Loan Management</h1>
            <p className="mt-2 text-gray-600 font-medium">Track your EMIs and debt reduction progress.</p>
          </div>
          <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-indigo-100 flex items-center space-x-3">
            <TrendingDown className="w-6 h-6" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Total Monthly EMI</p>
              <p className="text-xl font-black">
                <CurrencyDisplay value={totalEMI} />
              </p>
            </div>
          </div>
        </div>

        {/* Debt Freedom Score */}
        <div className={`${healthUI.bgColor} ${healthUI.borderColor} border p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-black/5`}>
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100`}>
              {healthUI.icon}
            </div>
            <div>
              <p className={`text-lg font-black ${healthUI.color} leading-tight`}>
                Loan Health: {health.label}
              </p>
              <p className="text-sm font-bold text-gray-500 mt-1">
                Your total debt burden is {health.score}% optimized based on your income of <CurrencyDisplay value={monthlyIncome} />.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="text-center md:text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Stability Score</p>
              <p className={`text-3xl font-black ${healthUI.color}`}>
                {health.score}/100
              </p>
            </div>
          </div>
        </div>

        {/* EMI Reminders & Smart Detection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reminders */}
          {loans.filter(l => l.status === 'active' && l.nextEmiDate).map(loan => {
            const nextDate = new Date(loan.nextEmiDate!);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffTime = nextDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 3 && diffDays > 0) {
              return (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={`rem-${loan.id}`}
                  className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start space-x-4 shadow-lg shadow-amber-900/5 group"
                >
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-600 group-hover:rotate-12 transition-transform">
                    <Bell className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="text-amber-900 font-black">Upcoming EMI: {loan.name}</p>
                    <p className="text-amber-700 text-sm font-bold mt-1">Due in {diffDays} days ({loan.nextEmiDate})</p>
                    <div className="flex space-x-3 mt-4">
                      <button 
                        onClick={() => handleMarkPaid(loan)}
                        className="text-[10px] font-black uppercase tracking-widest bg-amber-600 text-white px-4 py-2 rounded-xl hover:bg-amber-700 transition-all active:scale-95 shadow-md"
                      >
                        Mark as Paid
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            } else if (diffDays <= 0) {
               return (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={`rem-${loan.id}`}
                  className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-start space-x-4 shadow-lg shadow-red-900/5"
                >
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-red-600">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-red-900 font-black">EMI Missed: {loan.name}</p>
                    <p className="text-red-700 text-sm font-bold mt-1">Your EMI due on {loan.nextEmiDate} was missed.</p>
                    <div className="flex space-x-3 mt-4">
                      <button 
                        onClick={() => handleMarkPaid(loan)}
                        className="text-[10px] font-black uppercase tracking-widest bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors"
                      >
                        Paid Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            }
            return null;
          })}

          {/* Smart EMI Detection */}
          {suggestions.slice(0, 3).map(suggestion => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={`detect-${suggestion.id}`}
              className="bg-white p-6 rounded-3xl flex items-start space-x-4 shadow-xl shadow-black/5 border border-indigo-100 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleIgnoreSuggestion(suggestion.id)}
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                  title="Don't suggest this again"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="font-black text-lg text-gray-900">Loan Identified</p>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
                    suggestion.confidence === 'high' ? 'bg-green-100 text-green-700' : 
                    suggestion.confidence === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {suggestion.confidence} Confidence ({suggestion.score})
                  </span>
                </div>
                <p className="text-gray-600 text-sm font-medium line-clamp-2 leading-relaxed">
                  Detected <span className="font-bold text-gray-900">{suggestion.frequency}</span> monthly payments to <span className="font-bold text-indigo-600">"{suggestion.merchant}"</span> for <CurrencyDisplay value={suggestion.amount} />.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button 
                    onClick={() => {
                       setName(`${suggestion.merchant} Loan`);
                       setLenderName(suggestion.merchant);
                       setEmi(suggestion.amount.toString());
                       // Task 6: Pre-fill principal if we can estimate it (e.g. EMI * 12 as placeholder)
                       setPrincipalAmount((suggestion.amount * 12).toString());
                       setTenureMonths('12');
                       setInterestRate('10'); // Default interest rate
                       setCurrentDetectionSource('sms'); 
                       setIsAddModalOpen(true);
                       toast.success("Form pre-filled! Please verify details.");
                    }}
                    className="text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                  >
                    Add as Loan
                  </button>
                  <button 
                    onClick={() => handleIgnoreSuggestion(suggestion.id)}
                    className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-4 py-2 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100"
                  >
                    Not a Loan
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Existing Loans Header */}
        <div className="flex items-center justify-between mt-8">
          <h2 className="text-2xl font-black text-gray-900">Your Loans</h2>
          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            {loans.length} active
          </span>
        </div>

        {/* Empty State */}
        {loans.length === 0 && !loading && (
          <EmptyState
            icon={Building2}
            title="No loans added yet"
            description="Keep track of your active loans, EMIs, and debt progress in one place. We'll automatically identify loans from your SMS if you sync."
            actionLabel="Add Your First Loan"
            onAction={() => setIsAddModalOpen(true)}
          />
        )}

        {/* Add Loan Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Loan"
        >
          <div className="p-1">
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <p className="text-sm text-red-700 font-bold">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Loan Name</label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Home Loan, Car Loan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Lender Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC, SBI"
                      value={lenderName}
                      onChange={(e) => setLenderName(e.target.value)}
                      className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Principal Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-gray-400 font-black">{currencySymbol}</span>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={principalAmount}
                      onChange={(e) => setPrincipalAmount(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Interest Rate (%)</label>
                  <div className="relative">
                    <Percent className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="10.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Tenure (Months)</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      required
                      placeholder="12"
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(e.target.value)}
                      className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Months Already Paid</label>
                  <div className="relative">
                    <CheckCircle className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      placeholder="0"
                      value={paidMonths}
                      onChange={(e) => setPaidMonths(e.target.value)}
                      className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Monthly EMI (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-gray-400 font-black">{currencySymbol}</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={emi}
                      onChange={(e) => {
                        setEmi(e.target.value);
                        if (e.target.value) setTotalAmount('');
                      }}
                      className="block w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 text-lg font-black uppercase tracking-widest"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Loan...
                    </>
                  ) : (
                    'Add Loan'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </Modal>

        {/* FAB Button and Menu */}
        {/* FAB System */}
        <AnimatePresence>
          {!isAddModalOpen && !isEditModalOpen && !isSimModalOpen && (
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
                    Add Loan
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isFabMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 min-w-[200px] overflow-hidden mb-4"
                  >
                    <div className="p-3 border-b border-gray-50 mb-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quick Actions</p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsAddModalOpen(true);
                        setIsFabMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 p-4 hover:bg-indigo-50 rounded-2xl transition-colors group"
                    >
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-white shadow-sm">
                        <PlusCircle className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-gray-700">Add New Loan</span>
                    </button>
                    <button 
                      className="w-full flex items-center space-x-3 p-4 hover:bg-indigo-50 rounded-2xl transition-colors group opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-white shadow-sm">
                        <Zap className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-gray-700">Detect Loans (Auto)</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.button
                onClick={() => {
                  setIsFabMenuOpen(!isFabMenuOpen);
                  setShowTooltip(false);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform ${
                  isFabMenuOpen ? 'bg-gray-800 rotate-45' : 'bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-indigo-200'
                }`}
              >
                <PlusCircle className="w-8 h-8" />
              </motion.button>

              {/* Overlay to close menu */}
              {isFabMenuOpen && (
                <div 
                  className="fixed inset-0 z-[-1]" 
                  onClick={() => setIsFabMenuOpen(false)} 
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Updated Loan Grid */}
        {loans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
              {loans.map((l) => {
                const remainingMonths = l.tenureMonths - l.paidMonths;
                const progress = (l.paidMonths / l.tenureMonths) * 100;
                
                // Early closure simulation (10% extra)
                const extraPayment = l.emi * 0.1;
                const newMonths = Math.ceil(l.remainingAmount / (l.emi + extraPayment));
                const monthsSaved = remainingMonths - newMonths;
                
                let urgencyTag = "Long term";
                let urgencyColor = "bg-gray-500";
                if (remainingMonths < 6) {
                  urgencyTag = "Ending soon";
                  urgencyColor = "bg-[#6334FD]";
                } else if (remainingMonths < 18) {
                  urgencyTag = "Midway";
                  urgencyColor = "bg-indigo-500";
                }
                
                return (
                  <div 
                    key={l.id} 
                    className={`bg-white rounded-[2rem] p-8 shadow-xl shadow-black/5 border transition-all group relative overflow-hidden flex flex-col min-h-[420px] ${
                      l.status === 'completed' ? 'border-green-100 opacity-80' : 
                      remainingMonths < 6 ? 'border-[#6334FD]/20 ring-4 ring-[#6334FD]/5' : 'border-gray-50 hover:border-indigo-100'
                    }`}
                  >
                    {l.status === 'completed' && (
                      <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest flex items-center space-x-1 z-10">
                        <CheckCircle className="w-3 h-3" />
                        <span>Completed</span>
                      </div>
                    )}
                    {l.status === 'active' && (
                      <div className={`absolute top-0 right-0 ${urgencyColor} text-white px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest flex items-center space-x-1 z-10`}>
                        <Clock className="w-3 h-3" />
                        <span>{urgencyTag}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-8">
                      <div className="min-w-0">
                        <h3 className="text-2xl font-black text-gray-900 mb-1 truncate">{l.name}</h3>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{l.lenderName || 'Unknown Lender'}</p>
                        <div className="flex items-center space-x-2 text-gray-400 min-w-0">
                          <TrendingDown className="w-4 h-4 shrink-0" />
                          <span className="text-sm font-bold truncate">Total: <CurrencyDisplay value={l.totalAmount} /></span>
                        </div>
                      </div>
                      <div className="flex space-x-1 sm:space-x-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => {
                            setSimLoan(l);
                            setIsSimModalOpen(true);
                          }}
                          className="p-2 md:p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all active:scale-[0.98] duration-150"
                          title="Simulate Prepayment"
                        >
                          <Zap className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(l)}
                          className="p-2 md:p-2.5 bg-gray-50 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-[0.98] duration-150"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(l.id || null)}
                          className="p-2 md:p-2.5 bg-gray-50 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-[0.98] duration-150"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:gap-8 mb-8">
                       <div className="min-w-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 truncate">Monthly EMI</p>
                        <p className="text-xl md:text-2xl font-black text-indigo-600 truncate"><CurrencyDisplay value={l.emi} /></p>
                      </div>
                      <div className="text-right min-w-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 truncate">Remaining</p>
                        <p className="text-base md:text-lg font-black text-gray-900 truncate">{remainingMonths} Months</p>
                      </div>
                    </div>

                    <div className="mt-auto space-y-6">
                      {l.status === 'active' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col justify-center">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Interest Saved</p>
                            <p className="text-sm font-bold text-indigo-900"><CurrencyDisplay value={extraPayment * remainingMonths * 0.5} />*</p>
                          </div>
                          <div className="p-3 bg-green-50/50 rounded-2xl border border-green-100 flex flex-col justify-center">
                            <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">Months To Save</p>
                            <p className="text-sm font-bold text-green-900">{monthsSaved} Months</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Repayment Breakdown</p>
                           <Info className="w-3 h-3 text-gray-300" />
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
                           <div 
                              className="h-full bg-indigo-600"
                              style={{ width: `${(getLoanBreakdown(l.principalAmount, l.interestRate, l.tenureMonths, l.paidMonths).principalPaid / l.totalAmount) * 100}%` }}
                           />
                           <div 
                              className="h-full bg-orange-400"
                              style={{ width: `${(getLoanBreakdown(l.principalAmount, l.interestRate, l.tenureMonths, l.paidMonths).interestPaid / l.totalAmount) * 100}%` }}
                           />
                        </div>
                        <div className="flex justify-between mt-2">
                           <span className="text-[9px] font-black text-indigo-600 uppercase">Principal Paid</span>
                           <span className="text-[9px] font-black text-orange-400 uppercase">Interest Paid</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 truncate">Balance</p>
                            <p className="text-xl font-black text-gray-900 truncate"><CurrencyDisplay value={l.remainingAmount} /></p>
                          </div>
                          <p className="text-sm font-black text-indigo-600 shrink-0">{Math.round(progress)}% Paid</p>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {l.status === 'active' && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleMarkPaid(l)}
                            variant="secondary"
                            fullWidth
                            size="md"
                            icon={<CheckCircle className="w-4 h-4" />}
                          >
                            Mark EMI Paid
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

{/* Edit Loan Modal */}
<Modal
  isOpen={isEditModalOpen}
  onClose={() => setIsEditModalOpen(false)}
  title="Edit Loan Details"
  maxWidth="max-w-4xl"
>
        {editError && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <p className="text-sm text-red-700 font-bold">{editError}</p>
          </div>
        )}

        <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Loan Name</label>
            <div className="relative">
              <Wallet className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                required
                placeholder="e.g. Home Loan, Car Loan"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Lender Name</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                required
                placeholder="HDFC, SBI"
                value={editLenderName}
                onChange={(e) => setEditLenderName(e.target.value)}
                className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Principal Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-400 font-black">{currencySymbol}</span>
              <input
                type="number"
                required
                placeholder="0"
                value={editPrincipalAmount}
                onChange={(e) => setEditPrincipalAmount(e.target.value)}
                className="block w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Interest Rate (%)</label>
            <div className="relative">
              <Percent className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="number"
                step="0.01"
                required
                placeholder="10.5"
                value={editInterestRate}
                onChange={(e) => setEditInterestRate(e.target.value)}
                className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Tenure (Months)</label>
            <div className="relative">
              <Clock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="number"
                required
                placeholder="12"
                value={editTenureMonths}
                onChange={(e) => setEditTenureMonths(e.target.value)}
                className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="date"
                required
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Months Paid</label>
            <div className="relative">
              <CheckCircle className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="number"
                required
                placeholder="0"
                value={editPaidMonths}
                onChange={(e) => setEditPaidMonths(e.target.value)}
                className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
              />
            </div>
          </div>

          <div className="md:col-span-3 grid grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-2xl">
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Monthly EMI</p>
              <p className="text-xl font-black text-indigo-900"><CurrencyDisplay value={parseFloat(editEmi) || 0} /></p>
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Payable</p>
              <p className="text-xl font-black text-indigo-900"><CurrencyDisplay value={parseFloat(editTotalAmount) || 0} /></p>
            </div>
          </div>

          <div className="md:col-span-3 flex space-x-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              fullWidth
              size="lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={editSubmitting}
              fullWidth
              size="lg"
              icon={<Save className="w-6 h-6 mr-2" />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Prepayment Simulator Modal */}
      <Modal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        title="Prepayment Simulator"
        maxWidth="max-w-2xl"
      >
        {simLoan && (
          <div className="space-y-8">
            <div className="flex items-center space-x-4 p-4 bg-indigo-50 rounded-3xl">
              <div className="p-3 bg-white rounded-2xl shadow-sm">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">{simLoan.name}</h3>
                <p className="text-sm font-bold text-gray-500">Balance: <CurrencyDisplay value={simLoan.remainingAmount} /></p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Extra Prepayment Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-400 font-black">{currencySymbol}</span>
                <input
                  type="number"
                  placeholder="Enter amount to pay today"
                  value={prepaymentAmount}
                  onChange={(e) => setPrepaymentAmount(e.target.value)}
                  className="block w-full pl-10 pr-4 py-4 border-2 border-indigo-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-xl font-black transition-all"
                />
              </div>
            </div>

            {parseFloat(prepaymentAmount) > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom duration-500">
                <div className="p-6 bg-green-50 rounded-3xl border border-green-100">
                  <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">Interest Saved</p>
                  <p className="text-3xl font-black text-green-600">
                    <CurrencyDisplay value={simulatePrepayment(simLoan.principalAmount, simLoan.interestRate, simLoan.tenureMonths, simLoan.paidMonths, parseFloat(prepaymentAmount)).interestSaved} />
                  </p>
                  <p className="text-xs font-bold text-green-700 mt-2 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Instant growth for your net worth
                  </p>
                </div>
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Months Saved</p>
                  <p className="text-3xl font-black text-blue-600">
                    {simulatePrepayment(simLoan.principalAmount, simLoan.interestRate, simLoan.tenureMonths, simLoan.paidMonths, parseFloat(prepaymentAmount)).tenureSaved}
                  </p>
                  <p className="text-xs font-bold text-blue-700 mt-2 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Debt-free {simulatePrepayment(simLoan.principalAmount, simLoan.interestRate, simLoan.tenureMonths, simLoan.paidMonths, parseFloat(prepaymentAmount)).tenureSaved} months early
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-xs font-bold text-gray-500 leading-relaxed italic">
                * Based on current principal and interest rate. Actual bank terms may vary. Prepayment reduces principal directly, leading to significant interest saving over time.
              </p>
            </div>

            <Button
              onClick={() => setIsSimModalOpen(false)}
              fullWidth
              size="lg"
            >
              Close Simulator
            </Button>
          </div>
        )}
      </Modal>


      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center space-x-5 text-red-600 mb-8">
              <div className="p-4 bg-red-50 rounded-2xl">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-black tracking-tight">Delete Loan?</h3>
            </div>
            <p className="text-gray-500 text-lg font-medium mb-10 leading-relaxed">
              Are you sure you want to remove this loan? This will also remove its EMI from your monthly expense calculations.
            </p>
            <div className="flex space-x-4">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirmId(null)}
                fullWidth
                size="lg"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                fullWidth
                size="lg"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

export default Loans;
