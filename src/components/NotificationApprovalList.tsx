import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, X, Edit2, AlertCircle, TrendingUp, TrendingDown, Clock, ShieldCheck, Zap, Brain } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { DetectedTransaction, approveTransaction, ignoreTransaction, deleteDetectedTransaction, revertTransaction } from '../services/notificationIntelligence';
import Button from './ui/Button';
import { toast } from 'sonner';

const NotificationApprovalList: React.FC = () => {
  const [allTransactions, setAllTransactions] = useState<DetectedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<DetectedTransaction>>({});

  useEffect(() => {
    if (!auth.currentUser) return;

    // We fetch both pending and approved (for undo)
    const q = query(
      collection(db, `users/${auth.currentUser.uid}/detected_transactions`),
      where('status', 'in', ['pending', 'approved']),
      orderBy('detectedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DetectedTransaction[];
      setAllTransactions(txs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const pendingTransactions = allTransactions.filter(t => t.status === 'pending');
  // Only show auto-approved ones that are relatively recent (last hour) for undo
  const autoApprovedTransactions = allTransactions.filter(t => 
    t.status === 'approved' && 
    t.detectedAt && 
    (new Date().getTime() - (t.detectedAt as any).toDate().getTime() < 3600000)
  );

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
      timestamp: new Date().toISOString(),
      notes: `Detected via ${finalData.app}`
    });
    setEditingId(null);
    toast.success('Transaction confirmed');
  };

  const handleIgnore = async (id: string) => {
    await ignoreTransaction(id);
    setEditingId(null);
    toast.info('Item moved to ignored list');
  };

  const handleRevert = async (id: string) => {
    await revertTransaction(id);
    toast.info('Transaction reverted to review queue');
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

  if (pendingTransactions.length === 0 && autoApprovedTransactions.length === 0) {
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
      <div className="bg-indigo-600/5 border border-indigo-100 rounded-[2rem] p-6 mb-8 flex gap-4 items-center">
        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-1">Human-in-the-Loop Intelligence</h4>
          <p className="text-[11px] text-indigo-800/70 font-medium leading-relaxed">
            WealthOS detected these signals from your notifications. Review and confirm them to keep your dashboard accurate. 
            High-confidence patterns are auto-confirmed but remain here for review.
          </p>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {autoApprovedTransactions.map((tx) => (
          <motion.div
            key={`auto-${tx.id}`}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="group relative bg-emerald-50/30 border border-emerald-100 rounded-[2rem] p-5 mb-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100/50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-black text-gray-900 leading-none">{tx.merchant}</h4>
                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-widest">Auto-Confirmed</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">₹{tx.amount.toLocaleString()} • {tx.category}</p>
                </div>
              </div>
              <button 
                onClick={() => handleRevert(tx.id)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-emerald-100 rounded-xl text-[10px] font-black text-emerald-700 uppercase tracking-widest hover:bg-emerald-50 transition-colors shadow-sm"
              >
                <Clock className="w-3.5 h-3.5" />
                Undo
              </button>
            </div>
          </motion.div>
        ))}

        {pendingTransactions.length > 0 && (
          <div className="px-2 pb-2">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Review Required</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{pendingTransactions.length} Pending Approval</p>
          </div>
        )}

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
                isEditing ? 'border-indigo-400 ring-4 ring-indigo-50 shadow-2xl' : 
                tx.confidence === 'high' ? 'border-gray-100 hover:border-indigo-200' :
                'border-amber-100 bg-amber-50/10'
              }`}
            >
              {tx.confidence !== 'high' && !isEditing && (
                <div className="absolute -top-2.5 right-8 bg-amber-500 text-white text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-lg">
                  Needs Attention
                </div>
              )}
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
                          {tx.isLearned ? (
                            <>
                              <Brain className="w-3 h-3 text-indigo-600" />
                              <span className="text-[8px] font-black uppercase tracking-widest ml-1 text-indigo-600">Learned Behavior</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3" />
                              <span className="text-[8px] font-black uppercase tracking-widest ml-1">Verified</span>
                            </>
                          )}
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
                          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg ${
                            tx.confidence === 'high' 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 shadow-indigo-100' 
                            : 'bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                          }`}
                        >
                          <Zap className="w-4 h-4" />
                          {tx.confidence === 'high' ? 'Quick Confirm' : 'Verify & Add'}
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
