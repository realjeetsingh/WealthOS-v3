import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { addTransaction } from '../services/financeService';
import { Transaction } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
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
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link 
          to="/dashboard" 
          className="text-indigo-600 hover:text-indigo-500 flex items-center text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Transactions</h1>
          <p className="mt-2 text-gray-600">Manage your income and expenses securely.</p>
        </div>

        {/* Add Transaction Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <PlusCircle className="w-5 h-5 mr-2 text-indigo-600" />
            Add New Transaction
          </h2>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all flex items-center justify-center ${
                      type === 'expense' 
                        ? 'bg-red-50 border-red-200 text-red-700 ring-2 ring-red-100' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ArrowDownCircle className="w-4 h-4 mr-2" />
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all flex items-center justify-center ${
                      type === 'income' 
                        ? 'bg-green-50 border-green-200 text-green-700 ring-2 ring-green-100' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Income
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="block w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Food, Salary, Rent"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Add a note..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <PlusCircle className="w-5 h-5 mr-2" />}
                Add Transaction
              </button>
            </div>
          </form>
        </div>

        {/* Transaction List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
              <p className="text-gray-500">No transactions yet. Start by adding one above!</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {transactions.map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {t.type === 'income' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{t.category}</p>
                        <p className="text-sm text-gray-500">{t.notes || 'No notes'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
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
