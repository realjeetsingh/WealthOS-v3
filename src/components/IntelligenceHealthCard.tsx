import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Battery, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  RefreshCcw,
  Zap
} from 'lucide-react';
import { 
  checkAndroidStatus, 
  requestNotificationPermission, 
  requestBatteryOptimizationExclusion,
  triggerRecoverySync,
  AndroidSystemStatus
} from '../services/androidBridge';
import Button from './ui/Button';

const IntelligenceHealthCard: React.FC = () => {
  const [status, setStatus] = useState<AndroidSystemStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshStatus = async () => {
    const newStatus = await checkAndroidStatus();
    setStatus(newStatus);
  };

  useEffect(() => {
    refreshStatus();
    // Refresh health every 30 seconds while user is on this page
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
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
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className={`p-2 rounded-xl transition-all ${isSyncing ? 'animate-spin opacity-50' : 'hover:bg-white active:scale-95'}`}
        >
          <RefreshCcw className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        {/* Notification Listener Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3">
            <Zap className={`w-5 h-5 ${status.isNotificationListenerEnabled ? 'text-indigo-600' : 'text-gray-300'}`} />
            <div>
              <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Signal Capturer</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Notification Listener Service</p>
            </div>
          </div>
          {status.isNotificationListenerEnabled ? (
            <div className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
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

        {/* Battery Optimization Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3">
            <Battery className={`w-5 h-5 ${status.isBatteryOptimizationIgnored ? 'text-emerald-600' : 'text-gray-300'}`} />
            <div>
              <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Power Guard</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Background Persistence</p>
            </div>
          </div>
          {status.isBatteryOptimizationIgnored ? (
            <div className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
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
          <div className="pt-2">
            <p className="text-[10px] text-amber-700 font-bold leading-relaxed bg-amber-50 p-4 rounded-2xl border border-amber-100">
              ⚠️ Android may kill WealthOS in the background to save battery. Enable "Exemption" and "Listener Access" to ensure real-time transaction detection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelligenceHealthCard;
