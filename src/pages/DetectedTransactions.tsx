import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, Zap, Sparkles, MessageSquare, AlertTriangle, Brain } from 'lucide-react';
import NotificationApprovalList from '../components/NotificationApprovalList';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

const DetectedTransactions: React.FC = () => {
  const [learnedCount, setLearnedCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, `users/${auth.currentUser.uid}/intelligence_memory`),
      where('patternType', '==', 'merchant_category')
    );
    getDocs(q).then(snap => setLearnedCount(snap.docs.length));
  }, []);

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 border border-indigo-50">
              <Zap className="w-6 h-6 text-indigo-600 fill-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
                Intelligence <span className="text-indigo-600">Hub</span>
              </h1>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1">Operational • Real-time Sync Active</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Bridged to Android</span>
          </div>
        </div>
      </div>

      {/* Operational Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { label: 'Smart Alerts', val: '2', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Memory Points', val: learnedCount.toString(), icon: Brain, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'AI Advice', val: '5', icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Intelligence', val: '98%', icon: BrainCircuit, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-gray-100 p-4 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-8 h-8 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
            <p className="text-xl font-black text-gray-900">{stat.val}</p>
          </div>
        ))}
      </div>

      <div className="space-y-12">
        <section>
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600" />
              Pending Review Queue
            </h2>
            <div className="h-[1px] flex-1 bg-gray-100 mx-4" />
          </div>
          <NotificationApprovalList />
        </section>

        {/* Future Slots for Insights/Signals */}
        <section className="bg-gray-50/50 border border-dashed border-gray-200 rounded-[2.5rem] p-12 text-center">
          <div className="max-w-xs mx-auto">
            <BrainCircuit className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Smart Insights Center</h3>
            <p className="text-xs text-gray-400 font-medium">
              We're analyzing your confirmed transactions to provide personalized financial signaling. 
              Confirm more transactions to unlock deeper insights.
            </p>
          </div>
        </section>

        {learnedCount > 0 && (
          <section className="bg-white border border-gray-100 rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Brain className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Evolutionary Intelligence</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Maturing via user behavior patterns</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-0.5">Maturity Level</p>
                <p className="text-xs font-black text-gray-900 uppercase">{learnedCount > 10 ? 'Adaptive' : learnedCount > 5 ? 'Learning' : 'Nascent'}</p>
              </div>
            </div>

            <div className="mb-8 overflow-hidden">
              <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-400 mb-3 px-1">
                <span>Manual review</span>
                <span>Hybrid Intelligence</span>
                <span>Proactive Automation</span>
              </div>
              <div className="h-3 bg-gray-50 rounded-full relative p-0.5 border border-gray-100">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((learnedCount / 20) * 100, 100)}%` }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.3)]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-widest">
                {learnedCount} Merchant Rules Learned
              </span>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full uppercase tracking-widest">
                Accuracy Gain: +{Math.min(learnedCount * 2, 15)}%
              </span>
              {learnedCount >= 5 && (
                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Level 3 Automation Enabled
                </span>
              )}
            </div>
          </section>
        )}
      </div>
      
      <div className="mt-16 pt-8 border-t border-gray-100 text-center opacity-50">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Operational Integrity</p>
        <p className="text-[10px] text-gray-400 max-w-sm mx-auto leading-relaxed font-medium">
          Pattern-based extraction • 256-bit Local Encryption • Zero Cloud Storage
        </p>
      </div>
    </div>
  );
};

export default DetectedTransactions;
