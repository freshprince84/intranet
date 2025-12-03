import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import PublicRoute from './components/PublicRoute.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { SidebarProvider } from './contexts/SidebarContext.tsx';
import Layout from './components/Layout.tsx';
import { WorktimeProvider } from './contexts/WorktimeContext.tsx';
import { BranchProvider } from './contexts/BranchContext.tsx';
import FaviconLoader from './components/FaviconLoader.tsx';
import { MessageProvider } from './contexts/MessageContext.tsx';
import { ErrorProvider } from './contexts/ErrorContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { initClaudeConsole } from './utils/claudeConsole.ts';
import { OrganizationProvider } from './contexts/OrganizationContext.tsx';
import { SidepaneProvider } from './contexts/SidepaneContext.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import LoadingScreen from './components/LoadingScreen.tsx';
import { OnboardingProvider } from './contexts/OnboardingContext.tsx';
import { onboardingSteps } from './config/onboardingSteps.ts';
import OnboardingTour from './components/OnboardingTour.tsx';
import { FilterProvider } from './contexts/FilterContext.tsx';

// Lazy Loading für Page-Komponenten
const Login = React.lazy(() => import('./pages/Login.tsx'));
const Register = React.lazy(() => import('./pages/Register.tsx'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword.tsx'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword.tsx'));
const Dashboard = React.lazy(() => import('./pages/Dashboard.tsx'));
const Settings = React.lazy(() => import('./pages/Settings.tsx'));
const MobileAppLanding = React.lazy(() => import('./pages/MobileAppLanding.tsx'));
const Organisation = React.lazy(() => import('./pages/Organisation.tsx'));
const Worktracker = React.lazy(() => import('./pages/Worktracker.tsx'));
const TeamWorktimeControl = React.lazy(() => import('./pages/TeamWorktimeControl.tsx'));
const Profile = React.lazy(() => import('./pages/Profile.tsx'));
const NotificationList = React.lazy(() => import('./components/NotificationList.tsx'));
const Cerebro = React.lazy(() => import('./pages/Cerebro.tsx'));
const Payroll = React.lazy(() => import('./pages/Payroll.tsx'));
const Consultations = React.lazy(() => import('./pages/Consultations.tsx'));
const ReservationDetails = React.lazy(() => import('./components/reservations/ReservationDetails.tsx'));

const App: React.FC = () => {
    // Claude Console nur im Development-Modus initialisieren
    React.useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            initClaudeConsole();
            console.log('🔍 Claude Console Bridge initialized');
        }
    }, []);

    return (
        <ErrorBoundary>
            <ErrorProvider>
                <AuthProvider>
                    <LanguageProvider>
                    <OrganizationProvider>
                        <ThemeProvider>
                            <SidebarProvider>
                                <SidepaneProvider>
                                    <WorktimeProvider>
                                        <BranchProvider>
                                                <MessageProvider>
                                                <FilterProvider>
                                                <FaviconLoader />
                                                <Router>
                                                    <OnboardingProvider steps={onboardingSteps}>
                                                    <Routes>
                                                    {/* Öffentliche Routen */}
                                                    <Route path="/login" element={
                                                        <PublicRoute>
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <Login />
                                                            </Suspense>
                                                        </PublicRoute>
                                                    } />
                                                    <Route path="/register" element={
                                                        <PublicRoute>
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <Register />
                                                            </Suspense>
                                                        </PublicRoute>
                                                    } />
                                                    <Route path="/forgot-password" element={
                                                        <PublicRoute>
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <ForgotPassword />
                                                            </Suspense>
                                                        </PublicRoute>
                                                    } />
                                                    <Route path="/reset-password" element={
                                                        <PublicRoute>
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <ResetPassword />
                                                            </Suspense>
                                                        </PublicRoute>
                                                    } />
                                                    
                                                    {/* Mobile App Landing Page - öffentlich zugänglich */}
                                                    <Route path="/mobile-app" element={
                                                        <Suspense fallback={<LoadingScreen />}>
                                                            <MobileAppLanding />
                                                        </Suspense>
                                                    } />
                                                    
                                                    {/* Geschützte Routen */}
                                                    <Route path="/" element={
                                                        <ProtectedRoute>
                                                            <Layout />
                                                        </ProtectedRoute>
                                                    }>
                                                        <Route index element={<Navigate to="/dashboard" replace />} />
                                                        <Route path="/dashboard" element={
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <Dashboard />
                                                            </Suspense>
                                                        } />
                                                        <Route path="/worktracker" element={
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <Worktracker />
                                                            </Suspense>
                                                        } />
                                                        <Route path="/consultations" element={
                                                            <ProtectedRoute>
                                                                <Suspense fallback={<LoadingScreen />}>
                                                                    <Consultations />
                                                                </Suspense>
                                                            </ProtectedRoute>
                                                        } />
                                                        <Route path="/reservations/:id" element={
                                                            <ProtectedRoute>
                                                                <Suspense fallback={<LoadingScreen />}>
                                                                    <ReservationDetails />
                                                                </Suspense>
                                                            </ProtectedRoute>
                                                        } />
                                                        <Route path="/team-worktime-control" element={
                                                            <ProtectedRoute entity="team_worktime_control" accessLevel="read">
                                                                <Suspense fallback={<LoadingScreen />}>
                                                                    <TeamWorktimeControl />
                                                                </Suspense>
                                                            </ProtectedRoute>
                                                        } />
                                                        <Route path="/organization" element={
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <Organisation />
                                                            </Suspense>
                                                        } />
                                                        <Route path="/settings" element={
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <Settings />
                                                            </Suspense>
                                                        } />
                                                        <Route path="/profile" element={
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <Profile />
                                                            </Suspense>
                                                        } />
                                                        <Route path="/notifications" element={
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <NotificationList />
                                                            </Suspense>
                                                        } />
                                                        <Route path="/cerebro/*" element={
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <Cerebro />
                                                            </Suspense>
                                                        } />
                                                        <Route path="/payroll" element={
                                                            <ProtectedRoute entity="payroll" accessLevel="read">
                                                                <Suspense fallback={<LoadingScreen />}>
                                                                    <Payroll />
                                                                </Suspense>
                                                            </ProtectedRoute>
                                                        } />
                                                    </Route>
                                                    </Routes>
                                                    <OnboardingTour />
                                                    </OnboardingProvider>
                                                </Router>
                                                </FilterProvider>
                                        </MessageProvider>
                                    </BranchProvider>
                                </WorktimeProvider>
                            </SidepaneProvider>
                            </SidebarProvider>
                        </ThemeProvider>
                    </OrganizationProvider>
                    </LanguageProvider>
                </AuthProvider>
            </ErrorProvider>
        </ErrorBoundary>
    );
};

export default App; 