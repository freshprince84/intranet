import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidepaneContextType {
  isSidepaneOpen: boolean;
  openSidepane: () => void;
  closeSidepane: () => void;
}

const SidepaneContext = createContext<SidepaneContextType | undefined>(undefined);

export const SidepaneProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSidepaneOpen, setIsSidepaneOpen] = useState(false);

  const openSidepane = () => setIsSidepaneOpen(true);
  const closeSidepane = () => setIsSidepaneOpen(false);

  // Bei > 1070px: Sidepane-Status am body-Element setzen für CSS-Steuerung
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1070) {
        if (isSidepaneOpen) {
          document.body.classList.add('sidepane-open');
        } else {
          document.body.classList.remove('sidepane-open');
        }
      } else {
        document.body.classList.remove('sidepane-open');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('sidepane-open');
    };
  }, [isSidepaneOpen]);

  return (
    <SidepaneContext.Provider value={{ isSidepaneOpen, openSidepane, closeSidepane }}>
      {children}
    </SidepaneContext.Provider>
  );
};

export const useSidepane = () => {
  const context = useContext(SidepaneContext);
  if (context === undefined) {
    throw new Error('useSidepane must be used within a SidepaneProvider');
  }
  return context;
};

