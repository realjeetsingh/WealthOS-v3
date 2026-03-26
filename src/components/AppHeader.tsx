import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  BrainCircuit, 
  ReceiptText, 
  Crown,
  LogOut,
  User as UserIcon,
  Wallet
} from 'lucide-react';
import { auth } from '../firebase';

const AppHeader: React.FC = () => {
  const { userProfile, isPremium } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/insights', label: 'Insights', icon: BrainCircuit },
    { to: '/transactions', label: 'Transactions', icon: ReceiptText },
    { to: '/loans', label: 'Loans', icon: Wallet },
  ];

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-2xl font-display">W</span>
              </div>
              <span className="text-2xl font-bold text-gray-900 tracking-tight font-display">WealthOS</span>
            </Link>

            <nav className="hidden md:flex space-x-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      isActive 
                        ? 'bg-indigo-50 text-[#4F46E5] shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#4F46E5]' : 'text-gray-400'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {isPremium && (
              <div className="flex items-center space-x-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-100">
                <Crown className="w-3 h-3" />
                <span>PREMIUM</span>
              </div>
            )}
            
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-100">
              <Link to="/" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <UserIcon className="w-4 h-4 text-gray-600 group-hover:text-indigo-600" />
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                  {userProfile?.name?.split(' ')[0] || 'Profile'}
                </span>
              </Link>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <nav className="md:hidden border-t border-gray-50 bg-gray-50/50 px-4 py-2 flex justify-around">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center space-y-1 px-2 py-1 rounded-md transition-colors ${
                isActive 
                  ? 'text-indigo-700' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
};

export default AppHeader;
