import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  Trophy, 
  Briefcase, 
  Wallet, 
  Settings as SettingsIcon,
  User as UserIcon,
  GraduationCap,
  ChevronRight,
  LogOut,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { auth } from '../firebase';
import { toast } from 'sonner';

const More: React.FC = () => {
  const navigate = useNavigate();

  const moreItems = [
    {
      id: 'budgets',
      title: 'Budgets',
      description: 'Manage your spending limits',
      icon: Target,
      path: '/budgets',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      id: 'goals',
      title: 'Goals',
      description: 'Track your financial targets',
      icon: Trophy,
      path: '/goals',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      id: 'portfolio',
      title: 'Portfolio',
      description: 'Your investment overview',
      icon: Briefcase,
      path: '/portfolio',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'loans',
      title: 'Loans',
      description: 'Track debts and EMIs',
      icon: Wallet,
      path: '/loans',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50'
    },
    {
      id: 'academy',
      title: 'Wealth Academy',
      description: 'Learn finance & investing',
      icon: GraduationCap,
      path: '/academy',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      id: 'profile',
      title: 'Profile',
      description: 'Your personal profile',
      icon: UserIcon,
      path: '/profile',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'App preferences & security',
      icon: SettingsIcon,
      path: '/settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
    {
      id: 'faq',
      title: 'FAQ',
      description: 'Common questions & help',
      icon: HelpCircle,
      path: '/faq',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/auth/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error("Logout error:", error);
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex items-center space-x-5">
        <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-100">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">More</h1>
          <p className="text-gray-500 font-medium">Explore all features & tools</p>
        </div>
      </div>

      {/* LIST VIEW */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {moreItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-all active:scale-[0.99] duration-150 group text-left"
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 ${item.bgColor} ${item.color} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </div>

      {/* LOGOUT BUTTON */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center space-x-3 p-6 bg-red-50 text-red-600 rounded-[2rem] font-bold hover:bg-red-100 transition-all active:scale-[0.99] duration-150 group border border-red-100/50"
      >
        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span>Logout from WealthOS</span>
      </button>

      {/* VERSION INFO */}
      <div className="text-center space-y-1 py-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">WealthOS v2.4.0</p>
        <p className="text-[10px] text-gray-300">© 2026 WealthOS Inc. All rights reserved.</p>
      </div>
    </div>
  );
};

export default More;
