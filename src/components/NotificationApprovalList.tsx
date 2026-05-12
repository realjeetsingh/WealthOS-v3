import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, X, Edit2, AlertCircle, TrendingUp, TrendingDown, Clock, ShieldCheck, Zap } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { DetectedTransaction, approveTransaction, ignoreTransaction, deleteDetectedTransaction } from '../services/notificationIntelligence';
import Button from './ui/Button';

const NotificationApprovalList: React.FC = () => {
  const [pendingTransactions, setPendingTransactions] = useState<DetectedTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, `users/${auth.currentUser.uid}/detected_transactions`),
      where('status', '==', 'pending'),
      orderBy('detectedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DetectedTransaction[];
      setPendingTransactions(txs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 text-center">
        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Clock className="w-6 h-6 text-gray-300" />
        </div>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">Scanning alerts...</p>
      </div>
    );
  }

  if (pendingTransactions.length === 0) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-12 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">Inbox Clean</h3>
        <p className="text-gray-500 font-medium max-w-xs mx-auto">No pending transactions detected. Your financial intelligence is up to date.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Zap className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Detected Alerts</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{pendingTransactions.length} Pending Approval</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {pendingTransactions.map((tx) => (
          <motion.div
            key={tx.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="group relative bg-white border border-gray-100 hover:border-indigo-200 rounded-[2rem] p-6 transition-all hover:bg-indigo-50/10 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 overflow-hidden"
          >
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-[0.03] transition-opacity group-hover:opacity-[0.08] ${tx.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />

            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex items-center gap-5 shrink-0">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform ${
                  tx.type === 'income' 
                    ? 'bg-green-50 text-green-600 shadow-green-100' 
                    : 'bg-rose-50 text-rose-600 shadow-rose-100'
                }`}>
                  {tx.type === 'income' ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">
                      {tx.app}
                    </span>
                    {tx.confidence === 'high' ? (
                      <div className="flex items-center text-green-600">
                        <Check className="w-3 h-3" />
                        <span className="text-[8px] font-black uppercase tracking-widest ml-1">High Accuracy</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-500">
                        <AlertCircle className="w-3 h-3" />
                        <span className="text-[8px] font-black uppercase tracking-widest ml-1">{tx.confidence} Confidence</span>
                      </div>
                    )}
                  </div>
                  <h4 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">
                    {tx.merchant}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {tx.date}</span>
                    <span className="w-1 h-1 bg-gray-200 rounded-full" />
                    <span className="italic line-clamp-1 max-w-[200px]">{tx.rawBody}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-gray-50">
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-1">Amount</p>
                  <p className={`text-2xl font-black ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                    {tx.type === 'income' ? '+' : ''}₹{tx.amount.toLocaleString()}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => ignoreTransaction(tx.id)}
                    className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    title="Ignore"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => approveTransaction(tx.id, {
                      type: tx.type,
                      amount: tx.amount,
                      merchant: tx.merchant,
                      category: 'Auto-Detected',
                      timestamp: new Date(tx.date).toISOString() || new Date().toISOString(),
                      notes: `Detected via ${tx.app}`
                    })}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 hover:scale-105 transition-all shadow-lg shadow-indigo-100"
                  >
                    <Check className="w-5 h-5" />
                    Approve
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationApprovalList;
