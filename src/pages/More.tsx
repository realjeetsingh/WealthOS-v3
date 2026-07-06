import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  Trophy, 
  Briefcase, 
  Wallet, 
  Settings as SettingsIcon,
  GraduationCap,
  ChevronRight,
  LogOut,
  HelpCircle,
  ShieldCheck,
  Scale,
  Octagon,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { auth } from '../firebase';
import { toast } from 'sonner';
import Button from '../components/ui/Button';

const More: React.FC = () => {
  const navigate = useNavigate();

  const coreFeatures = [
    {
      id: 'budgets',
      title: 'Budgets',
      icon: Target,
      path: '/budgets',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      id: 'goals',
      title: 'Goals',
      icon: Trophy,
      path: '/goals',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      id: 'portfolio',
      title: 'Portfolio',
      icon: Briefcase,
      path: '/portfolio',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'loans',
      title: 'Loans',
      icon: Wallet,
      path: '/loans',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50'
    }
  ];

  const utilities = [
    {
      id: 'settings',
      title: 'Settings',
      icon: SettingsIcon,
      path: '/settings',
      color: 'text-gray-600'
    },
    {
      id: 'faq',
      title: 'Help & Support',
      icon: HelpCircle,
      path: '/faq',
      color: 'text-gray-600'
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      icon: ShieldCheck,
      path: '/privacy',
      color: 'text-gray-600'
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      icon: Scale,
      path: '/terms',
      color: 'text-gray-600'
    },
    {
      id: 'disclaimer',
      title: 'Financial Disclaimer',
      icon: Octagon,
      path: '/disclaimer',
      color: 'text-gray-600'
    }
  ];

  const handleLogout = async () => {
    try {
      localStorage.setItem('wealthos_manual_logout', 'true');
      await auth.signOut();
      navigate('/auth/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error("Logout error:", error);
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex items-center space-x-4 mb-2">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">More</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Explore all features</p>
        </div>
      </div>

      {/* STEP 1 — HERO CARD (WEALTH ACADEMY) */}
      <div className="relative group overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 shadow-xl shadow-indigo-100">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Wealth Academy</h2>
            </div>
            <p className="text-indigo-100 font-medium max-w-sm">
              Master your money with bite-sized lessons on investing, taxes, and wealth building.
            </p>
            <Button 
              onClick={() => navigate('/academy')}
              className="bg-white text-indigo-600 hover:bg-indigo-50 font-black text-xs uppercase tracking-widest px-8"
              icon={<ArrowRight className="w-4 h-4 ml-2" />}
            >
              Start Learning
            </Button>
          </div>
        </div>
      </div>

      {/* STEP 4 — SECTION HEADER */}
      <div className="pt-2">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">Tools</h3>
        
        {/* STEP 2 — GRID SECTION (CORE FEATURES) */}
        <div className="grid grid-cols-2 gap-3">
          {coreFeatures.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-start p-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group text-left"
            >
              <div className={`w-12 h-12 ${item.bgColor} ${item.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <item.icon className="w-6 h-6" />
              </div>
              <h4 className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{item.title}</h4>
              <div className="mt-2 flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <span>Open</span>
                <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 4 — SECTION HEADER */}
      <div className="pt-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">Settings & Support</h3>
        
        {/* STEP 3 — UTILITIES AS LIST */}
        <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-50">
            {utilities.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-50 text-gray-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 rounded-lg transition-colors">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-gray-700 group-hover:text-gray-900 transition-colors">{item.title}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-5 hover:bg-red-50 transition-colors group"
            >
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-red-50 text-red-400 rounded-lg">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="font-bold text-red-600">Logout</span>
              </div>
              <ChevronRight className="w-5 h-5 text-red-200 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
      </div>

      {/* VERSION INFO */}
      <div className="text-center space-y-1 pt-8">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">WealthOS v2.4.0</p>
        <p className="text-[10px] text-gray-300">© 2026 WealthOS Inc. All rights reserved.</p>
      </div>
    </div>
  );
};

export default More;
