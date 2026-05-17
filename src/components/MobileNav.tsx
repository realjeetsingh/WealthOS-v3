import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  BrainCircuit, 
  ReceiptText, 
  MoreHorizontal
} from 'lucide-react';
import { usePendingTransactions } from '../services/usePendingTransactions';
import IntelligenceOrb from './IntelligenceOrb';

interface MobileNavProps {
  isVisible?: boolean;
}

const MobileNav: React.FC<MobileNavProps> = ({ isVisible = true }) => {
  const location = useLocation();
  const { pendingCount } = usePendingTransactions();

  const navLinksLeft = [
    { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transactions', icon: ReceiptText },
  ];

  const navLinksRight = [
    { to: '/insights', label: 'Insights', icon: BrainCircuit },
    { to: '/more', label: 'More', icon: MoreHorizontal },
  ];

  return (
    <nav 
      className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-between px-2 z-[9999] shadow-[0_-4px_20px_-1px_rgba(0,0,0,0.08)] transition-transform duration-500 ease-in-out ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
      style={{ 
        height: 'calc(70px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="flex-1 grid grid-cols-2">
        {navLinksLeft.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`relative flex flex-col items-center justify-center w-full h-full transition-all active:scale-[0.98] duration-150 ${
                isActive ? 'text-[#6334FD]' : 'text-gray-400'
              }`}
            >
              <div className="relative z-10 flex flex-col items-center">
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[9px] font-black uppercase tracking-[0.1em]">
                  {link.label}
                </span>
              </div>
              {isActive && (
                <motion.div 
                  layoutId="mobile-nav-dot"
                  className="absolute bottom-2 w-1 h-1 bg-[#6334FD] rounded-full"
                />
              )}
            </Link>
          );
        })}
      </div>

      <div className="relative -top-6 px-4">
        <IntelligenceOrb />
      </div>

      <div className="flex-1 grid grid-cols-2">
        {navLinksRight.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to || (link.to === '/more' && (location.pathname === '/more' || location.pathname.startsWith('/settings') || location.pathname === '/profile' || location.pathname === '/budgets' || location.pathname === '/goals' || location.pathname === '/portfolio' || location.pathname === '/loans' || location.pathname === '/academy'));
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`relative flex flex-col items-center justify-center w-full h-full transition-all active:scale-[0.98] duration-150 ${
                isActive ? 'text-[#6334FD]' : 'text-gray-400'
              }`}
            >
              <div className="relative z-10 flex flex-col items-center">
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[9px] font-black uppercase tracking-[0.1em]">
                  {link.label}
                </span>
              </div>
              {isActive && (
                <motion.div 
                  layoutId="mobile-nav-dot"
                  className="absolute bottom-2 w-1 h-1 bg-[#6334FD] rounded-full"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
