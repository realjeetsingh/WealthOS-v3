import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle, Clock, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Loan } from '../types';
import { formatCurrency } from '../lib/formatCurrency';
import { CurrencyDisplay } from './CurrencyDisplay';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { useLayout } from '../contexts/LayoutContext';
import { NAVBAR_HEIGHT, FAB_SAFE_SPACING } from '../constants';

interface EmiReminderProps {
  loans: Loan[];
  userId: string;
  currency: string;
}

const EmiReminder: React.FC<EmiReminderProps> = ({ loans, userId, currency }) => {
  const { isNavVisible } = useLayout();
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
      
      const dueDate = new Date(loan.nextEmiDate);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Return true if due within 3 days (inclusive of today) or if missed
      return diffDays <= 3;
    });

    if (dueLoan) {
      setActiveReminder(dueLoan);
    } else {
      setActiveReminder(null);
    }
  }, [loans, dismissedIds]);

  const getReminderConfig = (loan: Loan) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(loan.nextEmiDate!);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        title: 'EMI Missed',
        message: `Your EMI due on ${loan.nextEmiDate} was missed. Penalty fees may apply.`,
        color: 'bg-red-500',
        textColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-100',
        icon: <ShieldAlert className="w-6 h-6" />,
        action: 'Paid Now'
      };
    } else if (diffDays === 0) {
      return {
        title: 'EMI Due Today',
        message: `Today is the deadline for your ${loan.name} EMI. Pay now to avoid issues.`,
        color: 'bg-orange-600',
        textColor: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-100',
        icon: <AlertTriangle className="w-6 h-6" />,
        action: 'Mark as Paid'
      };
    } else {
      return {
        title: 'EMI Due Soon',
        message: `Your EMI of ${formatCurrency(loan.emi, currency)} is due in ${diffDays} days (${loan.nextEmiDate}).`,
        color: 'bg-indigo-500',
        textColor: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-100',
        icon: <Bell className="w-6 h-6" />,
        action: 'Mark as Paid'
      };
    }
  };

  const handleMarkAsPaid = async () => {
    if (!activeReminder || !activeReminder.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const nextDate = new Date(activeReminder.nextEmiDate!);
      nextDate.setMonth(nextDate.getMonth() + 1);
      
      const updatedRemaining = Math.max(0, activeReminder.remainingAmount - activeReminder.emi);
      const isCompleted = updatedRemaining <= 0 || (activeReminder.paidMonths + 1) >= activeReminder.tenureMonths;

      await updateDoc(doc(db, `users/${userId}/loans`, activeReminder.id), {
        paidMonths: activeReminder.paidMonths + 1,
        nextEmiDate: nextDate.toISOString().split('T')[0],
        lastPaidDate: today,
        remainingAmount: updatedRemaining,
        status: isCompleted ? 'completed' : 'active'
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

  const reminderConfig = activeReminder ? getReminderConfig(activeReminder) : null;

  return (
    <AnimatePresence>
      {activeReminder && reminderConfig && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            bottom: isNavVisible 
              ? `calc(${NAVBAR_HEIGHT + FAB_SAFE_SPACING}px + env(safe-area-inset-bottom))` 
              : `calc(${FAB_SAFE_SPACING}px + env(safe-area-inset-bottom))`
          }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed right-6 left-6 md:left-auto md:w-96 z-50 shadow-2xl"
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className={`${reminderConfig.color} p-4 flex items-center justify-between`}>
              <div className="flex items-center gap-2 text-white">
                <Bell className="w-5 h-5 animate-bounce" />
                <span className="font-black text-sm uppercase tracking-widest">{reminderConfig.title}</span>
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
                <div className={`p-3 ${reminderConfig.bgColor} rounded-2xl ${reminderConfig.textColor} shrink-0`}>
                  {reminderConfig.icon}
                </div>
                <div>
                  <h4 className="font-black text-gray-900 leading-tight mb-1">{activeReminder.name}</h4>
                  <p className="text-xs text-gray-500 font-bold mb-2">{activeReminder.lenderName}</p>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">{reminderConfig.message}</p>
                  <p className={`text-2xl font-black ${reminderConfig.textColor} mt-4 tracking-tighter`}>
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
                  className={`flex items-center justify-center gap-2 px-4 py-3 ${reminderConfig.color} text-white rounded-xl font-bold text-xs hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-black/5`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {reminderConfig.action}
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
