import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LifeBuoy, 
  MessageSquare, 
  FileText, 
  Shield, 
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const SupportSettings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showHelpModal, setShowHelpModal] = useState(false);

  const supportLinks = [
    { 
      label: 'Help Center', 
      icon: LifeBuoy, 
      onClick: () => setShowHelpModal(true) 
    },
    { 
      label: 'Contact Support', 
      icon: MessageSquare, 
      onClick: () => window.location.href = `mailto:realjeetsingh@gmail.com?subject=WealthOS Support Request&body=Hi Support Team,%0D%0A%0D%0A[Describe your issue here]%0D%0A%0D%0AUser ID: ${user?.uid}`
    },
    { 
      label: 'FAQs', 
      icon: FileText, 
      onClick: () => navigate('/faq') 
    },
    { 
      label: 'Privacy Policy', 
      icon: Shield, 
      onClick: () => navigate('/privacy') 
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-xl transition-all"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 space-y-4">
        {supportLinks.map((link) => (
          <button 
            key={link.label}
            onClick={link.onClick}
            className="w-full flex items-center justify-between p-6 rounded-2xl hover:bg-indigo-50 transition-all active:scale-[0.98] duration-150 group border border-transparent hover:border-indigo-100 text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm transition-all">
                <link.icon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-700 group-hover:text-indigo-900 transition-colors">{link.label}</span>
                <p className="text-xs text-gray-400">Get help with your account and data</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
          </button>
        ))}

        <div className="pt-8">
          <button className="w-full py-4 bg-gray-50 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-all flex items-center justify-center">
            <ExternalLink className="w-4 h-4 mr-2" />
            Visit Knowledge Base
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center p-10 border-b border-gray-100 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <LifeBuoy className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Help Center</h3>
                    <p className="text-sm text-gray-500 mt-1">Frequently Asked Questions</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHelpModal(false)}
                  className="p-3 hover:bg-gray-100 rounded-2xl transition-all"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="p-10 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                {[
                  {
                    q: "How is my net worth calculated?",
                    a: "WealthOS aggregates your cash balance, portfolio assets, and subtracts any active loan balances to give you a real-time net worth snapshot."
                  },
                  {
                    q: "Is my financial data secure?",
                    a: "Yes, we use industry-standard encryption and secure Firebase infrastructure. Your data is private and only accessible by you."
                  },
                  {
                    q: "How do I upgrade to Pro?",
                    a: "You can upgrade by clicking the 'Upgrade to Pro' card on your profile or dashboard. Pro unlocks advanced insights and unlimited tracking."
                  }
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <h4 className="font-bold text-gray-900">{item.q}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupportSettings;
