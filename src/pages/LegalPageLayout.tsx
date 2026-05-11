import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LegalPageLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated?: string;
  icon: LucideIcon;
  iconColorClass?: string;
  children: React.ReactNode;
}

const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ 
  title, 
  subtitle, 
  lastUpdated, 
  icon: Icon,
  iconColorClass = "bg-indigo-600",
  children 
}) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto py-16 px-6 pb-24">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors mb-20 group font-bold text-xs uppercase tracking-[0.2em]"
      >
        <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-20 space-y-6"
      >
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{title}</h1>
        <p className="text-lg text-gray-500 leading-relaxed max-w-2xl">{subtitle}</p>
        
        <div className="flex items-center gap-4 pt-4">
          {lastUpdated && (
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 pr-4">
              Revised: {lastUpdated}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Official Policy</span>
          </div>
        </div>
      </motion.div>

      <div className="prose prose-indigo max-w-none prose-p:text-gray-600 prose-headings:text-gray-900 prose-headings:font-bold prose-strong:text-gray-900">
        {children}
      </div>

      <div className="mt-32 pt-12 border-t border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <p className="text-xs font-black text-gray-900 uppercase tracking-[0.15em]">WealthOS Trust & Compliance</p>
            <p className="text-sm text-gray-400 max-w-md leading-relaxed">
              Our policies are designed to be as clear as our algorithms. For compliance inquiries, please contact our legal desk.
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Platform Status</p>
            <p className="text-xs font-bold text-emerald-600 mt-1 uppercase tracking-widest">Verified Infrastructure</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPageLayout;
