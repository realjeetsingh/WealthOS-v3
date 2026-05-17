import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  align?: 'center' | 'bottom';
  showClose?: boolean;
}

const ModalShell: React.FC<ModalShellProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'md',
  align = 'center',
  showClose = true
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  const alignClasses = {
    center: 'items-center justify-center p-4',
    bottom: 'items-end justify-center'
  };

  const contentClasses = {
    center: 'rounded-[2.5rem] shadow-2xl',
    bottom: 'rounded-t-[2.5rem] p-safe-bottom'
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex flex-col">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md overscroll-none"
          />

          {/* Modal Container */}
          <div className={`relative flex flex-col h-full w-full pointer-events-none ${alignClasses[align]}`}>
            <motion.div
              initial={align === 'bottom' ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
              animate={align === 'bottom' ? { y: 0 } : { scale: 1, opacity: 1 }}
              exit={align === 'bottom' ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`
                bg-white w-full pointer-events-auto flex flex-col
                max-h-[92vh] md:max-h-[85vh]
                ${maxWidthClasses[maxWidth]}
                ${contentClasses[align]}
                overflow-hidden
                relative
                shadow-[0_20px_50px_rgba(0,0,0,0.3)]
              `}
            >
              {/* Header */}
              {(title || showClose) && (
                <div className="px-6 md:px-8 py-5 md:py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-10 rounded-t-[2.5rem]">
                  {title && (
                    <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{title}</h3>
                  )}
                  {showClose && (
                    <button 
                      onClick={onClose}
                      className="p-2 -mr-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all active:scale-95"
                    >
                      <X className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  )}
                </div>
              )}

              {/* Scrollable Content */}
              <div 
                className="overflow-y-auto flex-1 overscroll-contain px-6 md:px-8 pb-10 md:pb-12 pt-4 md:pt-6 [-webkit-overflow-scrolling:touch] custom-scrollbar focus-within:scroll-mt-10"
              >
                {children}
                {/* Safe area spacer */}
                <div className="h-[env(safe-area-inset-bottom)] md:hidden"></div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ModalShell;
