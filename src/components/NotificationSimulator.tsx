import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Bell, Zap, X, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import Button from './ui/Button';
import ModalShell from './ModalShell';
import { processIncomingNotification, RawNotification } from '../services/notificationIntelligence';
import { toast } from 'sonner';

const MOCK_NOTIFICATIONS = [
  {
    app: 'PhonePe',
    title: 'Payment Successful',
    body: 'Paid ₹450 to Swiggy. Trans ID: 123456789. Ref: a/c xx1234',
    packageName: 'com.phonepe.app'
  },
  {
    app: 'HDFC Bank',
    title: 'Alert: Transaction',
    body: 'HDFC Bank: Rs 15,200.00 debited from a/c x1234 on 11-05-26 to Amazon India. Not you? Call 1800...',
    packageName: 'com.hdfc.bank'
  },
  {
    app: 'Google Pay',
    title: 'Money Received',
    body: 'Rajesh sent you ₹2,500. Message: "Dinner split"',
    packageName: 'com.google.android.apps.nbu.paisa.user'
  },
  {
    app: 'SBI',
    title: 'Transaction Alert',
    body: 'Your a/c x7890 is credited with ₹50,000.00 on 01-05-26 by Salary. (Ref no 123456)',
    packageName: 'com.sbi.upi'
  }
];

const NotificationSimulator: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const simulate = async (mock: any) => {
    const notification: RawNotification = {
      id: Math.random().toString(36).substr(2, 9),
      app: mock.app,
      title: mock.title,
      body: mock.body,
      packageName: mock.packageName,
      timestamp: new Date()
    };

    toast.promise(processIncomingNotification(notification), {
      loading: `Detecting ${mock.app} transaction...`,
      success: 'Transaction intelligence processed!',
      error: 'Failed to process notification.'
    });
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-24 right-6 w-12 h-12 bg-indigo-600/20 text-indigo-600 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group"
        title="Simulate Notifications"
      >
        <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
      </button>

      <ModalShell isOpen={isOpen} onClose={() => setIsOpen(false)} title="Notification Lab">
        <div className="-mt-2">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
            <div className="flex gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 font-medium leading-relaxed">
                This simulator mimics Android notification signals to test WealthOS's transaction intelligence engine.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Scenario</p>
            {MOCK_NOTIFICATIONS.map((mock, idx) => (
              <button
                key={idx}
                onClick={() => simulate(mock)}
                className="w-full text-left p-4 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-2xl transition-all group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{mock.app}</span>
                  <Zap className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1 line-clamp-1">{mock.title}</p>
                <p className="text-xs text-gray-500 line-clamp-1 italic">{mock.body}</p>
              </button>
            ))}
          </div>

          <div className="mt-8 p-6 bg-gray-50 rounded-[2rem] flex items-center gap-3">
            <Info className="w-4 h-4 text-gray-400 shrink-0" />
            <p className="text-[10px] text-gray-500 font-medium">
              Detected transactions will appear in your 'Pending Approvals' queue for verification.
            </p>
          </div>
        </div>
      </ModalShell>
    </>
  );
};

export default NotificationSimulator;
