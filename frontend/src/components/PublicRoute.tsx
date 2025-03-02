import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/dashboard';
    
    if (user) {
        return <Navigate to={from} replace />;
    }
    
    return (
        <div className="min-h-screen dark:bg-gray-900 flex items-center justify-center">
            {children}
        </div>
    );
};

export default PublicRoute; 