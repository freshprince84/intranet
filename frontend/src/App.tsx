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
import { logger } from './utils/logger.ts';
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
const PriceAnalysis = React.lazy(() => import('./pages/PriceAnalysis.tsx'));
const LandingPage = React.lazy(() => import('./pages/LandingPage.tsx'));

const App: React.FC = () => {
    // Claude Console nur im Development-Modus initialisieren
    React.useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            const claudeConsole = initClaudeConsole();
            logger.log('🔍 Claude Console Bridge initialized');
            
            // ✅ MEMORY: Cleanup beim Unmount
            return () => {
                if (claudeConsole) {
                    claudeConsole.destroy();
                }
            };
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
                                                    
                                                    {/* Öffentlich zugängliche Landingpage (Root + Alias) */}
                                                    <Route path="/" element={
                                                        <Suspense fallback={<LoadingScreen />}>
                                                            <LandingPage />
                                                        </Suspense>
                                                    } />
                                                    <Route path="/landing" element={
                                                        <Suspense fallback={<LoadingScreen />}>
                                                            <LandingPage />
                                                        </Suspense>
                                                    } />

                                                    {/* Mobile App Landing Page - öffentlich zugänglich */}
                                                    <Route path="/mobile-app" element={
                                                        <Suspense fallback={<LoadingScreen />}>
                                                            <MobileAppLanding />
                                                        </Suspense>
                                                    } />
                                                    
                                                    {/* Geschützte Routen unter /app */}
                                                    <Route path="/app" element={
                                                        <ProtectedRoute>
                                                            <Layout />
                                                        </ProtectedRoute>
                                                    }>
                                                        <Route index element={<Navigate to="/app/dashboard" replace />} />
                                                        <Route path="dashboard" element={
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <Dashboard />
                                                            </Suspense>
                                                        } />
                                                        <Route path="worktracker" element={
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <Worktracker />
                                                            </Suspense>
                                                        } />
                                                        <Route path="consultations" element={
                                                            <ProtectedRoute>
                                                                <Suspense fallback={<LoadingScreen />}>
                                                                    <Consultations />
                                                                </Suspense>
                                                            </ProtectedRoute>
                                                        } />
                                                        <Route path="reservations/:id" element={
                                                            <ProtectedRoute>
                                                                <Suspense fallback={<LoadingScreen />}>
                                                                    <ReservationDetails />
                                                                </Suspense>
                                                            </ProtectedRoute>
                                                        } />
                                                        <Route path="team-worktime-control" element={
                                                            <ProtectedRoute entity="team_worktime_control" accessLevel="read">
                                                                <Suspense fallback={<LoadingScreen />}>
                                                                    <TeamWorktimeControl />
                                                                </Suspense>
                                                            </ProtectedRoute>
                                                        } />
                                                        <Route path="organization" element={
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <Organisation />
                                                            </Suspense>
                                                        } />
                                                        <Route path="settings" element={
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <Settings />
                                                            </Suspense>
                                                        } />
                                                        <Route path="profile" element={
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <Profile />
                                                            </Suspense>
                                                        } />
                                                        <Route path="notifications" element={
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <NotificationList />
                                                            </Suspense>
                                                        } />
                                                        <Route path="cerebro/*" element={
                                                            <Suspense fallback={<LoadingScreen />}>
                                                                <Cerebro />
                                                            </Suspense>
                                                        } />
                                                        <Route path="payroll" element={
                                                            <ProtectedRoute entity="payroll" accessLevel="read">
                                                                <Suspense fallback={<LoadingScreen />}>
                                                                    <Payroll />
                                                                </Suspense>
                                                            </ProtectedRoute>
                                                        } />
                                                        <Route path="price-analysis" element={
                                                            <ProtectedRoute entity="price_analysis" accessLevel="read">
                                                                <Suspense fallback={<LoadingScreen />}>
                                                                    <PriceAnalysis />
                                                                </Suspense>
                                                            </ProtectedRoute>
                                                        } />
                                                        {/* Fallback innerhalb /app */}
                                                        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
                                                    </Route>

                                                    {/* Redirects alter Pfade auf /app/* */}
                                                    <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
                                                    <Route path="/worktracker" element={<Navigate to="/app/worktracker" replace />} />
                                                    <Route path="/consultations" element={<Navigate to="/app/consultations" replace />} />
                                                    <Route path="/reservations/:id" element={<Navigate to="/app/reservations/:id" replace />} />
                                                    <Route path="/team-worktime-control" element={<Navigate to="/app/team-worktime-control" replace />} />
                                                    <Route path="/organization" element={<Navigate to="/app/organization" replace />} />
                                                    <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
                                                    <Route path="/profile" element={<Navigate to="/app/profile" replace />} />
                                                    <Route path="/notifications" element={<Navigate to="/app/notifications" replace />} />
                                                    <Route path="/cerebro/*" element={<Navigate to="/app/cerebro" replace />} />
                                                    <Route path="/payroll" element={<Navigate to="/app/payroll" replace />} />
                                                    <Route path="/price-analysis" element={<Navigate to="/app/price-analysis" replace />} />

                                                    {/* Öffentlicher Fallback */}
                                                    <Route path="*" element={
                                                        <Suspense fallback={<LoadingScreen />}>
                                                            <LandingPage />
                                                        </Suspense>
                                                    } />
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