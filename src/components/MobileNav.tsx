import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  BrainCircuit, 
  ReceiptText, 
  MoreHorizontal
} from 'lucide-react';

interface MobileNavProps {
  isVisible?: boolean;
}

const MobileNav: React.FC<MobileNavProps> = ({ isVisible = true }) => {
  const location = useLocation();

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/insights', label: 'Insights', icon: BrainCircuit },
    { to: '/transactions', label: 'Transactions', icon: ReceiptText },
    { to: '/more', label: 'More', icon: MoreHorizontal },
  ];

  return (
    <nav 
      className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 grid grid-cols-4 z-[9999] shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] transition-transform duration-500 ease-in-out ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
      style={{ 
        height: 'calc(70px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {navLinks.map((link) => {
        const Icon = link.icon;
        const isActive = location.pathname === link.to || (link.to === '/more' && (location.pathname === '/more' || location.pathname.startsWith('/settings') || location.pathname === '/profile' || location.pathname === '/budgets' || location.pathname === '/goals' || location.pathname === '/portfolio' || location.pathname === '/loans' || location.pathname === '/academy'));
        return (
          <Link
            key={link.to}
            to={link.to}
            className={`relative flex flex-col items-center justify-center w-full h-full transition-all active:scale-[0.98] duration-150 ${
              isActive 
                ? 'text-[#6334FD]' 
                : 'text-gray-400'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="mobile-nav-active"
                className="absolute inset-0 bg-[#6334FD]/5"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <motion.div
              animate={isActive ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
              className="relative z-10 flex flex-col items-center"
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-widest mt-1.5">
                {link.label}
              </span>
            </motion.div>
            {isActive && (
              <motion.div 
                layoutId="mobile-nav-dot"
                className="absolute bottom-2 w-1 h-1 bg-[#6334FD] rounded-full"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileNav;
