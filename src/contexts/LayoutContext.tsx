import React, { createContext, useContext, useState, useEffect } from 'react';

interface LayoutContextType {
  isNavVisible: boolean;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: React.ReactNode; isNavVisible: boolean }> = ({ 
  children, 
  isNavVisible 
}) => {
  return (
    <LayoutContext.Provider value={{ isNavVisible }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    // Return a default value so it doesn't break if used outside Layout
    return { isNavVisible: true };
  }
  return context;
};
