import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BrainCircuit, 
  ReceiptText, 
  Wallet 
} from 'lucide-react';

const MobileNav: React.FC = () => {
  const location = useLocation();

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/insights', label: 'Insights', icon: BrainCircuit },
    { to: '/transactions', label: 'Transactions', icon: ReceiptText },
    { to: '/loans', label: 'Loans', icon: Wallet },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 h-[70px] flex justify-around items-center z-[9999] shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
      {navLinks.map((link) => {
        const Icon = link.icon;
        const isActive = location.pathname === link.to;
        return (
          <Link
            key={link.to}
            to={link.to}
            className={`flex flex-col items-center space-y-1.5 px-4 py-1 rounded-xl transition-all active:scale-90 ${
              isActive 
                ? 'text-[#4F46E5]' 
                : 'text-gray-400'
            }`}
          >
            <Icon className={`w-6 h-6 ${isActive ? 'text-[#4F46E5]' : 'text-gray-400'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[#4F46E5]' : 'text-gray-400'}`}>
              {link.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileNav;
