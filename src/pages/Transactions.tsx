import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { addTransaction } from '../services/financeService';
import { Transaction } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { formatCurrency } from '../lib/formatCurrency';
import { 
  PlusCircle, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Tag, 
  FileText, 
  Loader2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Transactions: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const path = `users/${user.uid}/transactions`;
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));

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

      await addTransaction(user.uid, {
        type,
        amount: numAmount,
        category,
        notes: notes.trim() || null
      });

      // Reset form
      setAmount('');
      setCategory('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || "Failed to add transaction");
    } finally {
      setSubmitting(false);
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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Transactions</h1>
          <p className="mt-2 text-gray-600">Manage your income and expenses securely.</p>
        </div>

        {/* Add Transaction Form */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center">
            <PlusCircle className="w-6 h-6 mr-3 text-[#4F46E5]" />
            Add New Transaction
          </h2>

          {error && (
            <div className="mb-8 bg-red-50 border-l-4 border-[#DC2626] p-4 rounded-lg flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-[#DC2626] mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Type</label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center ${
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
                    className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center ${
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
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 font-bold">₹</span>
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
                <div className="relative">
                  <Tag className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Food, Salary, Rent"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-[#4F46E5] text-base transition-all"
                  />
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
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#4F46E5] text-white py-4 px-4 rounded-xl font-bold text-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50 flex items-center justify-center shadow-md"
              >
                {submitting ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <PlusCircle className="w-6 h-6 mr-2" />}
                Add Transaction
              </button>
            </div>
          </form>
        </div>

        {/* Transaction List */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-500 text-lg">No transactions yet. Start by adding one above!</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {transactions.map((t) => (
                  <div key={t.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center space-x-5">
                      <div className={`p-3 rounded-xl ${t.type === 'income' ? 'bg-green-50 text-[#16A34A]' : 'bg-red-50 text-[#DC2626]'}`}>
                        {t.type === 'income' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{t.category}</p>
                        <p className="text-sm text-gray-500 font-medium">{t.notes || 'No notes'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${t.type === 'income' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </p>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
                        {t.timestamp?.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;
