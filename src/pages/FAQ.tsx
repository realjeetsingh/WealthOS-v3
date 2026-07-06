import React from 'react';
import { motion } from 'motion/react';
import { HelpCircle, ChevronRight, MessageSquare, Mail, ShieldCheck, TrendingUp, BrainCircuit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FAQ: React.FC = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      q: "Is my financial data secure?",
      a: "Yes, WealthOS uses industry-standard encryption and Firebase's secure infrastructure to protect your data. Your information is only accessible by you.",
      icon: ShieldCheck
    },
    {
      q: "How does the AI insight feature work?",
      a: "Our AI analyzes your spending patterns and income to provide personalized suggestions for saving and investing. It uses historical data to project your future wealth.",
      icon: BrainCircuit
    },
    {
      q: "Can I use WealthOS for free?",
      a: "Yes! WealthOS offers a comprehensive free tier that includes transaction tracking, basic budgeting, and goal setting. Premium features offer advanced analytics and projections.",
      icon: Sparkles
    },
    {
      q: "How do I track my investments?",
      a: "You can manually add your assets (stocks, crypto, real estate) in the Portfolio section. We are working on automated bank and brokerage connections for future updates.",
      icon: TrendingUp
    },
    {
      q: "What happens if I delete my account?",
      a: "Deleting your account permanently removes all your data from our servers. This action cannot be undone.",
      icon: Trash2
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200">
          <HelpCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Frequently Asked Questions</h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">Everything you need to know about WealthOS and managing your finances.</p>
      </motion.div>

      <div className="space-y-6">
        {faqs.map((faq, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 flex-shrink-0 group-hover:scale-110 transition-transform">
                <faq.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{faq.q}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-16 p-10 bg-indigo-600 rounded-[2.5rem] text-center text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-indigo-100 mb-8 max-w-md mx-auto">Can't find the answer you're looking for? Please chat with our friendly team.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => window.location.href = 'mailto:support@wealthos.app'}
              className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center"
            >
              <Mail className="w-5 h-5 mr-2" />
              Email Support
            </button>
            <button 
              className="px-8 py-4 bg-indigo-500 text-white rounded-2xl font-bold hover:bg-indigo-400 transition-all flex items-center"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Live Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import { Sparkles, Trash2 } from 'lucide-react';

export default FAQ;
