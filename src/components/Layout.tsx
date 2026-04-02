import React, { useState } from 'react';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isPinned || isHovered;

  return (
    <div className="min-h-screen flex bg-gray-50 w-full overflow-x-hidden">
      {/* Sidebar: hidden on mobile, fixed on desktop */}
      <Sidebar 
        isPinned={isPinned} 
        setIsPinned={setIsPinned} 
        isHovered={isHovered} 
        setIsHovered={setIsHovered} 
      />
      
      <div 
        className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-[margin] duration-200 ease-in-out ${
          isExpanded ? 'md:ml-[240px]' : 'md:ml-[70px]'
        }`}
      >
        <AppHeader />
        
        {/* MainContent: ONLY scrollable area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 pb-24 md:pb-8">
          {children}
        </main>

        {/* BottomNavbar: outside scroll area, fixed at bottom */}
        <MobileNav />
      </div>
    </div>
  );
};

export default Layout;
