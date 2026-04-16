import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Crown,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  ChevronDown
} from 'lucide-react';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import PricingModal from './PricingModal';
import Logo from './ui/Logo';

interface AppHeaderProps {
  isVisible?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({ isVisible = true }) => {
  const { user, userProfile, isPremium } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
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

  return (
    <header className={`bg-gradient-to-r from-[#6B66FE] to-[#6334FD] border-b border-white/10 fixed top-0 left-0 w-full z-[1100] transition-transform duration-500 ease-in-out ${isVisible ? 'translate-y-0' : 'md:translate-y-0 -translate-y-full'}`}>
      <div className="px-3 sm:px-6 lg:px-8 max-w-full">
        <div className="flex justify-between h-[70px] items-center">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2 group">
              <div className="group-hover:scale-105 transition-transform shrink-0 bg-white p-1 rounded-lg">
                <Logo size={28} />
              </div>
              <span className="hidden sm:block text-xl font-bold text-white tracking-tight font-display">WealthOS</span>
            </Link>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {isPremium ? (
              <div className="flex items-center space-x-1 bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20 backdrop-blur-sm">
                <Crown className="w-3 h-3" />
                <span>PRO</span>
              </div>
            ) : (
              <button
                onClick={() => setShowPricing(true)}
                className="flex items-center space-x-1.5 bg-white text-[#6334FD] px-4 py-1.5 rounded-full text-xs font-bold hover:bg-white/90 transition-all shadow-lg active:scale-[0.98] duration-150"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Upgrade</span>
              </button>
            )}

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-white/10 transition-all group active:scale-[0.98] duration-150"
              >
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center border border-white/20 group-hover:bg-white/30 transition-colors overflow-hidden">
                  {userProfile?.profileImage ? (
                    <img 
                      src={userProfile.profileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-white truncate max-w-[100px]">
                    {userProfile?.name?.split(' ')[0] || 'User'}
                  </p>
                </div>
                <ChevronDown className={`hidden sm:block w-4 h-4 text-white/70 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
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
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </header>
  );
};

export default AppHeader;
