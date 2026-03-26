import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BrainCircuit, 
  ReceiptText, 
  Wallet,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  LogOut,
  Crown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';

const Sidebar: React.FC = () => {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const { userProfile, isPremium } = useAuth();

  const isExpanded = isPinned || isHovered;

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
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`hidden md:flex flex-col bg-white border-r border-gray-100 transition-[width] duration-200 ease-in-out sticky top-0 h-screen z-40 ${
        isExpanded ? 'w-64' : 'w-[70px]'
      }`}
    >
      {/* Logo Section */}
      <div className={`p-4 flex items-center transition-all duration-200 ${isExpanded ? 'justify-between' : 'justify-center'}`}>
        <button 
          onClick={() => setIsPinned(!isPinned)}
          className="flex items-center group outline-none overflow-hidden"
          title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
        >
          <div className="min-w-[40px] w-10 h-10 bg-[#4F46E5] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform shrink-0">
            <span className="text-white font-bold text-2xl font-display">W</span>
          </div>
          {isExpanded && (
            <div className="ml-3 animate-in fade-in slide-in-from-left-2 duration-200">
              <span className="text-2xl font-bold text-gray-900 tracking-tight font-display whitespace-nowrap">
                WealthOS
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className={`flex-1 space-y-2 mt-4 transition-all duration-200 ${isExpanded ? 'px-4' : 'px-2'}`}>
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center rounded-xl text-sm font-bold transition-all group ${
                isExpanded ? 'px-4 py-3' : 'p-3 justify-center'
              } ${
                isActive 
                  ? 'bg-indigo-50 text-[#4F46E5] shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#4F46E5]' : 'text-gray-400 group-hover:text-gray-600'}`} />
              {isExpanded && (
                <div className="ml-3 animate-in fade-in slide-in-from-left-2 duration-200">
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
            {isExpanded && <span className="ml-2 whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">PREMIUM PLAN</span>}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
