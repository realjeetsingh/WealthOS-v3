import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Info, ShieldAlert, Zap } from 'lucide-react';

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
}

interface FloatingAlertsProps {
  initialAlerts: Alert[];
}

const FloatingAlerts: React.FC<FloatingAlertsProps> = ({ initialAlerts }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // Show alerts on mount
    setAlerts(initialAlerts);
  }, [initialAlerts]);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-24 right-6 z-[9999] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
      <AnimatePresence mode="popLayout">
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            layout
            className={`pointer-events-auto relative p-5 rounded-2xl shadow-xl shadow-black/5 border transition-all ${
              alert.type === 'danger' ? 'bg-white border-red-100' :
              alert.type === 'warning' ? 'bg-white border-amber-100' :
              alert.type === 'success' ? 'bg-white border-emerald-100' :
              'bg-white border-indigo-100'
            }`}
          >
            <div className="flex gap-4">
              <div className={`shrink-0 p-2.5 rounded-xl ${
                alert.type === 'danger' ? 'bg-red-50 text-red-600' :
                alert.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                alert.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                'bg-indigo-50 text-indigo-600'
              }`}>
                {alert.type === 'danger' ? <ShieldAlert className="w-5 h-5" /> :
                 alert.type === 'warning' ? <AlertCircle className="w-5 h-5" /> :
                 alert.type === 'success' ? <Zap className="w-5 h-5" /> :
                 <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <h4 className="font-black text-sm text-gray-900 mb-1">{alert.title}</h4>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">{alert.message}</p>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Visual indicator bar */}
            <div className={`absolute bottom-0 left-6 right-6 h-1 rounded-t-full ${
              alert.type === 'danger' ? 'bg-red-500/20' :
              alert.type === 'warning' ? 'bg-amber-500/20' :
              alert.type === 'success' ? 'bg-emerald-500/20' :
              'bg-indigo-500/20'
            }`} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default FloatingAlerts;
