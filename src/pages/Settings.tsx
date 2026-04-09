import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  User as UserIcon,
  ShieldCheck,
  Globe,
  Bell,
  Database,
  LifeBuoy,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { auth } from '../firebase';
import { toast } from 'sonner';

const Settings: React.FC = () => {
  const navigate = useNavigate();

  const settingsItems = [
    {
      id: 'account',
      title: 'Account',
      description: 'Personal info, phone, currency',
      icon: UserIcon,
      path: '/settings/account',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Password, 2FA, biometric',
      icon: ShieldCheck,
      path: '/settings/security',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      id: 'preferences',
      title: 'App Preferences',
      description: 'Theme, language, display',
      icon: Globe,
      path: '/settings/preferences',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Alerts, budgets, updates',
      icon: Bell,
      path: '/settings/notifications',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      id: 'privacy',
      title: 'Data & Privacy',
      description: 'Export, reset, delete account',
      icon: Database,
      path: '/settings/privacy',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      id: 'support',
      title: 'Help & Support',
      description: 'FAQ, contact, privacy policy',
      icon: LifeBuoy,
      path: '/settings/support',
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
        <div className="w-14 h-14 bg-[#4F46E5] rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
          <SettingsIcon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
          <p className="text-gray-500 font-medium">System control center & preferences</p>
        </div>
      </div>

      {/* LIST VIEW */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {settingsItems.map((item) => (
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

export default Settings;
