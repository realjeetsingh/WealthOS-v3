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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<DetectedTransaction>>({});

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

  const startEditing = (tx: DetectedTransaction) => {
    setEditingId(tx.id);
    setEditData({ ...tx });
  };

  const handleApprove = async (tx: DetectedTransaction) => {
    const finalData = editingId === tx.id ? editData : tx;
    await approveTransaction(tx.id, {
      type: finalData.type,
      amount: finalData.amount,
      merchant: finalData.merchant,
      category: finalData.category || 'Auto-Detected',
      timestamp: new Date().toISOString(), // Use current time for main tx
      notes: `Detected via ${finalData.app}`
    });
    setEditingId(null);
  };

  const handleIgnore = async (id: string) => {
    await ignoreTransaction(id);
    setEditingId(null);
  };

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
        {pendingTransactions.map((tx) => {
          const isEditing = editingId === tx.id;
          const displayData = isEditing ? editData : tx;

          return (
            <motion.div
              key={tx.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`group relative bg-white border rounded-[2rem] p-6 transition-all shadow-sm ${
                isEditing ? 'border-indigo-400 ring-4 ring-indigo-50 shadow-2xl' : 'border-gray-100 hover:border-indigo-200'
              }`}
            >
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex items-center gap-5 shrink-0">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${
                    displayData.type === 'income' 
                      ? 'bg-green-50 text-green-600 shadow-green-100' 
                      : 'bg-rose-50 text-rose-600 shadow-rose-100'
                  }`}>
                    {displayData.type === 'income' ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">
                        {tx.app}
                      </span>
                      {tx.confidence === 'high' ? (
                        <div className="flex items-center text-green-600">
                          <Check className="w-3 h-3" />
                          <span className="text-[8px] font-black uppercase tracking-widest ml-1">Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-amber-500">
                          <AlertCircle className="w-3 h-3" />
                          <span className="text-[8px] font-black uppercase tracking-widest ml-1">{tx.confidence} Precision</span>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 mt-4">
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Merchant</label>
                          <input 
                            type="text" 
                            value={editData.merchant} 
                            onChange={(e) => setEditData({ ...editData, merchant: e.target.value })}
                            className="w-full bg-gray-50 border-0 rounded-xl px-4 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount</label>
                            <input 
                              type="number" 
                              value={editData.amount} 
                              onChange={(e) => setEditData({ ...editData, amount: Number(e.target.value) })}
                              className="w-full bg-gray-50 border-0 rounded-xl px-4 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                            <input 
                              type="text" 
                              value={editData.category} 
                              onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                              className="w-full bg-gray-50 border-0 rounded-xl px-4 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">
                          {tx.merchant}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                          <span className="text-indigo-600 font-black uppercase text-[10px] tracking-widest">{tx.category}</span>
                          <span className="w-1 h-1 bg-gray-200 rounded-full" />
                          <span className="flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" /> {tx.date}</span>
                        </div>
                        <p className="mt-2 text-xs text-gray-500 italic line-clamp-1 opacity-60">"{tx.rawBody}"</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between ml-auto">
                  {!isEditing && (
                    <div className="text-right mb-4">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Final Amount</p>
                      <p className={`text-2xl font-black ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                        {tx.type === 'income' ? '+' : ''}₹{tx.amount.toLocaleString()}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600"
                        >
                          Cancel
                        </button>
                        <Button 
                          size="sm" 
                          onClick={() => handleApprove(tx)}
                          icon={<Check className="w-4 h-4" />}
                        >
                          Save & Confirm
                        </Button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleIgnore(tx.id)}
                          className="p-3 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all group/btn"
                          title="Ignore"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => startEditing(tx)}
                          className="p-3 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleApprove(tx)}
                          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 hover:scale-105 transition-all shadow-lg shadow-indigo-100"
                        >
                          <Zap className="w-4 h-4" />
                          Confirm
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default NotificationApprovalList;
