import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Loader2, 
  BrainCircuit, 
  TrendingUp, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  Target,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../contexts/LayoutContext';
import { NAVBAR_HEIGHT, FAB_SAFE_SPACING } from '../constants';
import { SmartFinancialAnalysis, SmartFinancialInsight } from '../services/geminiService';
import { formatCurrency } from '../lib/formatCurrency';
import Button from './ui/Button';
import ConfidenceCircle from './ConfidenceCircle';
import ModalShell from './ModalShell';

interface AIAssistantButtonProps {
  onGenerate: () => Promise<SmartFinancialAnalysis | null>;
  isPremium: boolean;
  onUpgrade: () => void;
  currency: string;
}

const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({ 
  onGenerate, 
  isPremium, 
  onUpgrade,
  currency 
}) => {
  const { isNavVisible } = useLayout();
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SmartFinancialAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    // Auto show tooltip for 2 seconds on mount
    setShowTooltip(true);
    const timer = setTimeout(() => setShowTooltip(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Step 5: Fetch data inside modal
  React.useEffect(() => {
    if (isAiModalOpen && !analysis && !loading) {
      const triggerAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await onGenerate();
          if (result) {
            setAnalysis(result);
          } else {
            setError("Could not generate analysis. Please ensure you have enough financial data.");
          }
        } catch (err) {
          console.error("AI Assistant Error:", err);
          setError("An unexpected error occurred while analyzing your data.");
        } finally {
          setLoading(false);
        }
      };
      triggerAnalysis();
    }
  }, [isAiModalOpen, analysis, loading, onGenerate]);

  const handleTrigger = () => {
    if (!isPremium) {
      onUpgrade();
      return;
    }
    setIsAiModalOpen(true);
  };

  const handleClose = () => {
    setIsAiModalOpen(false);
    setAnalysis(null); 
    setError(null);
  };

  return (
    <>
      {/* FLOATING BUTTON */}
      <AnimatePresence>
        {!isAiModalOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              bottom: isNavVisible 
                ? `calc(${NAVBAR_HEIGHT + FAB_SAFE_SPACING}px + env(safe-area-inset-bottom))` 
                : `calc(${FAB_SAFE_SPACING}px + env(safe-area-inset-bottom))`
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20,
              opacity: { duration: 0.2 }
            }}
            className="fixed right-6 md:right-8 z-[10000] flex flex-col items-end"
          >
            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  className="mb-3 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap relative"
                >
                  Smart Analysis
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={handleTrigger}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              disabled={loading}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-16 h-16 bg-gradient-to-r from-[#6B66FE] to-[#6334FD] text-white rounded-full shadow-2xl shadow-indigo-200 flex items-center justify-center group overflow-hidden relative"
            >
              <motion.div
                key="icon"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="relative"
              >
                <BrainCircuit className="w-8 h-8" />
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity
                  }}
                  className="absolute -inset-2 bg-white/20 rounded-full blur-sm"
                />
              </motion.div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL / BOTTOM SHEET */}
      <ModalShell
        isOpen={isAiModalOpen}
        onClose={handleClose}
        maxWidth="2xl"
        showClose={false}
      >
        <div className="-mx-8 -mt-2">
          {/* HEADER (Re-styled for Shell) */}
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-[#6334FD]/5 sticky top-0 z-20">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-[#6334FD] rounded-2xl shadow-lg shadow-indigo-100">
                <BrainCircuit className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">AI Assistant</h2>
                <p className="text-[10px] font-black text-[#6334FD] uppercase tracking-widest">Wealth Analysis</p>
              </div>
            </div>
            <button 
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* CONTENT */}
          <div className="p-8 space-y-8 scrollbar-hide">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-black text-gray-900 tracking-tight">Analyzing Financial DNA</p>
                  <p className="text-sm text-gray-500 font-medium animate-pulse">Running wealth simulations...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
                <div className="p-4 bg-rose-50 rounded-full">
                  <AlertCircle className="w-12 h-12 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Analysis Interrupted</h3>
                  <p className="text-gray-500 mt-2 font-medium">{error}</p>
                </div>
                <Button onClick={handleClose} variant="outline">Close and try again</Button>
              </div>
            ) : analysis ? (
              <>
                {/* CURRENT STATUS */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-[#6334FD]" />
                    <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Current Status</h3>
                  </div>
                  <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">10-Year Project Net Worth</p>
                        <p className="text-3xl font-black text-[#6334FD] tracking-tighter">
                          {formatCurrency(analysis.projectedNetWorth, currency)}
                        </p>
                      </div>
                      <ConfidenceCircle 
                        confidence={analysis.confidenceScore} 
                        reason={analysis.confidenceReason}
                      />
                    </div>
                  </div>
                </section>

                {/* KEY INSIGHTS */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-[#6334FD]" />
                    <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Key Insights</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {Array.isArray(analysis.keyInsights) && analysis.keyInsights.map((insight, i) => {
                      if (typeof insight === 'string' || !insight?.type || !insight?.action) return null;

                      const typeColors = {
                        risk: {
                          bg: 'bg-rose-50',
                          border: 'border-rose-100',
                          text: 'text-rose-900',
                          icon: 'text-rose-600',
                          label: 'bg-rose-600'
                        },
                        warning: {
                          bg: 'bg-[#6334FD]/5',
                          border: 'border-[#6334FD]/10',
                          text: 'text-[#6334FD]',
                          icon: 'text-[#6334FD]',
                          label: 'bg-[#6334FD]'
                        },
                        optimization: {
                          bg: 'bg-emerald-50',
                          border: 'border-emerald-100',
                          text: 'text-emerald-900',
                          icon: 'text-emerald-600',
                          label: 'bg-emerald-600'
                        }
                      }[insight.type] || {
                        bg: 'bg-gray-50',
                        border: 'border-gray-100',
                        text: 'text-gray-900',
                        icon: 'text-gray-400',
                        label: 'bg-gray-400'
                      };

                      return (
                        <motion.div 
                          key={i}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className={`p-6 ${typeColors.bg} border ${typeColors.border} rounded-[2rem] shadow-sm space-y-4`}
                        >
                          <div className="flex items-center justify-between">
                            <div className={`px-3 py-1 ${typeColors.label} text-white text-[10px] font-black uppercase tracking-widest rounded-full`}>
                              {insight.type}
                            </div>
                            <CheckCircle2 className={`w-5 h-5 ${typeColors.icon}`} />
                          </div>

                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Problem</p>
                              <p className={`text-sm font-black ${typeColors.text}`}>{insight.problem}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Impact</p>
                              <p className="text-sm text-gray-700 font-medium leading-relaxed">{insight.impact}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fix</p>
                              <p className="text-sm text-gray-800 font-bold leading-relaxed">{insight.fix}</p>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            fullWidth
                            onClick={() => {
                              handleClose();
                              navigate(insight.action.path);
                            }}
                            className="bg-white/50 border-white/50 hover:bg-white text-gray-900 font-black text-[10px] uppercase tracking-widest"
                          >
                            {insight.action.label}
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>

                {/* RISK ALERT */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldAlert className="w-5 h-5 text-rose-500" />
                    <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Risk Assessment</h3>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-6">
                    <div className="flex items-start gap-4">
                      <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-1" />
                      <p className="text-sm text-rose-900 leading-relaxed font-medium italic">
                        "{analysis.riskAssessment}"
                      </p>
                    </div>
                  </div>
                </section>

                {/* FOOTER ACTION */}
                <div className="pt-4 pb-8 space-y-4">
                  {analysis?.suggestedModule?.path && (
                    <Button
                      fullWidth
                      size="lg"
                      onClick={() => {
                        handleClose();
                        navigate(analysis.suggestedModule.path);
                      }}
                      icon={<ArrowRight className="w-5 h-5 ml-2" />}
                      className="shadow-xl shadow-indigo-100"
                    >
                      Apply: {analysis.suggestedModule.label}
                    </Button>
                  )}
                  <p className="text-center text-[10px] text-gray-400 font-medium italic">
                    AI insights are advisory. Consult a financial professional.
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </ModalShell>
    </>
  );
};

export default AIAssistantButton;
