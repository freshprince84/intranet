import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx';
import { useWorktime } from '../contexts/WorktimeContext.tsx';

const Layout: React.FC = () => {
  const { isTracking } = useWorktime();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className={`flex h-[calc(100vh-4rem)] ${
        isTracking 
          ? 'shadow-[0_0_15px_5px_rgba(34,197,94,0.2)]' 
          : ''
      } transition-shadow duration-300`}>
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 