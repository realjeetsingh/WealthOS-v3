import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Eye, Database, Globe, FileText, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Privacy: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Data Collection",
      content: "We collect information you provide directly to us, such as when you create an account, add financial transactions, or contact support. This includes your name, email address, and financial records you choose to track.",
      icon: Database
    },
    {
      title: "How We Use Your Data",
      content: "Your data is used solely to provide and improve the WealthOS experience. This includes calculating your net worth, providing AI-powered financial insights, and sending you relevant alerts about your budget and expenses.",
      icon: Eye
    },
    {
      title: "Data Security",
      content: "We implement robust security measures to protect your personal and financial information. We use industry-standard encryption and secure cloud infrastructure provided by Google Firebase.",
      icon: Lock
    },
    {
      title: "Third-Party Sharing",
      content: "We do not sell your personal data. We only share information with third-party service providers (like Firebase) necessary to operate our platform, and only to the extent required for those services.",
      icon: Globe
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
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
        className="mb-16"
      >
        <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-100">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Privacy Policy</h1>
        <p className="text-xl text-gray-500">Last updated: April 9, 2026</p>
      </motion.div>

      <div className="prose prose-indigo max-w-none">
        <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm mb-12">
          <p className="text-lg text-gray-600 leading-relaxed mb-0">
            At WealthOS, we take your privacy seriously. This policy outlines how we handle your data and the steps we take to ensure your financial information remains secure and private.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {sections.map((section, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-50 rounded-3xl p-8 border border-gray-100"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm mb-6">
                <section.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{section.title}</h3>
              <p className="text-gray-600 leading-relaxed">{section.content}</p>
            </motion.div>
          ))}
        </div>

        <div className="bg-indigo-50 rounded-[2.5rem] p-10 border border-indigo-100">
          <div className="flex items-start space-x-6">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Your Rights</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                You have the right to access, correct, or delete your personal information at any time. You can manage your data directly through the Settings page in the WealthOS app.
              </p>
              <p className="text-gray-600 leading-relaxed">
                If you have any questions about our privacy practices, please contact us at <span className="font-bold text-indigo-600">privacy@wealthos.app</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
