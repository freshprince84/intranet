import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx';
import { useWorktime } from '../contexts/WorktimeContext.tsx';

const Layout: React.FC = () => {
  const { isTracking } = useWorktime();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Überwache Bildschirmgröße für responsives Verhalten
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <Header />
      <div className={`flex h-[calc(100vh-4rem)] ${
        isTracking 
          ? 'shadow-[0_0_15px_5px_rgba(34,197,94,0.2)]' 
          : ''
      } transition-shadow duration-300 ${isMobile ? 'pb-16' : ''}`}>
        {/* Sidebar wird als Desktop-Navigationsleiste und als Mobile-Footer gerendert */}
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 