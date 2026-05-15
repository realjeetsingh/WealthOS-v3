import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Battery, 
  Zap, 
  Bell, 
  ChevronRight, 
  ArrowRight,
  Info,
  Check
} from 'lucide-react';
import { 
  checkAndroidStatus, 
  requestNotificationPermission, 
  requestBatteryOptimizationExclusion,
  requestPostNotificationsPermission,
  AndroidSystemStatus
} from '../services/androidBridge';
import ModalShell from './ui/ModalShell';
import Button from './ui/Button';

interface AndroidPermissionOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

const AndroidPermissionOnboarding: React.FC<AndroidPermissionOnboardingProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<AndroidSystemStatus | null>(null);

  const refreshStatus = async () => {
    const newStatus = await checkAndroidStatus();
    setStatus(newStatus);
  };

  useEffect(() => {
    if (isOpen) refreshStatus();
    
    // Auto-refresh every 5s while open to detect permission changes on return
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const steps = [
    {
      id: 1,
      title: "Automatic Intelligence",
      description: "WealthOS can automatically track transactions from your bank notifications. This remains 100% private and on-device.",
      icon: Zap,
      color: "text-indigo-600",
      bg: "bg-indigo-50"
    },
    {
      id: 2,
      title: "Alert Permissions",
      description: "Allow WealthOS to show you real-time alerts when new transactions are detected.",
      icon: Bell,
      color: "text-amber-600",
      bg: "bg-amber-50",
      action: requestPostNotificationsPermission,
      check: (s: AndroidSystemStatus) => s.isPostNotificationsEnabled,
      label: "Allow Alerts"
    },
    {
      id: 3,
      title: "Notification Access",
      description: "To read incoming bank alerts, we need 'Notification Listener' access. This is a special permission in Android settings.",
      icon: ShieldCheck,
      color: "text-blue-600",
      bg: "bg-blue-50",
      action: requestNotificationPermission,
      check: (s: AndroidSystemStatus) => s.isNotificationListenerEnabled,
      label: "Open Settings"
    },
    {
      id: 4,
      title: "Background Reliability",
      description: "Android may stop WealthOS if it's not active. Exempting WealthOS from battery optimization ensures you never miss a transaction.",
      icon: Battery,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      action: requestBatteryOptimizationExclusion,
      check: (s: AndroidSystemStatus) => s.isBatteryOptimizationIgnored,
      label: "Optimize Sync"
    }
  ];

  const currentStepData = steps.find(s => s.id === step);
  const isComplete = status?.isNotificationListenerEnabled && status?.isBatteryOptimizationIgnored && status?.isPostNotificationsEnabled;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Setup Automation">
      <div className="py-2">
        <div className="flex justify-center gap-2 mb-8">
          {steps.map(s => (
            <div 
              key={s.id} 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                step === s.id ? 'w-8 bg-indigo-600' : 'w-4 bg-gray-100'
              }`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className={`w-20 h-20 ${currentStepData?.bg} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm`}>
              {currentStepData && <currentStepData.icon className={`w-10 h-10 ${currentStepData.color}`} />}
            </div>
            
            <h3 className="text-xl font-black text-gray-900 mb-2 leading-tight">
              {currentStepData?.title}
            </h3>
            <p className="text-sm text-gray-500 font-medium px-4 mb-8 leading-relaxed">
              {currentStepData?.description}
            </p>

            {currentStepData?.action && (
              <div className="px-4">
                <div className={`p-4 rounded-2xl border ${currentStepData.check(status || {} as any) ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'} mb-6 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentStepData.check(status || {} as any) ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                      {currentStepData.check(status || {} as any) ? <Check className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs font-black uppercase tracking-widest ${currentStepData.check(status || {} as any) ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {currentStepData.check(status || {} as any) ? 'Granted' : 'Pending'}
                    </span>
                  </div>
                  {!currentStepData.check(status || {} as any) && (
                    <button 
                      onClick={currentStepData.action}
                      className="text-[10px] font-black uppercase tracking-widest bg-white border border-gray-200 px-3 py-2 rounded-xl shadow-sm active:scale-95 transition-all"
                    >
                      {currentStepData.label}
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex gap-3 px-4">
          {step > 1 && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          )}
          <Button 
            className="flex-1"
            onClick={() => {
              if (step < steps.length) {
                setStep(step + 1);
              } else {
                onClose();
              }
            }}
          >
            {step === steps.length ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};

export default AndroidPermissionOnboarding;
