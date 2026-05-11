import React from 'react';
import { motion } from 'motion/react';
import { Scale, FileText, AlertCircle, CreditCard, UserX, Lightbulb, Gavel } from 'lucide-react';
import LegalPageLayout from './LegalPageLayout';

const Terms: React.FC = () => {
  const sections = [
    {
      title: "Platform Usage",
      content: "WealthOS is provided for personal financial management. You agree to use the platform only for lawful purposes. Unauthorized scraping, automated harvesting, or attempts to breach our security layers will result in permanent account termination.",
      icon: Scale
    },
    {
      title: "User Responsibility",
      content: "You are responsible for the accuracy of data you input or sync. WealthOS is a reflection of your financial reality—if you sync incorrect data, the insights will be inaccurate. You must keep your credentials secure.",
      icon: Lightbulb
    },
    {
      title: "AI Analysis Limits",
      content: "AI-generated projections and summaries are for informational purposes only. They do not constitute financial advice. WealthOS does not guarantee wealth creation or specific investment outcomes.",
      icon: AlertCircle
    },
    {
      title: "Premium Subscriptions",
      content: "Pro features are billed on a recurring basis. You can cancel at any time via Settings. All payments are non-refundable except where required by law. Subscription provides access to advanced AI modules and automation tools.",
      icon: CreditCard
    },
    {
      title: "Limitation of Liability",
      content: "WealthOS Inc. shall not be held liable for any financial losses, investment failures, or data inaccuracies resulting from your use of the platform. We provide tools; you drive your financial vehicle.",
      icon: Gavel
    },
    {
      title: "Account Termination",
      content: "We reserve the right to suspend accounts that violate our terms or engagement in abusive behavior. You may terminate your account at any time via the Security Settings panel.",
      icon: UserX
    }
  ];

  return (
    <LegalPageLayout 
      title="Terms of Service"
      subtitle="The governance framework for your usage of the WealthOS platform."
      lastUpdated="May 11, 2026"
      icon={FileText}
      iconColorClass="bg-gray-900"
    >
      <div className="space-y-16">
        {sections.map((section, i) => (
          <div 
            key={i}
            className="group"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-black text-gray-300 w-6">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="text-xl font-bold text-gray-900">{section.title}</h3>
            </div>
            <p className="text-gray-600 leading-relaxed font-medium pl-10 border-l border-gray-100 group-hover:border-indigo-100 transition-colors">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-24 p-8 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
        <div className="flex flex-col md:flex-row items-start gap-8">
          <div className="w-12 h-12 bg-white border border-indigo-100 rounded-xl flex items-center justify-center shrink-0">
             <AlertCircle className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900">Intellectual Property Notice</h3>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              All source code, visual interfaces, proprietary algorithms, and brand assets within the WealthOS environment are the exclusive intellectual property of WealthOS Inc. Reverse engineering, redistribution, or unauthorized commercial use is strictly prohibited.
            </p>
          </div>
        </div>
      </div>
    </LegalPageLayout>
  );
};

export default Terms;
