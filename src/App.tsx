import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext'; // Updated imports
import { DataProvider } from './context/DataContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute, AdminRoute } from './components/RouteGuards'; // Updated import
import MainLayout from './layouts/MainLayout';
import PageLoader from './components/PageLoader.tsx';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ShopPage from './pages/ShopPage';
import SocialPage from './pages/SocialPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TournamentsPage from './pages/TournamentsPage';
import SkillTracksPage from './pages/SkillTracksPage';
import DailyChallengePage from './pages/DailyChallengePage';
import StudyModePage from './pages/StudyCardPage.tsx';
import QuizTakingPage from './pages/QuizTakingPage';
import QuizResultsPage from './pages/QuizResultsPage';
import AsyncChallengePage from './pages/AsyncChallengePage';
import VsGamePage from './pages/VsGamePage';
import BadgeTreeDetailPage from './pages/BadgeTreeDetailPage';
import { AiJobProvider } from './contexts/AiJobContext';
import ClanPage from './pages/ClanPage';

const App: React.FC = () => {
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
