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
import Worktracker from './pages/Worktracker.tsx';
import TeamWorktimeControl from './pages/TeamWorktimeControl.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { SidebarProvider } from './contexts/SidebarContext.tsx';
import Layout from './components/Layout.tsx';
import Profile from './pages/Profile.tsx';
import { WorktimeProvider } from './contexts/WorktimeContext.tsx';
import { BranchProvider } from './contexts/BranchContext.tsx';
import NotificationList from './components/NotificationList.tsx';
import FaviconLoader from './components/FaviconLoader.tsx';
import Cerebro from './pages/Cerebro.tsx';
import Payroll from './pages/Payroll.tsx';
import { MessageProvider } from './contexts/MessageContext.tsx';
import { ErrorProvider } from './contexts/ErrorContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <ErrorProvider>
                <AuthProvider>
                    <ThemeProvider>
                        <SidebarProvider>
                            <WorktimeProvider>
                                <BranchProvider>
                                    <MessageProvider>
                                        <FaviconLoader />
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
                                                <Route path="/" element={
                                                    <ProtectedRoute>
                                                        <Layout />
                                                    </ProtectedRoute>
                                                }>
                                                    <Route index element={<Navigate to="/dashboard" replace />} />
                                                    <Route path="/dashboard" element={<Dashboard />} />
                                                    <Route path="/worktracker" element={<Worktracker />} />
                                                    <Route path="/team-worktime-control" element={
                                                        <ProtectedRoute entity="team_worktime_control" accessLevel="read">
                                                            <TeamWorktimeControl />
                                                        </ProtectedRoute>
                                                    } />
                                                    <Route path="/users" element={<UserManagement />} />
                                                    <Route path="/settings" element={<Settings />} />
                                                    <Route path="/profile" element={<Profile />} />
                                                    <Route path="/notifications" element={<NotificationList />} />
                                                    <Route path="/cerebro/*" element={<Cerebro />} />
                                                    <Route path="/payroll" element={
                                                        <ProtectedRoute entity="payroll" accessLevel="read">
                                                            <Payroll />
                                                        </ProtectedRoute>
                                                    } />
                                                </Route>
                                            </Routes>
                                        </Router>
                                    </MessageProvider>
                                </BranchProvider>
                            </WorktimeProvider>
                        </SidebarProvider>
                    </ThemeProvider>
                </AuthProvider>
            </ErrorProvider>
        </ErrorBoundary>
    );
};

export default App; 