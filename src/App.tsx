import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute, AdminRoute } from './components/RouteGuards';
import MainLayout from './layouts/MainLayout';
import PageLoader from './components/PageLoader.tsx';
import { AiJobProvider } from './contexts/AiJobContext';
import { useUpdateCheck } from './hooks/useAutoUpdate';

// Lazy load all pages for better code splitting and performance
// Critical pages (login/register) loaded first, others loaded on demand
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));

// Dashboard and core pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Admin pages
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));

// Feature pages - loaded on demand
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const SocialPage = lazy(() => import('./pages/SocialPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const TournamentsPage = lazy(() => import('./pages/TournamentsPage'));
const SkillTracksPage = lazy(() => import('./pages/SkillTracksPage'));
const DailyChallengePage = lazy(() => import('./pages/DailyChallengePage'));
const StudyModePage = lazy(() => import('./pages/StudyCardPage.tsx'));
const ClanPage = lazy(() => import('./pages/ClanPage'));

// Quiz and game pages
const QuizTakingPage = lazy(() => import('./pages/QuizTakingPage'));
const QuizResultsPage = lazy(() => import('./pages/QuizResultsPage'));
const AsyncChallengePage = lazy(() => import('./pages/AsyncChallengePage'));
const VsGamePage = lazy(() => import('./pages/VsGamePage'));
const BadgeTreeDetailPage = lazy(() => import('./pages/BadgeTreeDetailPage'));


const App: React.FC = () => {
  // Manual update control - shows notification instead of auto-refresh
  const { updateAvailable, checkForUpdate, refreshApp } = useUpdateCheck();

  // Check for updates every 5 minutes (won't interrupt users)
  useEffect(() => {
    checkForUpdate();
    const interval = setInterval(checkForUpdate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdate]);

  // Mobile Performance: Preload critical pages after initial render
  useEffect(() => {
    // Only preload on mobile devices to save bandwidth
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isMobile) {
      // Preload Dashboard page chunk (most common destination after login)
      const preloadTimer = setTimeout(() => {
        import('./pages/DashboardPage').catch(() => {
          // Preload failed, not critical
        });
      }, 2000); // Wait 2 seconds after initial load

      return () => clearTimeout(preloadTimer);
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <SocketProvider>
            <DataProvider>
              <AiJobProvider>
                {/* Update notification banner - shown at top when new version available */}
                {updateAvailable && (
                  <div 
                    className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-3 shadow-lg"
                    role="alert"
                  >
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">A new version is available!</span>
                      </div>
                      <button
                        onClick={refreshApp}
                        className="bg-white text-cyan-600 px-4 py-1.5 rounded-lg font-semibold hover:bg-cyan-50 transition-colors text-sm whitespace-nowrap"
                      >
                        Update Now
                      </button>
                    </div>
                  </div>
                )}
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                    {/* Async Challenge (Can be accessed with link) - handled by page logic wrapper? 
                                        If user not logged in, they should login first.
                                        Deep linking flow: /challenge/:token -> Login -> Redirect back?
                                        For now, protect it. AsyncChallengePage checks currentUser.
                                    */}
                    <Route path="/challenge/:token" element={
                      <ProtectedRoute>
                        <AsyncChallengePage />
                      </ProtectedRoute>
                    } />

                    {/* Admin Route */}
                    <Route path="/admin" element={
                      <AdminRoute>
                        <AdminDashboardPage />
                      </AdminRoute>
                    } />

                    {/* Protected User Routes wrapped in MainLayout */}
                    <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/leaderboard" element={<LeaderboardPage />} />
                      <Route path="/shop" element={<ShopPage />} />
                      <Route path="/social" element={<SocialPage />} />
                      <Route path="/analytics" element={<AnalyticsPage />} />
                      <Route path="/tournaments" element={<TournamentsPage />} />
                      <Route path="/tracks" element={<SkillTracksPage />} />
                      <Route path="/daily" element={<DailyChallengePage />} />
                      <Route path="/study" element={<StudyModePage />} />

                      <Route path="/quiz/:quizId" element={<QuizTakingPage />} />
                      <Route path="/results" element={<QuizResultsPage />} />
                      <Route path="/game/vs" element={<VsGamePage />} />
                      <Route path="/badge-tree/:treeId" element={<BadgeTreeDetailPage />} />
                      <Route path="/clans" element={<ClanPage />} />
                    </Route>

                    {/* Catch all redirect */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </AiJobProvider>
            </DataProvider>
          </SocketProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;

