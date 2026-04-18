import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle, Clock, X, AlertTriangle } from 'lucide-react';
import { Loan } from '../types';
import { formatCurrency } from '../lib/formatCurrency';
import { CurrencyDisplay } from './CurrencyDisplay';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

interface EmiReminderProps {
  loans: Loan[];
  userId: string;
  currency: string;
}

const EmiReminder: React.FC<EmiReminderProps> = ({ loans, userId, currency }) => {
  const [activeReminder, setActiveReminder] = useState<Loan | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    if (loans.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isPaidThisMonth = (lastPaidDate?: string) => {
      if (!lastPaidDate) return false;
      const lastPaid = new Date(lastPaidDate);
      return lastPaid.getMonth() === today.getMonth() && lastPaid.getFullYear() === today.getFullYear();
    };

    const dueLoan = loans.find(loan => {
      if (loan.status !== 'active' || !loan.nextEmiDate || dismissedIds.includes(loan.id!)) return false;
      
      // Check if already paid this month
      if (isPaidThisMonth(loan.lastPaidDate)) return false;

      const dueDate = new Date(loan.nextEmiDate);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 && diffDays <= 3;
    });

    if (dueLoan) {
      setActiveReminder(dueLoan);
    } else {
      setActiveReminder(null);
    }
  }, [loans, dismissedIds]);

  const handleMarkAsPaid = async () => {
    if (!activeReminder || !activeReminder.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const nextDate = new Date(activeReminder.nextEmiDate!);
      nextDate.setMonth(nextDate.getMonth() + 1);

      await updateDoc(doc(db, `users/${userId}/loans`, activeReminder.id), {
        paidMonths: activeReminder.paidMonths + 1,
        nextEmiDate: nextDate.toISOString().split('T')[0],
        lastPaidDate: today,
        remainingAmount: Math.max(0, activeReminder.remainingAmount - activeReminder.emi)
      });

      toast.success(`${activeReminder.name} EMI marked as paid!`);
      setActiveReminder(null);
    } catch (error) {
      console.error("Error marking EMI as paid:", error);
      toast.error("Failed to update EMI status");
    }
  };

  const handleRemindLater = () => {
    if (!activeReminder || !activeReminder.id) return;
    
    // Session state only (resets on refresh as requested)
    setDismissedIds(prev => [...prev, activeReminder.id!]);
    setActiveReminder(null);
  };

  return (
    <AnimatePresence>
      {activeReminder && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-24 right-6 left-6 md:left-auto md:w-96 z-50"
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden">
            <div className="bg-orange-500 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Bell className="w-5 h-5 animate-bounce" />
                <span className="font-black text-sm uppercase tracking-widest">EMI Due Soon</span>
              </div>
              <button 
                onClick={handleRemindLater}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-orange-50 rounded-2xl text-orange-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 leading-tight mb-1">{activeReminder.name}</h4>
                  <p className="text-sm text-gray-500 font-medium">Due on: {activeReminder.nextEmiDate}</p>
                  <p className="text-2xl font-black text-orange-600 mt-2 tracking-tighter">
                    <CurrencyDisplay value={activeReminder.emi} currency={currency} />
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleRemindLater}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-100 transition-all active:scale-95"
                >
                  <Clock className="w-4 h-4" />
                  Later
                </button>
                <button
                  onClick={handleMarkAsPaid}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#6334FD] text-white rounded-xl font-bold text-xs hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark as Paid
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmiReminder;
