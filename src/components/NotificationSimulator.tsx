import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Bell, Zap, X, ShieldCheck, AlertCircle, Info, Terminal, ChevronRight, CheckCircle2, History, TrendingUp, TrendingDown } from 'lucide-react';
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
    app: 'Jupiter',
    title: 'New Feature!',
    body: 'Check out our new mutual fund investments.',
    packageName: 'me.jupiter.app'
  },
  {
    app: 'Unknown App',
    title: 'Random Alert',
    body: 'Something happened on your device with ₹100',
    packageName: 'com.unknown.app'
  },
  {
    app: 'Cred',
    title: 'New Bill detected',
    body: 'You spent ₹1,200 at "Blue Tokai Coffee" using your Axis Bank card.',
    packageName: 'com.cred.app'
  },
  {
    app: 'HDFC Bank',
    title: 'Bill Due Reminder',
    body: 'Your Credit Card bill ending 4422 of ₹45,000 is due on 20th May. Pay now to avoid charges.',
    packageName: 'com.hdfcbank.smartbuy'
  },
  {
    app: 'ICICI Bank',
    title: 'Statement Generated',
    body: 'Your monthly statement for A/c XXXXX123 is now available. Outstanding: ₹2,150.',
    packageName: 'com.icicibank.mobile'
  }
];

interface NotificationSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationSimulator: React.FC<NotificationSimulatorProps> = ({ isOpen, onClose }) => {
  const [lastResult, setLastResult] = useState<ParseResult | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(() => {
    return localStorage.getItem('intelligence_dev_mode') === 'true';
  });

  const toggleDevMode = (val: boolean) => {
    setIsDeveloperMode(val);
    localStorage.setItem('intelligence_dev_mode', val ? 'true' : 'false');
  };

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
    
    if (result.status === 'SUCCESS' || result.status === 'DUPLICATE_IGNORED') {
      setShowDebug(true);
    } else {
      setShowDebug(true); // Always show details for errors/filters
    }

    switch (result.status) {
      case 'SUCCESS':
        toast.success(`${mock.app} transaction detected!`);
        break;
      case 'DUPLICATE_IGNORED':
        toast.info('Transaction already tracked. Skipping duplicate.');
        break;
      case 'FILTERED':
        toast.info(`Notification safely ignored.`);
        break;
      case 'LOW_CONFIDENCE':
        toast.warning('Detection bypassed: Ambiguous alert content.');
        break;
      case 'PARSE_FAILED':
        toast.error('Could not extract transaction value.');
        break;
      default:
        toast.error(`Process Error: ${result.error || 'Check logs'}`);
    }
  };

  return (
    <>
      <ModalShell isOpen={isOpen} onClose={onClose} title="Intelligence Simulator">
        <div className="-mt-2">
          {!showDebug ? (
            <>
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
                <div className="flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-900 font-medium leading-relaxed">
                    Test the transaction detection engine by triggering simulated bank alerts. 
                    Transactions will appear in your approval queue.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Scenario</p>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <span className="text-[9px] font-bold text-gray-400 uppercase group-hover:text-gray-600 transition-colors">Developer Mode</span>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={isDeveloperMode} 
                        onChange={(e) => toggleDevMode(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-8 h-4 rounded-full transition-colors ${isDeveloperMode ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isDeveloperMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>
                {MOCK_NOTIFICATIONS.map((mock, idx) => (
                  <button
                    key={idx}
                    onClick={() => simulate(mock)}
                    className="w-full text-left p-4 bg-gray-50 hover:bg-white border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 rounded-2xl transition-all group"
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
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Processing Result</h4>
                </div>
                <button 
                  onClick={() => setShowDebug(false)}
                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                >
                  New Simulation
                </button>
              </div>

              {lastResult && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl flex items-start gap-3 border ${
                    lastResult.status === 'SUCCESS' ? 'bg-green-50 border-green-100' : 
                    lastResult.status === 'DUPLICATE_IGNORED' ? 'bg-indigo-50 border-indigo-100' :
                    'bg-gray-50 border-gray-100'
                  }`}>
                    {lastResult.status === 'SUCCESS' || lastResult.status === 'DUPLICATE_IGNORED' ? (
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${lastResult.status === 'SUCCESS' ? 'text-green-600' : 'text-indigo-600'}`} />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400 shrink-0" />
                    )}
                    <div>
                      <p className={`text-sm font-black ${
                        lastResult.status === 'SUCCESS' ? 'text-green-900' : 
                        lastResult.status === 'DUPLICATE_IGNORED' ? 'text-indigo-900' : 
                        'text-gray-900'
                      }`}>
                        {lastResult.status === 'SUCCESS' ? 'Actionable Intelligence Found' : 
                         lastResult.status === 'DUPLICATE_IGNORED' ? 'Redundant Signal Ignored' :
                         'Notification Filtered'}
                      </p>
                      <p className="text-xs font-medium opacity-70">
                        {lastResult.status === 'SUCCESS' ? 'Transaction detected and added to your pending queue.' : 
                         lastResult.status === 'DUPLICATE_IGNORED' ? 'This transaction was already tracked. No action taken.' :
                         lastResult.error || 'System determined this alert does not contain financial data.'}
                      </p>
                    </div>
                  </div>

                  {lastResult.data && lastResult.status === 'SUCCESS' && (
                    <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-xl shadow-indigo-500/5">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Detected Transaction</p>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${lastResult.data.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {lastResult.data.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">{lastResult.data.merchant}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">{lastResult.data.category}</p>
                          </div>
                        </div>
                        <p className={`text-lg font-black ${lastResult.data.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                          {lastResult.data.type === 'income' ? '+' : ''}₹{lastResult.data.amount?.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold bg-gray-50 p-2 rounded-lg">
                        <Smartphone className="w-3 h-3" />
                        <span className="uppercase tracking-widest">Source: {lastResult.data.app}</span>
                      </div>
                    </div>
                  )}

                  {isDeveloperMode && (
                    <div className="bg-gray-900 rounded-2xl p-4 font-mono text-[10px] leading-relaxed overflow-hidden">
                      <div className="flex items-center justify-between mb-2 border-b border-gray-800 pb-2">
                        <p className="text-gray-500">Pipeline Execution Logs</p>
                        <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 rounded uppercase font-bold tracking-widest">Dev Mode</span>
                      </div>
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
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 p-6 bg-gray-50 rounded-[2rem] flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-gray-400 shrink-0" />
            <p className="text-[10px] text-gray-500 font-medium">
              Intelligence sandbox is for testing purposes. Real processing happens in the background via Android hooks.
            </p>
          </div>
        </div>
      </ModalShell>
    </>
  );
};

export default NotificationSimulator;
