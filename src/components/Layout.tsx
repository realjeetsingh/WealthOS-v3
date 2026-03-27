import React, { useState } from 'react';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isPinned || isHovered;

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar 
        isPinned={isPinned} 
        setIsPinned={setIsPinned} 
        isHovered={isHovered} 
        setIsHovered={setIsHovered} 
      />
      <div 
        className={`flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto transition-[margin] duration-200 ease-in-out ${
          isExpanded ? 'md:ml-[240px]' : 'md:ml-[70px]'
        }`}
      >
        <AppHeader />
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
