import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Send, 
  Brain, 
  Zap, 
  Loader2,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../contexts/LayoutContext';
import { NAVBAR_HEIGHT, FAB_SAFE_SPACING } from '../constants';
import { trackEvent, AnalyticsEvents } from '../services/analytics';
import { generateChatResponse, ChatMessage, AIChatResponse } from '../services/geminiService';
import { formatCurrency } from '../lib/formatCurrency';
import Button from './ui/Button';
import ModalShell from './ModalShell';


interface AIChatAssistantProps {
  context: {
    netWorth: number;
    income: number;
    expenses: number;
    loans: any[];
    goals: any[];
    healthSummary: {
      state: string;
      stateLabel: string;
      stateDescription: string;
    };
    userProfile?: any;
  };
  isPremium: boolean;
  onUpgrade: () => void;
  currency: string;
}

const QUICK_PROMPTS = [
  "How can I reduce my expenses?",
  "How can I achieve my goals faster?",
  "Am I financially healthy?",
  "How to manage my loans?"
];

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ 
  context, 
  isPremium, 
  onUpgrade,
  currency 
}) => {
  const { isNavVisible } = useLayout();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Show tooltip for 2 seconds on mount
    const timer = setTimeout(() => setShowTooltip(true), 1500);
    const hideTimer = setTimeout(() => setShowTooltip(false), 5000);
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      trackEvent(AnalyticsEvents.AI_CHAT_OPENED);
    }
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    
    if (!isPremium) {
      onUpgrade();
      return;
    }

    const userMessage: ChatMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await generateChatResponse(text, messages, context);
      
      let botText = '';
      if (typeof response === 'string') {
        botText = response;
      } else {
        // Handle structured JSON response
        botText = JSON.stringify(response); // We'll parse this in the UI
      }

      const botMessage: ChatMessage = { role: 'model', text: botText };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: "I'm sorry, I'm having trouble processing that right now." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessageContent = (message: ChatMessage) => {
    if (message.role === 'user') {
      return (
        <div className="bg-[#6334FD] text-white p-4 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] self-end">
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      );
    }

    // Try to parse structured AI response
    try {
      let textToParse = message.text.trim();
      
      // Sanitization: Remove markdown code blocks if present
      if (textToParse.includes("```")) {
        textToParse = textToParse.replace(/```json\n?|```\n?/g, "").trim();
      }

      if (textToParse.startsWith('{') && textToParse.endsWith('}')) {
        const data = JSON.parse(textToParse) as AIChatResponse;
        return (
          <div className="space-y-4 w-full max-w-[90%]">
            <div className="bg-white border border-gray-100 p-6 rounded-3xl rounded-tl-none shadow-xl space-y-5 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Brain className="w-14 h-14 text-[#6334FD]" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">💡 Problem</p>
                </div>
                <p className="text-sm font-bold text-gray-900 leading-relaxed pl-1">{data.problemSummary}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.15em]">🔍 Insight</p>
                </div>
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                  <p className="text-sm text-indigo-900 font-medium leading-relaxed italic">"{data.keyInsight}"</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">✅ Action Plan</p>
                </div>
                <ul className="space-y-3 pl-1">
                  {Array.isArray(data.actionSteps) && data.actionSteps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700 font-medium group">
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 shadow-sm group-hover:scale-110 transition-transform">
                        {i + 1}
                      </div>
                      <span className="leading-tight">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {data.projection && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 rotate-180" />
                    </div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.15em]">📈 Projection</p>
                  </div>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed italic pl-1">
                    {data.projection}
                  </p>
                </div>
              )}

              {data.suggestedModule && (
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    navigate(data.suggestedModule!.path);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-gray-900 text-white rounded-2xl hover:bg-gray-800 transition-all group mt-2 active:scale-[0.98] shadow-lg shadow-gray-200"
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] ml-2">Go to {data.suggestedModule.name}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>
        );
      }
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
    }

    // Fallback or plain text chat
    const isLikelyFailedJson = message.text.trim().startsWith('{');
    const displayMessage = isLikelyFailedJson 
      ? "I analyzed your data but had a small technical glitch formatting the response. Let me try to summarize: " + message.text.substring(0, 100) + "..."
      : message.text;

    return (
      <div className="bg-gray-100 text-gray-800 p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[85%]">
        <p className="text-sm font-medium leading-relaxed">{displayMessage}</p>
      </div>
    );
  };

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!isOpen && (
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
                  Ask AI
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={() => setIsOpen(true)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-16 h-16 bg-[#6334FD] text-white rounded-full shadow-2xl shadow-indigo-200 flex items-center justify-center relative overflow-hidden group"
            >
              <Sparkles className="w-8 h-8 relative z-10" />
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 bg-white/30 rounded-full blur-md"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHAT INTERFACE */}
      <ModalShell
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="lg"
        showClose={false}
      >
        <div className="-mx-8 -mt-2 flex flex-col h-[75vh] md:h-[600px]">
          {/* HEADER */}
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight leading-tight">Advisor</h3>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Wealth Intelligence</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth scrollbar-hide">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
                <div className="p-4 bg-indigo-50 rounded-full animate-bounce">
                  <Sparkles className="w-10 h-10 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-gray-900 tracking-tight">How can I help you today?</h4>
                  <p className="text-sm text-gray-500 mt-2 max-w-[240px] font-medium leading-relaxed">I have access to your finances and can help you plan your wealth.</p>
                </div>
                
                <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                  {QUICK_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(prompt)}
                      className="px-4 py-3 text-sm font-bold text-left bg-gray-50 hover:bg-white hover:border-indigo-400 border border-transparent rounded-2xl transition-all active:scale-[0.98]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {renderMessageContent(msg)}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3 self-start">
                <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-none animate-pulse flex items-center gap-2">
                   <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                   <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Analyzing Data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div className="p-6 border-t border-gray-100 bg-gray-50/50 sticky bottom-0 z-20 shrink-0">
            {messages.length > 0 && (
               <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your finances..."
                className="flex-1 bg-white border border-gray-100 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/20 transition-all outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-4 bg-[#6334FD] text-white rounded-2xl shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 disabled:bg-gray-300 disabled:scale-100 transition-all shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <div className="mt-4 flex items-center justify-center gap-1.5 opacity-40">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-900" />
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-900">End-to-End Encrypted Intelligence</span>
            </div>
          </div>
        </div>
      </ModalShell>
    </>
  );
};

export default AIChatAssistant;
