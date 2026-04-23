import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Loader2, 
  BrainCircuit, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  Target,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../contexts/LayoutContext';
import { SmartFinancialAnalysis, SmartFinancialInsight } from '../services/geminiService';
import { formatCurrency } from '../lib/formatCurrency';
import Button from './ui/Button';
import ConfidenceCircle from './ConfidenceCircle';

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
                ? 'calc(90px + env(safe-area-inset-bottom))' 
                : 'calc(20px + env(safe-area-inset-bottom))'
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
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* HEADER */}
              <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between bg-[#6334FD]/5 shrink-0">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-[#6334FD] rounded-2xl shadow-lg shadow-indigo-100">
                    <BrainCircuit className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">AI Financial Assistant</h2>
                    <p className="text-xs font-bold text-[#6334FD] uppercase tracking-widest">Intelligent Wealth Analysis</p>
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
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-hide pb-[120px]">
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
                      <p className="text-sm text-gray-500 font-medium animate-pulse">Running 10-year wealth simulations...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
                    <div className="p-4 bg-rose-50 rounded-full">
                      <AlertTriangle className="w-12 h-12 text-rose-500" />
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
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Current Status</h3>
                      </div>
                      <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">10-Year Projected Net Worth</p>
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
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Key Insights</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {analysis.keyInsights.map((insight, i) => {
                          // Guard against legacy string insights or malformed data
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
                          }[insight.type];

                          if (!typeColors) return null;

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
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Risk Assessment</h3>
                      </div>
                      <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6">
                        <div className="flex items-start gap-4">
                          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-1" />
                          <p className="text-sm text-rose-900 leading-relaxed font-medium italic">
                            "{analysis.riskAssessment}"
                          </p>
                        </div>
                      </div>
                    </section>

                    {/* RECOMMENDATIONS */}
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Target className="w-5 h-5 text-[#6334FD]" />
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Strategic Recommendation</h3>
                      </div>
                      <div className="space-y-3">
                        {analysis.strategicPlan.shortTerm.map((step, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 bg-[#6334FD]/5 border border-[#6334FD]/10 rounded-2xl">
                            <ArrowRight className="w-4 h-4 text-[#6334FD] shrink-0" />
                            <p className="text-sm text-[#6334FD] font-bold">{step}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                ) : null}
              </div>

              {/* FOOTER */}
              <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 shrink-0">
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
                    Apply Recommendation: {analysis.suggestedModule.label}
                  </Button>
                )}
                <p className="text-center text-[10px] text-gray-400 mt-4 font-medium italic">
                  AI insights are advisory. Consult a financial professional for critical decisions.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistantButton;
