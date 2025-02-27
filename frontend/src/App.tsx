import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Settings from './pages/Settings.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import PublicRoute from './components/PublicRoute.tsx';
import UserManagement from './pages/UserManagement.tsx';
import RoleManagement from './pages/RoleManagement.tsx';
import Worktracker from './pages/Worktracker.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { SidebarProvider } from './contexts/SidebarContext.tsx';
import Layout from './components/Layout.tsx';
import Profile from './pages/Profile.tsx';
import { WorktimeProvider } from './contexts/WorktimeContext.tsx';
import NotificationList from './components/NotificationList.tsx';

const App: React.FC = () => {
    return (
        <AuthProvider>
            <ThemeProvider>
                <SidebarProvider>
                    <WorktimeProvider>
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
                                <Route element={
                                    <ProtectedRoute>
                                        <Layout />
                                    </ProtectedRoute>
                                }>
                                    <Route index element={<Navigate to="/dashboard" replace />} />
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/worktracker" element={<Worktracker />} />
                                    <Route path="/users" element={<UserManagement />} />
                                    <Route path="/roles" element={<RoleManagement />} />
                                    <Route path="/settings" element={<Settings />} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="/notifications" element={<NotificationList />} />
                                </Route>
                            </Routes>
                        </Router>
                    </WorktimeProvider>
                </SidebarProvider>
            </ThemeProvider>
        </AuthProvider>
    );
};

export default App; 