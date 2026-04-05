import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isExpanded = isHovered;

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
    <div className="min-h-screen flex flex-col bg-gray-50 w-full max-w-full overflow-x-hidden relative">
      <AppHeader isVisible={isVisible} />
      
      <div className="flex flex-1 w-full relative">
        <Sidebar 
          isHovered={isHovered} 
          setIsHovered={setIsHovered} 
        />
        
        <div 
          className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden max-w-full transition-[margin] duration-200 ease-in-out ${
            isExpanded ? 'md:ml-[240px]' : 'md:ml-[70px]'
          }`}
        >
          {/* MainContent: ONLY scrollable area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden max-w-full p-6 md:p-8 pt-24 pb-24 md:pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* BottomNavbar: outside scroll area, fixed at bottom */}
          <MobileNav isVisible={isVisible} />
        </div>
      </div>
    </div>
  );
};

export default Layout;
