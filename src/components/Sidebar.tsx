import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  BrainCircuit, 
  ReceiptText, 
  Wallet,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  LogOut,
  Crown,
  Target,
  Trophy,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';

interface SidebarProps {
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isHovered, setIsHovered }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, isPremium } = useAuth();

  const isExpanded = isHovered;

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/insights', label: 'Insights', icon: BrainCircuit },
    { to: '/transactions', label: 'Transactions', icon: ReceiptText },
    { to: '/budgets', label: 'Budgets', icon: Target },
    { to: '/goals', label: 'Goals', icon: Trophy },
    { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
    { to: '/loans', label: 'Loans', icon: Wallet },
    { to: '/academy', label: 'Wealth Academy', icon: GraduationCap },
  ];

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`hidden md:flex flex-col bg-white border-r border-gray-100 transition-[width] duration-200 ease-in-out fixed top-0 md:top-16 left-0 h-[100dvh] md:h-[calc(100dvh-64px)] overflow-hidden z-[1000] ${
        isExpanded ? 'w-[240px]' : 'w-[70px]'
      }`}
    >
      {/* Navigation Links */}
      <nav className={`flex-1 space-y-2 pt-6 transition-all duration-200 ${isExpanded ? 'px-4' : 'px-2'}`}>
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`relative flex items-center rounded-xl text-sm font-bold transition-all group active:scale-[0.98] duration-150 ${
                isExpanded ? 'px-4 py-3' : 'p-3 justify-center'
              } ${
                isActive 
                  ? 'text-[#4F46E5]' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 bg-indigo-50 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.1)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <motion.div
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                className="relative z-10"
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#4F46E5]' : 'text-gray-400 group-hover:text-gray-600'}`} />
              </motion.div>
              {isExpanded && (
                <div className="ml-3 relative z-10 animate-in fade-in slide-in-from-left-2 duration-200">
                  <span className="whitespace-nowrap">{link.label}</span>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className={`border-t border-gray-50 space-y-2 transition-all duration-200 ${isExpanded ? 'p-4' : 'p-2'}`}>
        {isPremium && (
          <div className={`flex items-center bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-100 mb-2 transition-all duration-200 overflow-hidden ${
            isExpanded ? 'px-4 py-2' : 'p-3 justify-center border-none bg-transparent'
          }`}>
            <Crown className="w-4 h-4 shrink-0" />
            {isExpanded && <span className="ml-2 whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">PRO PLAN</span>}
          </div>
        )}
        
        <button
          onClick={handleLogout}
          className={`w-full flex items-center rounded-xl text-sm font-bold transition-all group active:scale-[0.98] duration-150 ${
            isExpanded ? 'px-4 py-3' : 'p-3 justify-center'
          } text-red-600 hover:bg-red-50`}
        >
          <LogOut className="w-5 h-5 shrink-0 text-red-500 group-hover:text-red-600" />
          {isExpanded && (
            <div className="ml-3 animate-in fade-in slide-in-from-left-2 duration-200">
              <span className="whitespace-nowrap">Logout</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
