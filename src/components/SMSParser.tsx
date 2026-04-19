import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, CheckCircle2, ShieldCheck, AlertCircle, ArrowRight, Zap } from 'lucide-react';
import Button from './ui/Button';
import { toast } from 'sonner';
import { parseSMS, ParsedSMS } from '../lib/smsParser';

interface SMSParserProps {
  onParse: (transaction: {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    notes: string;
    source: 'auto';
    status?: 'review' | 'verified';
  }) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SMSParser: React.FC<SMSParserProps> = ({ onParse, isOpen, onClose }) => {
  const [step, setStep] = useState<'permission' | 'input' | 'preview'>('permission');
  const [smsText, setSmsText] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedSMS | null>(null);

  const handleGrantPermission = () => {
    setStep('input');
  };

  const handleParse = (text: string) => {
    const result = parseSMS(text);
    if ('error' in result) {
      toast.error(result.message || 'Could not detect bank transaction details. Please check the text.');
      return;
    }

    setParsedResult(result);
    setStep('preview');
  };

  const handleConfirm = () => {
    if (parsedResult) {
      onParse({
        type: parsedResult.type,
        amount: parsedResult.amount,
        category: 'Auto-Imported',
        notes: `SMS from ${parsedResult.merchant} on ${parsedResult.date}`,
        source: 'auto',
        status: parsedResult.status
      });
      toast.success('Transaction added!');
      onClose();
      // Reset
      setTimeout(() => {
        setStep('permission');
        setSmsText('');
        setParsedResult(null);
      }, 500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden relative"
      >
        <div className="absolute top-4 right-4 z-10">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 'permission' && (
              <motion.div 
                key="permission"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-[#EEF2FF] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-10 h-10 text-[#6334FD]" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-4">SMS Read Access</h2>
                <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                  WealthOS uses SMS parsing to automatically track your bank transactions. Grant permission to sync your UPI and Bank alerts.
                </p>
                <div className="space-y-3">
                  <Button fullWidth size="lg" onClick={handleGrantPermission}>
                    Grant Access
                  </Button>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Standard browser privacy policy applies
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'input' && (
              <motion.div 
                key="input"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-[#6334FD]/10 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-[#6334FD]" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Paste Bank SMS</h2>
                </div>
                <textarea
                  className="w-full h-40 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-[#6334FD] transition-all font-medium text-sm mb-6 outline-none"
                  placeholder="Paste your bank or UPI alert here..."
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                />
                <Button 
                  fullWidth 
                  size="lg" 
                  disabled={!smsText.trim()}
                  onClick={() => handleParse(smsText)}
                  icon={<Zap className="w-5 h-5" />}
                >
                  Analyze & Import
                </Button>
              </motion.div>
            )}

            {step === 'preview' && parsedResult && (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Detected Transaction</h2>
                <p className="text-gray-500 font-medium mb-8">Confirm the details before adding to your dashboard.</p>
                
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-8 text-left">
                  {parsedResult.status === 'review' && (
                    <div className="mb-4 flex items-center gap-2 bg-amber-50 text-amber-700 p-3 rounded-xl border border-amber-100">
                      <AlertCircle className="w-4 h-4 ml-0.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Needs Review: Missing Details</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Merchant</span>
                    <span className="text-sm font-bold text-gray-900 truncate ml-4 italic">{parsedResult.merchant === 'Unknown' ? 'Unknown (Check notes)' : parsedResult.merchant}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${parsedResult.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {parsedResult.type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</span>
                    <span className="text-sm font-bold text-gray-900">{parsedResult.date}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</span>
                    <span className="text-2xl font-black text-gray-900">₹{parsedResult.amount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" fullWidth onClick={() => setStep('input')}>
                    Back
                  </Button>
                  <Button fullWidth onClick={handleConfirm}>
                    Confirm & Add
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default SMSParser;
