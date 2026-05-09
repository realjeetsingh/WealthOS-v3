import React from 'react';
import { motion } from 'motion/react';
import { FileText, Shield, Scale, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Terms: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing or using WealthOS, you agree to be bound by these Terms and Conditions. If you disagree with any part of the terms, you may not access the service."
    },
    {
      title: "2. Subscription & Payments",
      content: "Pro features are provided on a subscription basis (₹199/mo or ₹1499/yr). Payments are processed securely via third-party providers. Subscriptions can be canceled at any time from your account settings."
    },
    {
      title: "3. Financial Disclaimer",
      content: "WealthOS is a financial tracking and analysis tool. The insights, projections, and AI recommendations are for informational purposes only and do NOT constitute professional financial, investment, or legal advice. Always consult with a certified professional before making significant financial decisions."
    },
    {
      title: "4. Data SMS Sync",
      content: "WealthOS requests SMS access to automate expense tracking. We only parse financial transaction alerts. Personal messages are never processed or stored on our servers. You are responsible for granting and managing these permissions."
    },
    {
      title: "5. Limitation of Liability",
      content: "WealthOS shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service, including but not limited to financial losses or data inaccuracies."
    }
  ];

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors mb-8 font-bold"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        Back
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-gray-100">
          <Scale className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Terms of Service</h1>
        <p className="text-xl text-gray-500">The rules of the platform and our mutual agreement.</p>
      </motion.div>

      <div className="space-y-12">
        {sections.map((s, i) => (
          <section key={i} className="space-y-4">
            <h3 className="text-xl font-black text-gray-900">{s.title}</h3>
            <p className="text-gray-600 leading-relaxed font-medium">{s.content}</p>
          </section>
        ))}
      </div>

      <div className="mt-16 p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 italic text-sm text-gray-400 text-center">
        Last Updated: May 2026 • © WealthOS Growth Systems
      </div>
    </div>
  );
};

export default Terms;
