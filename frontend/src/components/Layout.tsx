import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx';
import { useWorktime } from '../contexts/WorktimeContext.tsx';

const Layout: React.FC = () => {
  const { isTracking } = useWorktime();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTabletOrLarger, setIsTabletOrLarger] = useState(window.innerWidth >= 768);

  // Überwache Bildschirmgröße für responsives Verhalten
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTabletOrLarger(width >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`min-h-screen dark:bg-gray-900 ${
      isTabletOrLarger ? 'fixed-height-container' : ''
    }`}>
      <Header />
      <div className={`flex ${
        isMobile ? 'h-[calc(100vh-4rem)] pb-16' : 'h-[calc(100vh-4rem)]'
      } ${
        isTracking 
          ? 'shadow-[0_0_15px_5px_rgba(34,197,94,0.2)]' 
          : ''
      } transition-shadow duration-300`}>
        {/* Sidebar wird als Desktop-Navigationsleiste und als Mobile-Footer gerendert */}
        <Sidebar />
        <main className={`flex-1 ${isMobile ? 'overflow-y-container' : 'overflow-y-auto'} ${
          isMobile ? 'px-4 pt-2 pb-4' : 'px-5 pt-3 pb-5'
        }`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 