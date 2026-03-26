import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  BrainCircuit, 
  ReceiptText, 
  Crown,
  LogOut,
  User as UserIcon,
  Wallet,
  Settings as SettingsIcon,
  ChevronDown
} from 'lucide-react';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

const AppHeader: React.FC = () => {
  const { userProfile, isPremium } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <Link to="/dashboard" className="flex items-center space-x-3 group md:hidden">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-2xl font-display">W</span>
              </div>
              <span className="text-2xl font-bold text-gray-900 tracking-tight font-display">WealthOS</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {isPremium && (
              <div className="flex items-center space-x-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-100">
                <Crown className="w-3 h-3" />
                <span>PREMIUM</span>
              </div>
            )}

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                  <UserIcon className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-gray-900 truncate max-w-[100px]">
                    {userProfile?.name?.split(' ')[0] || 'User'}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{userProfile?.name}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center space-x-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>View Profile</span>
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center space-x-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>

                    <div className="h-px bg-gray-50 my-1" />

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
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
