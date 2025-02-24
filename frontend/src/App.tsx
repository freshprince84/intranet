import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header.tsx';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import { useAuth } from './hooks/useAuth.tsx';
import RoleManagement from './components/RoleManagement.tsx';
import Worktracker from './pages/Worktracker.tsx';

// Layout-Komponente für authentifizierte Seiten
const AuthenticatedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-100">
            <Header />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

// Protected Route Komponente
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();
    
    if (!user) {
        console.log('Nicht eingeloggt, leite zur Login-Seite weiter');
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    
    return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
};

// Public Route Komponente
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/dashboard';
    
    if (user) {
        console.log('Bereits eingeloggt, leite zum Dashboard weiter');
        return <Navigate to={from} replace />;
    }
    
    return <>{children}</>;
};

const App: React.FC = () => {
    const { user } = useAuth();
    console.log('App gerendert, Benutzer:', user?.email);
    
    return (
        <Router>
            <Routes>
                {/* Öffentliche Routen */}
                <Route path="/login" element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                } />
                <Route path="/register" element={
                    <PublicRoute>
                        <Register />
                    </PublicRoute>
                } />
                
                {/* Geschützte Routen */}
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />
                
                <Route path="/worktracker" element={
                    <ProtectedRoute>
                        <Worktracker />
                    </ProtectedRoute>
                } />
                
                <Route path="/roles" element={
                    <ProtectedRoute>
                        <RoleManagement />
                    </ProtectedRoute>
                } />
                
                {/* Standardumleitung */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Router>
    );
};

export default App; 