import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useSidebar } from './SidebarContext.tsx';

interface SidepaneContextType {
  isSidepaneOpen: boolean;
  openSidepane: () => void;
  closeSidepane: () => void;
}

const SidepaneContext = createContext<SidepaneContextType | undefined>(undefined);

export const SidepaneProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSidepaneOpen, setIsSidepaneOpen] = useState(false);
  const { isCollapsed, setCollapsedTemporary } = useSidebar();
  // Ref um den vorherigen Sidebar-Zustand zu speichern (vor dem automatischen Collapsed)
  const previousSidebarStateRef = useRef<boolean | null>(null);

  const openSidepane = useCallback(() => {
    const width = window.innerWidth;
    // Bei kleineren Bildschirmen (< 1070px) und wenn Sidebar expanded ist: automatisch collapsed setzen
    if (width < 1070 && !isCollapsed) {
      previousSidebarStateRef.current = isCollapsed; // false speichern
      setCollapsedTemporary(true); // Sidebar collapsed setzen
    }
    setIsSidepaneOpen(true);
  }, [isCollapsed, setCollapsedTemporary]);

  const closeSidepane = useCallback(() => {
    setIsSidepaneOpen(false);
    // Sidebar wieder auf vorherigen Zustand zurücksetzen (wenn automatisch collapsed wurde)
    if (previousSidebarStateRef.current !== null) {
      // Nur zurücksetzen wenn noch collapsed ist (Benutzer hat es nicht manuell geändert)
      if (isCollapsed) {
        setCollapsedTemporary(previousSidebarStateRef.current); // Wieder expanded
      }
      previousSidebarStateRef.current = null;
    }
  }, [isCollapsed, setCollapsedTemporary]);

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

