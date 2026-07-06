import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Activity, Database, Zap, X, Terminal, Cpu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { checkAppHealth, HealthStatus } from '../services/healthService';

const DebugPanel: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.uid) {
      setLoading(true);
      checkAppHealth(user.uid).then(status => {
        setHealth(status);
        setLoading(false);
      });
    }
  }, [isOpen, user?.uid]);

  // Hidden activation: Long press or multiple clicks on a specific spot could trigger this in a real app.
  // For this beta, we'll just have a small trigger or listen for a key combo.
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Hidden Trigger (optional) */}
      <div 
        className="fixed bottom-0 right-0 w-10 h-10 z-[999] opacity-0 hover:opacity-10 pointer-events-auto cursor-help"
        onClick={() => setIsOpen(true)}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-y-0 right-0 w-80 bg-gray-900 text-green-400 p-6 z-[1000000] shadow-2xl font-mono text-xs overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                <span className="font-bold uppercase tracking-widest">Debug Console</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-800 rounded-lg text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              <section className="space-y-3">
                <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-wider">System Health</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Database className="w-3 h-3" />
                      <span>Firebase</span>
                    </div>
                    <span className={health?.apiStatus.firebase === 'ok' ? 'text-green-400' : 'text-red-400'}>
                      {health?.apiStatus.firebase || '---'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-3 h-3" />
                      <span>Latency</span>
                    </div>
                    <span>{health?.latency ? `${health.latency}ms` : '---'}</span>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-wider">App Metadata</h4>
                <div className="bg-gray-800/20 p-3 rounded-lg space-y-1">
                  <p>VERSION: 1.0.0-beta</p>
                  <p>ENV: production</p>
                  <p>UID: {user?.uid?.slice(0, 12)}...</p>
                  <p>IS_PRO: {String(!!user?.uid)}</p>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Storage Stats</h4>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-3 h-3" />
                  Hard Refresh
                </button>
              </section>

              <div className="pt-8 text-[10px] text-gray-600 text-center uppercase tracking-widest leading-loose">
                WealthOS Growth Systems<br />
                Stability Module Active<br />
                © 2026 ALPHA PROJECT
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DebugPanel;
