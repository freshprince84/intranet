import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx';
import { useWorktime } from '../contexts/WorktimeContext.tsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from '../contexts/ThemeContext.tsx';

const Layout: React.FC = () => {
  const { isTracking } = useWorktime();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTabletOrLarger, setIsTabletOrLarger] = useState(window.innerWidth >= 768);

  // ✅ PERFORMANCE: Event-Listener für Navigation ohne Browser-Reload
  useEffect(() => {
    const handleRedirect = (event: CustomEvent) => {
      const path = (event.detail?.path as string) || '/login';
      navigate(path, { replace: true });
    };
    
    window.addEventListener('auth:redirect-to-login', handleRedirect as EventListener);
    
    return () => {
      window.removeEventListener('auth:redirect-to-login', handleRedirect as EventListener);
    };
  }, [navigate]);

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

  // ✅ SIDEPANE ALIGNMENT: Setze body-Klasse für Sidepane-Positionierung bei aktiver Zeiterfassung
  useEffect(() => {
    if (isTracking) {
      document.body.classList.add('worktime-tracking-active');
    } else {
      document.body.classList.remove('worktime-tracking-active');
    }
    
    return () => {
      document.body.classList.remove('worktime-tracking-active');
    };
  }, [isTracking]);

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
        } transition-all duration-300 ease-in-out sidepane-content-main`}>
          <Outlet />
        </main>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={isDarkMode ? 'dark' : 'light'}
      />
    </div>
  );
};

export default Layout; 