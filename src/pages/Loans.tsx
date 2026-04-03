import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { addLoan, updateLoan, deleteLoan } from '../services/financeService';
import { Loan, FinancialSnapshot, Transaction } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { formatCurrency, formatCurrencyShort } from '../lib/formatCurrency';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { CURRENCIES, DEFAULT_CURRENCY } from '../lib/currency';
import { calculateTotalEMI, calculateMonthlyIncome } from '../lib/financialEngine';
import Modal from '../components/Modal';
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
  Save
} from 'lucide-react';

const Loans: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [paidMonths, setPaidMonths] = useState('0');
  const [totalAmount, setTotalAmount] = useState('');
  const [emi, setEmi] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrincipalAmount, setEditPrincipalAmount] = useState('');
  const [editTenureMonths, setEditTenureMonths] = useState('');
  const [editPaidMonths, setEditPaidMonths] = useState('0');
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [editEmi, setEditEmi] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Auto-calculations for UI feedback
  useEffect(() => {
    const p = parseFloat(principalAmount) || 0;
    const t = parseFloat(tenureMonths) || 0;
    const e = parseFloat(emi) || 0;
    const tot = parseFloat(totalAmount) || 0;

    if (p > 0 && t > 0) {
      if (e > 0 && !totalAmount) {
        setTotalAmount((e * t).toFixed(2));
      } else if (tot > 0 && !emi) {
        setEmi((tot / t).toFixed(2));
      }
    }
  }, [principalAmount, tenureMonths, emi, totalAmount]);

  // Auto-calculations for Edit Modal
  useEffect(() => {
    const p = parseFloat(editPrincipalAmount) || 0;
    const t = parseFloat(editTenureMonths) || 0;
    const e = parseFloat(editEmi) || 0;
    const tot = parseFloat(editTotalAmount) || 0;

    if (p > 0 && t > 0) {
      if (e > 0 && !editTotalAmount) {
        setEditTotalAmount((e * t).toFixed(2));
      } else if (tot > 0 && !editEmi) {
        setEditEmi((tot / t).toFixed(2));
      }
    }
  }, [editPrincipalAmount, editTenureMonths, editEmi, editTotalAmount]);

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

    return () => {
      unsubscribe();
      unsubSnapshot();
      unsubTransactions();
    };
  }, [user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    setError(null);
    setSubmitting(true);

    try {
      const numPrincipal = parseFloat(principalAmount) || 0;
      const numTenure = parseFloat(tenureMonths) || 0;
      const numPaid = parseFloat(paidMonths) || 0;
      let numEmi = parseFloat(emi) || 0;
      let numTotal = parseFloat(totalAmount) || 0;

      if (!name) throw new Error("Loan name is required");
      if (numPrincipal <= 0) throw new Error("Principal amount must be greater than 0");
      if (numTenure <= 0) throw new Error("Tenure must be greater than 0");
      if (numEmi <= 0 && numTotal <= 0) throw new Error("Please enter either Monthly EMI or Total Payable amount");

      // Auto-calculation logic
      if (numEmi > 0) {
        numTotal = numEmi * numTenure;
      } else if (numTotal > 0) {
        numEmi = numTotal / numTenure;
      }

      const numInterest = numTotal - numPrincipal;
      const numRemaining = numTotal - (numEmi * numPaid);

      const loanData: Omit<Loan, 'id' | 'timestamp'> = {
        name,
        principalAmount: numPrincipal,
        tenureMonths: numTenure,
        paidMonths: numPaid,
        totalAmount: numTotal,
        totalInterest: numInterest,
        emi: numEmi,
        remainingAmount: Math.max(0, numRemaining),
        endDate,
        status: (numPaid >= numTenure) ? 'completed' : 'active'
      };

      await addLoan(user.uid, loanData);

      // Reset form
      setName('');
      setPrincipalAmount('');
      setTenureMonths('');
      setPaidMonths('0');
      setTotalAmount('');
      setEmi('');
      setEndDate('');
    } catch (err: any) {
      setError(err.message || "Failed to process loan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (l: Loan) => {
    setSelectedLoan(l);
    setEditName(l.name);
    setEditPrincipalAmount(l.principalAmount?.toString() || '');
    setEditTenureMonths(l.tenureMonths?.toString() || '');
    setEditPaidMonths(l.paidMonths?.toString() || '0');
    setEditTotalAmount(l.totalAmount.toString());
    setEditEmi(l.emi.toString());
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
      const numTenure = parseFloat(editTenureMonths) || 0;
      const numPaid = parseFloat(editPaidMonths) || 0;
      let numEmi = parseFloat(editEmi) || 0;
      let numTotal = parseFloat(editTotalAmount) || 0;

      if (!editName) throw new Error("Loan name is required");
      if (numPrincipal <= 0) throw new Error("Principal amount must be greater than 0");
      if (numTenure <= 0) throw new Error("Tenure must be greater than 0");
      if (numEmi <= 0 && numTotal <= 0) throw new Error("Please enter either Monthly EMI or Total Payable amount");

      // Auto-calculation logic
      if (numEmi > 0) {
        numTotal = numEmi * numTenure;
      } else if (numTotal > 0) {
        numEmi = numTotal / numTenure;
      }

      const numInterest = numTotal - numPrincipal;
      const numRemaining = numTotal - (numEmi * numPaid);

      const loanData: Partial<Loan> = {
        name: editName,
        principalAmount: numPrincipal,
        tenureMonths: numTenure,
        paidMonths: numPaid,
        totalAmount: numTotal,
        totalInterest: numInterest,
        emi: numEmi,
        remainingAmount: Math.max(0, numRemaining),
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
      const newPaidMonths = l.paidMonths + 1;
      const newRemaining = Math.max(0, l.remainingAmount - l.emi);
      const isCompleted = newPaidMonths >= l.tenureMonths;

      await updateLoan(user.uid, l.id, {
        paidMonths: newPaidMonths,
        remainingAmount: newRemaining,
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
  const emiRatio = monthlyIncome > 0 ? (totalEMI / monthlyIncome) * 100 : 0;

  const getPressureMessage = () => {
    if (emiRatio > 40) {
      return {
        text: `High EMI burden: ${formatCurrencyShort(totalEMI)}/month is limiting your financial growth`,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-100',
        icon: <ShieldAlert className="w-6 h-6 text-red-600" />
      };
    } else if (emiRatio >= 20) {
      return {
        text: `${formatCurrencyShort(totalEMI)}/month in EMIs is reducing your savings potential`,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-100',
        icon: <AlertCircle className="w-6 h-6 text-amber-600" />
      };
    } else {
      return {
        text: "Your EMI load is manageable, but can still be optimized",
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-100',
        icon: <Zap className="w-6 h-6 text-indigo-600" />
      };
    }
  };

  const pressure = getPressureMessage();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
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

        {/* Loan Pressure Trigger System */}
        <div className={`${pressure.bgColor} ${pressure.borderColor} border-2 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm`}>
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-2xl bg-white shadow-sm`}>
              {pressure.icon}
            </div>
            <div>
              <p className={`text-lg font-black ${pressure.color} leading-tight`}>
                {pressure.text}
              </p>
              {monthlyIncome > 0 && (
                <p className="text-xs font-bold text-gray-500 mt-1">
                  EMIs consume <span className="text-gray-900">{emiRatio.toFixed(1)}%</span> of your monthly income. Reducing this can increase your monthly savings by <span className="text-gray-900"><CurrencyDisplay value={totalEMI} /></span>.
                </p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="text-center md:text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Debt Freedom Score</p>
              <p className={`text-3xl font-black ${emiRatio > 40 ? 'text-red-600' : emiRatio > 20 ? 'text-amber-600' : 'text-green-600'}`}>
                {Math.max(0, 100 - Math.round(emiRatio))}%
              </p>
            </div>
          </div>
        </div>

        {/* Add Loan Form */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50" />
          
          <h2 className="text-2xl font-black text-gray-900 mb-8 flex items-center relative z-10">
            <PlusCircle className="w-7 h-7 mr-3 text-indigo-600" />
            Add New Loan
          </h2>

          {error && (
            <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start space-x-3 animate-in slide-in-from-left duration-300">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <p className="text-sm text-red-700 font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
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

            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Total Payable (Optional)</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-400 font-black">{currencySymbol}</span>
                <input
                  type="number"
                  placeholder="0"
                  value={totalAmount}
                  onChange={(e) => {
                    setTotalAmount(e.target.value);
                    if (e.target.value) setEmi('');
                  }}
                  className="block w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">End Date (Optional)</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <p className="text-xs font-bold text-gray-400 italic">
                * Enter any 3 values (Principal, Tenure, and either EMI or Total Payable), we'll calculate the rest.
              </p>
            </div>

            <div className="md:col-span-3 grid grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-2xl">
              <div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Interest</p>
                <p className="text-xl font-black text-indigo-900"><CurrencyDisplay value={calculatedInterest(principalAmount, tenureMonths, emi, totalAmount)} /></p>
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Payable</p>
                <p className="text-xl font-black text-indigo-900"><CurrencyDisplay value={parseFloat(totalAmount) || 0} /></p>
              </div>
            </div>

            <div className="md:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full text-white py-4 px-4 rounded-2xl font-black text-lg transition-all disabled:opacity-50 flex items-center justify-center shadow-xl bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
              >
                {submitting ? (
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                ) : (
                  <PlusCircle className="w-6 h-6 mr-2" />
                )}
                Add Loan
              </button>
            </div>
          </form>
        </div>

        {/* Loans Grid */}
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Active Loans</h2>
              <p className="text-sm font-bold text-indigo-600">
                {loans.filter(l => l.status === 'active').length} Active • {loans.filter(l => l.status === 'completed').length} Completed
              </p>
            </div>
          </div>
          {loans.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
              <Wallet className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-bold text-lg">No active loans found. Add one to start tracking!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                  urgencyColor = "bg-amber-500";
                } else if (remainingMonths < 18) {
                  urgencyTag = "Midway";
                  urgencyColor = "bg-indigo-500";
                }
                
                return (
                  <div 
                    key={l.id} 
                    className={`bg-white rounded-3xl p-8 shadow-xl border-2 transition-all group relative overflow-hidden ${
                      l.status === 'completed' ? 'border-green-100 opacity-80' : 
                      remainingMonths < 6 ? 'border-amber-200 ring-4 ring-amber-50' : 'border-gray-50 hover:border-indigo-100'
                    }`}
                  >
                    {l.status === 'completed' && (
                      <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Completed</span>
                      </div>
                    )}
                    {l.status === 'active' && (
                      <div className={`absolute top-0 right-0 ${urgencyColor} text-white px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest flex items-center space-x-1`}>
                        <Clock className="w-3 h-3" />
                        <span>{urgencyTag}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 mb-1">{l.name}</h3>
                        <div className="flex items-center space-x-2 text-gray-400">
                          <TrendingDown className="w-4 h-4" />
                          <span className="text-sm font-bold">Total Payable: <CurrencyDisplay value={l.totalAmount} /></span>
                        </div>
                      </div>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(l)}
                          className="p-2.5 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(l.id || null)}
                          className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monthly EMI</p>
                        <p className="text-2xl font-black text-indigo-600"><CurrencyDisplay value={l.emi} /></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Remaining</p>
                        <p className="text-lg font-black text-gray-900">{remainingMonths} Months</p>
                        {l.status === 'active' && (
                          <p className="text-[10px] font-bold text-red-500 mt-1 italic">
                            You will stay in debt for {remainingMonths} more months
                          </p>
                        )}
                      </div>
                    </div>

                    {l.status === 'active' && monthsSaved > 0 && (
                      <div className="mb-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start space-x-3">
                        <TrendingDown className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs font-bold text-indigo-900 leading-relaxed">
                          You can close this loan <span className="text-indigo-600 underline decoration-2 underline-offset-2">{monthsSaved} months earlier</span> by paying <CurrencyDisplay value={extraPayment} /> extra monthly.
                        </p>
                      </div>
                    )}

                    <div className="space-y-3 mb-8">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Remaining Balance</p>
                          <p className="text-xl font-black text-gray-900"><CurrencyDisplay value={l.remainingAmount} /></p>
                        </div>
                        <p className="text-sm font-black text-indigo-600">{Math.round(progress)}% Paid</p>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {l.status === 'active' && (
                      <button
                        onClick={() => handleMarkPaid(l)}
                        className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Mark EMI Paid</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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

          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Monthly EMI (Optional)</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-400 font-black">{currencySymbol}</span>
              <input
                type="number"
                placeholder="0"
                value={editEmi}
                onChange={(e) => {
                  setEditEmi(e.target.value);
                  if (e.target.value) setEditTotalAmount('');
                }}
                className="block w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Total Payable (Optional)</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-400 font-black">{currencySymbol}</span>
              <input
                type="number"
                placeholder="0"
                value={editTotalAmount}
                onChange={(e) => {
                  setEditTotalAmount(e.target.value);
                  if (e.target.value) setEditEmi('');
                }}
                className="block w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">End Date (Optional)</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 text-base font-bold transition-all"
              />
            </div>
          </div>

          <div className="md:col-span-3 grid grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-2xl">
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Interest</p>
              <p className="text-xl font-black text-indigo-900"><CurrencyDisplay value={calculatedInterest(editPrincipalAmount, editTenureMonths, editEmi, editTotalAmount)} /></p>
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Payable</p>
              <p className="text-xl font-black text-indigo-900"><CurrencyDisplay value={parseFloat(editTotalAmount) || 0} /></p>
            </div>
          </div>

          <div className="md:col-span-3 flex space-x-4">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 py-4 px-4 rounded-2xl border-2 border-gray-100 font-black text-gray-400 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="flex-1 py-4 px-4 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center disabled:opacity-50"
            >
              {editSubmitting ? (
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
              ) : (
                <Save className="w-6 h-6 mr-2" />
              )}
              Save Changes
            </button>
          </div>
        </form>
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
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-4 px-4 rounded-2xl border-2 border-gray-100 font-black text-gray-400 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                className="flex-1 py-4 px-4 rounded-2xl bg-red-600 text-white font-black hover:bg-red-700 transition-all shadow-xl shadow-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;
