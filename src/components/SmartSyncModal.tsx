import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Zap, Loader2, CheckCircle2, X, Bell, LayoutDashboard, AlertTriangle } from 'lucide-react';
import Button from './ui/Button';
import { SMSSyncService } from '../services/smsSyncService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface SmartSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: (count: number) => void;
}

const SmartSyncModal: React.FC<SmartSyncModalProps> = ({ isOpen, onClose, onSyncComplete }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'intro' | 'syncing' | 'success'>('intro');
  const [syncCount, setSyncCount] = useState(0);

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handleEnableSync = async () => {
    if (!user?.uid) return;

    try {
      const granted = await SMSSyncService.requestPermission();
      if (!granted) {
        toast.error("SMS Permission required for Smart Sync");
        return;
      }

      setStep('syncing');
      
      // Simulate/Trigger historical scan
      const count = await SMSSyncService.syncHistoricalSMS(user.uid);
      setSyncCount(count);
      
      // Artificial delay for UX feel
      setTimeout(() => {
        setStep('success');
        if (onSyncComplete) onSyncComplete(count);
      }, 2000);

    } catch (err: any) {
      toast.error(err.message || "Failed to enable Smart Sync");
      setStep('intro');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden relative border border-gray-100"
      >
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <div className="p-10">
          <AnimatePresence mode="wait">
            {step === 'intro' && (
              <motion.div 
                key="intro"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-[#6334FD]/10 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
                  <ShieldCheck className="w-12 h-12 text-[#6334FD]" />
                </div>
                
                <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
                  {isIOS ? 'Manual SMS Sync' : 'Enable Smart Sync'}
                </h2>
                <p className="text-gray-500 font-medium mb-4 leading-relaxed px-4">
                  {isIOS 
                    ? 'Import your bank transactions by syncing your recent SMS alerts. Secure and private.'
                    : 'We use SMS to automatically track your bank transactions. Your data stays private and encrypted.'
                  }
                </p>
                {isIOS && (
                  <div className="bg-amber-50 text-amber-700 p-3 rounded-xl border border-amber-100 flex items-center justify-center gap-2 mb-10 mx-4">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Auto sync works only on Android devices</span>
                  </div>
                )}
                {!isIOS && <div className="mb-10" />}

                <div className="space-y-6 mb-10 text-left bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Zap className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{isIOS ? 'One-Tap Sync' : 'Auto-Magic Entry'}</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        {isIOS ? 'Scan and import transactions instantly.' : 'Transactions appear instantly as you spend.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Bell className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Real-time Sync</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Works with UPI, Net Banking, and Debit Cards.</p>
                    </div>
                  </div>
                </div>

                <Button fullWidth size="lg" onClick={handleEnableSync} className="h-14 text-lg">
                  {isIOS ? 'Sync Transactions' : 'Grant SMS Permission'}
                </Button>
                
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-6">
                  {isIOS ? 'WealthOS only scans bank-related messages' : 'WealthOS only reads bank-related messages'}
                </p>
              </motion.div>
            )}

            {step === 'syncing' && (
              <motion.div 
                key="syncing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 border-4 border-[#6334FD]/10 rounded-full"></div>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="absolute inset-0 border-4 border-t-[#6334FD] rounded-full"
                  ></motion.div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="w-10 h-10 text-[#6334FD]" />
                  </div>
                </div>
                
                <h2 className="text-2xl font-black text-gray-900 mb-2">Syncing History</h2>
                <p className="text-gray-500 font-medium">Scanning transactions...</p>
                
                <div className="mt-10 flex flex-col gap-2 max-w-xs mx-auto">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2 }}
                      className="h-full bg-[#6334FD]"
                    ></motion.div>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Processing</p>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                
                <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Sync Complete!</h2>
                <p className="text-gray-500 font-medium mb-10 leading-relaxed px-4">
                  <span className="text-green-600 font-black">{syncCount} transactions synced</span>. 
                  {isIOS ? ' Sync regularly to keep your records updated.' : ' Future transactions will appear automatically.'}
                </p>

                <Button fullWidth size="lg" onClick={onClose} className="h-14 text-lg">
                  Go to Dashboard
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default SmartSyncModal;
