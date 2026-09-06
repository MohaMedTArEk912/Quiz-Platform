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

                    {/* User Routes wrapped in MainLayout */}
                    <Route element={<MainLayout />}>
                      {/* Public Browsing Routes */}
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/leaderboard" element={<LeaderboardPage />} />
                      <Route path="/tracks" element={<SkillTracksPage />} />
                      <Route path="/study" element={<StudyModePage />} />
                      <Route path="/tournaments" element={<TournamentsPage />} />
                      <Route path="/badge-tree/:treeId" element={<BadgeTreeDetailPage />} />

                      {/* Protected Routes (require login) */}
                      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                      <Route path="/quiz/:quizId" element={<ProtectedRoute><QuizTakingPage /></ProtectedRoute>} />
                      <Route path="/results" element={<ProtectedRoute><QuizResultsPage /></ProtectedRoute>} />
                      <Route path="/game/vs" element={<ProtectedRoute><VsGamePage /></ProtectedRoute>} />
                      <Route path="/shop" element={<ProtectedRoute><ShopPage /></ProtectedRoute>} />
                      <Route path="/social" element={<ProtectedRoute><SocialPage /></ProtectedRoute>} />
                      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
                      <Route path="/daily" element={<ProtectedRoute><DailyChallengePage /></ProtectedRoute>} />
                      <Route path="/clans" element={<ProtectedRoute><ClanPage /></ProtectedRoute>} />
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

