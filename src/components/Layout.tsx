import React, { useState, useEffect, useRef, useCallback } from 'react';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isExpanded = isPinned || isHovered;

  const resetTimer = useCallback(() => {
    setIsVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Check if we should hide (no modal open, no active input, no active dropdown)
    // We check for common modal/dropdown indicators
    const isModalOpen = document.body.style.overflow === 'hidden' || !!document.querySelector('[role="dialog"]');
    const isInputActive = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
    const isDropdownOpen = !!document.querySelector('.absolute.right-0.mt-2'); // Simple check for the profile dropdown

    if (!isModalOpen && !isInputActive && !isDropdownOpen) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    }
  }, []);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'touchstart', 'scroll', 'keydown'];
    const handleActivity = () => resetTimer();
    
    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));
    resetTimer();
    
    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimer]);

  return (
    <div className="min-h-screen flex bg-gray-50 w-full max-w-full overflow-x-hidden relative">
      {/* Sidebar: hidden on mobile, fixed on desktop */}
      <Sidebar 
        isPinned={isPinned} 
        setIsPinned={setIsPinned} 
        isHovered={isHovered} 
        setIsHovered={setIsHovered} 
      />
      
      <div 
        className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden max-w-full transition-[margin] duration-200 ease-in-out ${
          isExpanded ? 'md:ml-[240px]' : 'md:ml-[70px]'
        }`}
      >
        <AppHeader isVisible={isVisible} />
        
        {/* MainContent: ONLY scrollable area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden max-w-full p-6 md:p-8 pb-24 md:pb-8">
          {children}
        </main>

        {/* BottomNavbar: outside scroll area, fixed at bottom */}
        <MobileNav isVisible={isVisible} />
      </div>
    </div>
  );
};

export default Layout;
