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
  GraduationCap,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { usePendingTransactions } from '../services/usePendingTransactions';

import IntelligenceOrb from './IntelligenceOrb';

interface SidebarProps {
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isHovered, setIsHovered }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, isPremium } = useAuth();
  const { pendingCount } = usePendingTransactions();

  const isExpanded = isHovered;

  const handleLogout = async () => {
    try {
      localStorage.setItem('wealthos_manual_logout', 'true');
      await auth.signOut();
      navigate('/auth/login');
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
      className={`hidden md:flex flex-col bg-white border-r border-gray-100 transition-[width] duration-200 ease-in-out fixed top-0 md:top-[70px] left-0 h-[100dvh] md:h-[calc(100dvh-70px)] overflow-hidden z-[1000] ${
        isExpanded ? 'w-[240px]' : 'w-[70px]'
      }`}
    >
      {/* Featured Intelligence Action */}
      <div className={`mt-6 mb-2 flex justify-center transition-all ${isExpanded ? 'px-4' : 'px-0'}`}>
        <div className={`flex items-center gap-4 bg-indigo-50/50 rounded-2xl w-full transition-all ${isExpanded ? 'p-4' : 'p-2 justify-center bg-transparent'}`}>
          <IntelligenceOrb size={isExpanded ? 'lg' : 'sm'} />
          {isExpanded && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest leading-none mb-1">Intelligence</p>
              <p className="text-[11px] text-indigo-600/70 font-bold leading-tight">Review Center</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className={`flex-1 space-y-2 pt-2 transition-all duration-200 ${isExpanded ? 'px-4' : 'px-2'}`}>
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
                  ? 'text-[#6334FD]' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 bg-[#6334FD]/5 rounded-xl border border-[#6334FD]/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <motion.div
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                className="relative z-10"
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#6334FD]' : 'text-gray-400 group-hover:text-gray-600'}`} />
                {(link as any).badge && pendingCount > 0 && (
                  <div className={`absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white`} />
                )}
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
          <div className={`flex items-center bg-[#6334FD]/5 text-[#6334FD] rounded-xl text-xs font-bold border border-[#6334FD]/10 mb-2 transition-all duration-200 overflow-hidden ${
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
