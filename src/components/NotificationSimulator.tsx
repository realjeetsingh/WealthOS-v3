import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Bell, Zap, X, ShieldCheck, AlertCircle, Info, Terminal, ChevronRight, CheckCircle2, History } from 'lucide-react';
import Button from './ui/Button';
import ModalShell from './ModalShell';
import { processIncomingNotification, RawNotification, ParseResult } from '../services/notificationIntelligence';
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
  },
  {
    app: 'Unknown App',
    title: 'Random Alert',
    body: 'Something happened on your device with ₹100',
    packageName: 'com.unknown.app'
  }
];

const NotificationSimulator: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [lastResult, setLastResult] = useState<ParseResult | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const simulate = async (mock: any) => {
    const notification: RawNotification = {
      id: Math.random().toString(36).substr(2, 9),
      app: mock.app,
      title: mock.title,
      body: mock.body,
      packageName: mock.packageName,
      timestamp: new Date()
    };

    const result = await processIncomingNotification(notification);
    setLastResult(result);
    setShowDebug(true);

    if (result.success) {
      toast.success(`${mock.app} transaction detected!`);
    } else {
      toast.error(`Detector Error: ${result.error || 'Unknown failure'}`);
    }
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

      <ModalShell isOpen={isOpen} onClose={() => setIsOpen(false)} title="Intelligence Sandbox">
        <div className="-mt-2">
          {!showDebug ? (
            <>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
                <div className="flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 font-medium leading-relaxed">
                    Test the transaction detection engine by triggering simulated bank alerts.
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
            </>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Parser Debugger</h4>
                </div>
                <button 
                  onClick={() => setShowDebug(false)}
                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                >
                  Back to Scenarios
                </button>
              </div>

              {lastResult && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl flex items-start gap-3 border ${
                    lastResult.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                  }`}>
                    {lastResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    )}
                    <div>
                      <p className={`text-sm font-black ${lastResult.success ? 'text-green-900' : 'text-red-900'}`}>
                        {lastResult.success ? 'Success: Transaction Normalised' : `Failed at ${lastResult.stage} stage`}
                      </p>
                      <p className="text-xs font-medium opacity-70">
                        {lastResult.error || 'The engine successfully extracted all required fields.'}
                      </p>
                    </div>
                  </div>

                  {lastResult.data && (
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Extracted Data</p>
                      <div className="grid grid-cols-2 gap-y-3">
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Merchant</p>
                          <p className="text-xs font-black text-gray-900">{lastResult.data.merchant}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Category</p>
                          <p className="text-xs font-black text-indigo-600 truncate">{lastResult.data.category || 'Other'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Amount</p>
                          <p className="text-xs font-black text-gray-900">₹{lastResult.data.amount?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Type</p>
                          <p className="text-xs font-black text-gray-900 italic">{lastResult.data.type}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Confidence</p>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            lastResult.data.confidence === 'high' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {lastResult.data.confidence}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-900 rounded-2xl p-4 font-mono text-[10px] leading-relaxed overflow-hidden">
                    <p className="text-gray-500 mb-2 border-b border-gray-800 pb-2">Intelligence Pipeline Logs</p>
                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto custom-scrollbar">
                      {lastResult.logs.map((log, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-indigo-400/50">{i+1}</span>
                          <span className={log.includes('[Critical]') || log.includes('Rejected') ? 'text-rose-400' : 'text-gray-300'}>
                            {log}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 p-6 bg-gray-50 rounded-[2rem] flex items-center gap-3">
            <Info className="w-4 h-4 text-gray-400 shrink-0" />
            <p className="text-[10px] text-gray-500 font-medium">
              Intelligence sandbox allows debugging of the notification parsing pipeline in real-time.
            </p>
          </div>
        </div>
      </ModalShell>
    </>
  );
};

export default NotificationSimulator;
