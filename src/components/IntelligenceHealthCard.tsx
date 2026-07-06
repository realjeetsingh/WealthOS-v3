import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Battery, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  RefreshCcw,
  Zap,
  BookOpen
} from 'lucide-react';
import { 
  checkAndroidStatus, 
  requestNotificationPermission, 
  requestBatteryOptimizationExclusion,
  triggerRecoverySync,
  setupPermissionListeners,
  AndroidSystemStatus
} from '../services/androidBridge';
import AndroidPermissionOnboarding from './AndroidPermissionOnboarding';

const IntelligenceHealthCard: React.FC = () => {
  const [status, setStatus] = useState<AndroidSystemStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const refreshStatus = async () => {
    const newStatus = await checkAndroidStatus();
    setStatus(newStatus);
  };

  useEffect(() => {
    refreshStatus();
    
    // 1. Static Polling & Visibility listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshStatus();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = setInterval(refreshStatus, 30000);

    // 2. Real-time Native Push handler
    setupPermissionListeners((updatedStatus) => {
      setStatus(updatedStatus);
    });

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      delete (window as any).onWealthOSStatusUpdate;
    };
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    triggerRecoverySync();
    setTimeout(() => {
      setIsSyncing(false);
      refreshStatus();
    }, 2000);
  };

  if (!status) return null;

  const isHealthy = status.isNotificationListenerEnabled && status.isBatteryOptimizationIgnored;

  return (
    <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm mb-8">
      <div className={`p-6 ${isHealthy ? 'bg-emerald-50/30' : 'bg-amber-50/30'} flex items-center justify-between border-b border-gray-100`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isHealthy ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            {isHealthy ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Automation Integrity</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              {isHealthy ? 'System fully optimized' : 'Vulnerability detected in background sync'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowOnboarding(true)}
            className="p-2 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            title="Setup Guide"
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </button>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className={`p-2 bg-white border border-gray-100 rounded-xl transition-all shadow-sm ${isSyncing ? 'animate-spin opacity-50' : 'hover:bg-gray-50 active:scale-95'}`}
          >
            <RefreshCcw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-3">
        {/* Signal Capturer (Notification Listener) */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3">
            <Zap className={`w-5 h-5 ${status.isNotificationListenerEnabled ? 'text-indigo-600' : 'text-gray-300'}`} />
            <div>
              <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Signal Capturer</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-0.5">Notification Listener Access</p>
            </div>
          </div>
          {status.isNotificationListenerEnabled ? (
            <div className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
            </div>
          ) : (
            <button 
              onClick={requestNotificationPermission}
              className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-indigo-600 text-white rounded-lg shadow-sm"
            >
              Enable
            </button>
          )}
        </div>

        {/* Power Guard (Battery Exclusion) */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3">
            <Battery className={`w-5 h-5 ${status.isBatteryOptimizationIgnored ? 'text-emerald-600' : 'text-gray-300'}`} />
            <div>
              <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Power Guard</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-0.5">Battery Optimization Status</p>
            </div>
          </div>
          {status.isBatteryOptimizationIgnored ? (
            <div className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-widest">Exempted</span>
            </div>
          ) : (
            <button 
              onClick={requestBatteryOptimizationExclusion}
              className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-amber-600 text-white rounded-lg shadow-sm"
            >
              Fix Now
            </button>
          )}
        </div>

        {!isHealthy && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-1"
          >
            <p className="text-[10px] text-amber-700 font-bold leading-relaxed bg-amber-50 p-4 rounded-2xl border border-amber-100 italic">
              WealthOS may miss background signals if Android restricts activity. Fix these settings for 100% intelligence reliability.
            </p>
          </motion.div>
        )}
      </div>

      <AndroidPermissionOnboarding 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
    </div>
  );
};

export default IntelligenceHealthCard;
