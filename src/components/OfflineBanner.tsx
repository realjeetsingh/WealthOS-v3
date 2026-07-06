import React, { useState, useEffect } from 'react';
import { WifiOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          id="offline-banner"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 inset-x-0 z-[999999] p-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-medium text-center shadow-2xl flex items-center justify-center gap-3 text-xs md:text-sm"
        >
          <WifiOff className="w-5 h-5 text-red-100 shrink-0 animate-bounce" />
          <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
            <span className="font-black tracking-tight">You're offline.</span>
            <span className="text-red-100 font-bold">Showing your last available data.</span>
          </div>
          <div className="hidden md:flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
            <AlertCircle className="w-3 h-3 text-white" /> Read-Only Mode Active
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
export function useOffline(): boolean {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
}
