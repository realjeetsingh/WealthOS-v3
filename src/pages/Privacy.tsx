import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Eye, Database, Globe, FileText, Bell, PenTool as Tool, UserCheck } from 'lucide-react';
import LegalPageLayout from './LegalPageLayout';

const Privacy: React.FC = () => {
  const sections = [
    {
      title: "Data We Collect",
      content: "WealthOS collects information necessary to build your financial profile. This includes profile identifiers (name, email), financial inputs (income, expenses, goals, loans), and metadata required for platform stability. We prioritize minimalism—if we don't need it to provide insights, we don't collect it.",
      icon: Database
    },
    {
      title: "Automated Transaction Logic",
      content: "When you enable automation, WealthOS parses financial notifications to map cashflow. This process is designed with the 'Local First' principle. We identify spend patterns without storing raw, non-financial textual content on our primary analytics servers.",
      icon: Eye
    },
    {
      title: "Device Permissions",
      content: "WealthOS requests specific permissions (SMS, Notifications, Storage) only when functional features require them. We do not engage in 'background scraping' or data collection outside the explicit scope of financial management functionality.",
      icon: UserCheck
    },
    {
      title: "Storage & Protection",
      content: "Your data is encrypted in transit and at rest. We utilize Google Firebase's enterprise-grade security infrastructure. Critical financial identifiers are partitioned to ensure that even in the event of a breach, identifiable data remains difficult to correlate.",
      icon: Lock
    },
    {
      title: "AI Analysis Boundaries",
      content: "Our AI Financial Assistant uses anonymized context to generate advice. Your raw credentials or full unmasked identity are never sent to external LLM providers. Insights are generated based on mathematical patterns and historical velocity.",
      icon: Bell
    },
    {
      title: "Third-Party Integrations",
      content: "We use trusted partners like Firebase (authentication and database) and Google Gemini (AI insights). We do not sell data to third-party brokers. These partners are governed by strict data processing agreements that prohibit processing for advertising.",
      icon: Globe
    }
  ];

  return (
    <LegalPageLayout 
      title="Privacy Policy"
      subtitle="Our commitment to the security and confidentiality of your financial data."
      lastUpdated="May 11, 2026"
      icon={Shield}
      iconColorClass="bg-emerald-600"
    >
      <section className="space-y-6">
        <p className="text-lg font-semibold text-gray-900 border-l-4 border-indigo-600 pl-6 py-1">
          Privacy is not a feature; it is a fundamental requirement for financial intelligence. 
        </p>
        <p>
          This policy outlines how WealthOS Inc. ("we," "our," or "the Platform") manages, protects, and utilizes the information you provide. Our architecture is built to ensure that your financial identity remains private while providing you with necessary insights.
        </p>
      </section>

      <div className="space-y-16 mt-16">
        {sections.map((section, i) => (
          <div 
            key={i}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-50 text-gray-400 rounded-lg flex items-center justify-center">
                <section.icon className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
            </div>
            <div className="text-gray-600 leading-relaxed pl-11">
              {section.content}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-24 p-10 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-8">
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">Data Ownership & Deletion</h3>
          <p className="text-gray-600 leading-relaxed font-medium">
            At any time, you may request an export of your stored financial records or initiate a permanent account deletion. Upon deletion, all financial profile data, asset history, and transaction mappings are scrubbed from our production databases and backup cycles according to our data retention schedule.
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between pt-6 border-t border-gray-200/60 gap-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inquiries: privacy@wealthos.app</p>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">
             <Shield className="w-4 h-4" /> Built for Global Data Standards
          </div>
        </div>
      </div>
    </LegalPageLayout>
  );
};

export default Privacy;
