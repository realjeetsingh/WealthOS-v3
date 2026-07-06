import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Bell, MessageSquare, Zap, EyeOff, Lock, CheckCircle2 } from 'lucide-react';
import Button from './ui/Button';
import ModalShell from './ModalShell';

interface IntelligenceOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onEnable: () => void;
}

const IntelligenceOnboarding: React.FC<IntelligenceOnboardingProps> = ({ isOpen, onClose, onEnable }) => {
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="lg">
      <div className="pt-4 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-[#6334FD] rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100"
        >
          <Zap className="w-8 h-8 text-white" />
        </motion.div>

        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-tight mb-3">
          Automatic Transaction <br />
          <span className="text-indigo-600">Intelligence</span>
        </h2>
        
        <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed max-w-sm mx-auto">
          Enable Android Notification Access to automatically track your expenses and income as they happen. 
          <span className="text-indigo-600 font-black ml-1">No more manual entry.</span>
        </p>

        <div className="grid grid-cols-1 gap-3 mb-8 text-left">
          <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-0.5">Bank-Grade Precision</h4>
              <p className="text-[11px] text-gray-500 leading-tight">WealthOS identifies transaction alerts from 50+ Indian banks including HDFC, SBI, and ICICI.</p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex gap-3 border-l-4 border-l-indigo-500">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
              <EyeOff className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-0.5">Privacy First Architecture</h4>
              <p className="text-[11px] text-gray-500 leading-tight">We do <span className="font-bold underline">NOT</span> read OTP codes, personal chats, or marketing spam. Only financial data is parsed locally.</p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-0.5">Human-in-the-Loop</h4>
              <p className="text-[11px] text-gray-500 leading-tight">Detected transactions stay in a 'Pending' queue. You decide what gets added to your main dashboard.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button fullWidth size="lg" onClick={onEnable} icon={<ShieldCheck className="w-5 h-5" />}>
            Activate Smart Sync
          </Button>
          <button 
            onClick={onClose}
            className="w-full py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-colors"
          >
            I'll set it up later
          </button>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          <Lock className="w-3 h-3" /> Encrypted Device-Local Analysis
        </div>
      </div>
    </ModalShell>
  );
};

export default IntelligenceOnboarding;
