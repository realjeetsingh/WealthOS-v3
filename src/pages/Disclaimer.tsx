import React from 'react';
import { motion } from 'motion/react';
import { Octagon, ShieldAlert, BarChart3, TrendingDown, Users, Sparkles, AlertTriangle } from 'lucide-react';
import LegalPageLayout from './LegalPageLayout';

const Disclaimer: React.FC = () => {
  const points = [
    {
      title: "Not a Financial Advisor",
      content: "WealthOS is a technology company, not a fiduciary. We are not a licensed financial advisor, tax professional, or legal counsel. We do not provide personalized financial planning beyond data mathematical modeling.",
      icon: Users
    },
    {
      title: "Informational Purposes Only",
      content: "All data, insights, charts, and AI-generated narratives are for educational and informational purposes. They should be used as one of many inputs in your overall financial strategy.",
      icon: BarChart3
    },
    {
      title: "No Guarantees",
      content: "Wealth building is subject to market risks and personal economic shifts. WealthOS does not guarantee specific net worth grown, debt reduction, or investment success. Past performance is not an indicator of future results.",
      icon: TrendingDown
    },
    {
      title: "User Responsibility",
      content: "You are the final decision-maker. Any action you take based on WealthOS insights is your sole responsibility. We strongly recommend consulting with a certified financial planner (CFP) for complex maneuvers.",
      icon: ShieldAlert
    },
    {
      title: "AI & Data Inaccuracy",
      content: "AI algorithms can hallucinate or interpret transaction metadata incorrectly. Our intelligence engine is a tool to aid human judgment, not replace it. Always verify critical balance sheets manually.",
      icon: Sparkles
    }
  ];

  return (
    <LegalPageLayout 
      title="Financial Disclaimer"
      subtitle="Defining the scope of our technology and your responsibilities as a user."
      lastUpdated="May 11, 2026"
      icon={Octagon}
      iconColorClass="bg-rose-600"
    >
      <div className="bg-rose-50 border border-rose-100 rounded-xl p-8 mb-16">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-1" />
          <p className="text-rose-900 font-bold leading-relaxed">
            Legal Notice: Financial decisions based exclusively on automated insights without qualified human verification involve significant risk. WealthOS is an analytical tool, not a substitute for professional advisory services.
          </p>
        </div>
      </div>

      <div className="space-y-16">
        {points.map((point, i) => (
          <div 
            key={i}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <point.icon className="w-4 h-4 text-rose-600" />
              <h3 className="text-xl font-bold text-gray-900">{point.title}</h3>
            </div>
            <p className="text-gray-600 leading-relaxed font-medium pl-7 text-base">
              {point.content}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-24 p-12 bg-gray-50 border border-gray-200/60 rounded-2xl">
        <h4 className="text-gray-900 text-xl font-bold mb-4">Risk Awareness</h4>
        <p className="text-gray-500 leading-relaxed font-medium">
          The WealthOS environment is designed to visualize and project personal financial data based on mathematical models. Users should exercise caution and conduct independent verification of all intelligence outputs before making capital allocations.
        </p>
      </div>
    </LegalPageLayout>
  );
};

export default Disclaimer;
