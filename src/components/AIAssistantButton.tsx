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
import { SmartFinancialAnalysis } from '../services/geminiService';
import { formatCurrency } from '../lib/formatCurrency';
import Button from './ui/Button';

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
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SmartFinancialAnalysis | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    // Auto show tooltip for 2 seconds on mount
    setShowTooltip(true);
    const timer = setTimeout(() => setShowTooltip(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleTrigger = async () => {
    if (!isPremium) {
      onUpgrade();
      return;
    }

    setLoading(true);
    try {
      const result = await onGenerate();
      if (result) {
        setAnalysis(result);
        setIsOpen(true);
      }
    } catch (error) {
      console.error("AI Assistant Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FLOATING BUTTON */}
      <div className="fixed bottom-[calc(90px+env(safe-area-inset-bottom))] md:bottom-8 right-6 md:right-8 z-[10000] flex flex-col items-end">
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
          className="w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-200 flex items-center justify-center group overflow-hidden relative"
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, rotate: -180 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 180 }}
              >
                <Loader2 className="w-8 h-8 animate-spin" />
              </motion.div>
            ) : (
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
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* MODAL / BOTTOM SHEET */}
      <AnimatePresence>
        {isOpen && analysis && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
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
              <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between bg-indigo-50/30 shrink-0">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                    <BrainCircuit className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">AI Financial Assistant</h2>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Intelligent Wealth Analysis</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {/* CONTENT */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-hide pb-[120px]">
                {/* CURRENT STATUS */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Current Status</h3>
                  </div>
                  <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">10-Year Projected Net Worth</p>
                        <p className="text-3xl font-black text-gray-900 tracking-tighter">
                          {formatCurrency(analysis.projectedNetWorth, currency)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="w-10 h-10 rounded-full border-4 border-indigo-100 flex items-center justify-center relative">
                          <svg className="w-full h-full -rotate-90">
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              strokeDasharray={100.53}
                              strokeDashoffset={100.53 - (100.53 * analysis.confidenceScore / 100)}
                              className="text-indigo-600"
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-[10px] font-black">{analysis.confidenceScore}%</span>
                        </div>
                        <span className="text-xs font-bold text-gray-500">Confidence Score</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* KEY INSIGHTS */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Key Insights</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {analysis.keyInsights.map((insight, i) => (
                      <motion.div 
                        key={i}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm"
                      >
                        <div className="w-6 h-6 bg-indigo-50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div className="flex-1 space-y-2">
                          {insight.includes('|') ? (
                            insight.split('|').map((part, index) => {
                              const [label, content] = part.split(':').map(s => s.trim());
                              if (!content) return <p key={index} className="text-sm text-gray-700 leading-relaxed font-medium">{part}</p>;
                              
                              const colors: Record<string, string> = {
                                'PROBLEM': 'text-rose-600',
                                'INSIGHT': 'text-indigo-600',
                                'RECOMMENDATION': 'text-emerald-600'
                              };

                              return (
                                <div key={index} className="text-sm">
                                  <span className={`font-black text-[10px] uppercase tracking-widest mr-2 ${colors[label] || 'text-gray-400'}`}>
                                    {label}
                                  </span>
                                  <span className="text-gray-700 font-medium leading-relaxed">{content}</span>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-gray-700 leading-relaxed font-medium">{insight}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
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
                    <Target className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Strategic Recommendation</h3>
                  </div>
                  <div className="space-y-3">
                    {analysis.strategicPlan.shortTerm.map((step, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                        <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                        <p className="text-sm text-emerald-900 font-bold">{step}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* FOOTER */}
              <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 shrink-0">
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => {
                    setIsOpen(false);
                    navigate(analysis.suggestedModule.path);
                  }}
                  icon={<ArrowRight className="w-5 h-5 ml-2" />}
                  className="shadow-xl shadow-indigo-100"
                >
                  Apply Recommendation: {analysis.suggestedModule.label}
                </Button>
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
