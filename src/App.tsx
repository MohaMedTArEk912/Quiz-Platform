import { useState, useEffect, Suspense, lazy } from 'react';
import type { Quiz, UserData, AttemptData, BadgeDefinition } from './types/index.ts';
import { Loader2 } from 'lucide-react';

import { api } from './lib/api.ts';
import { calculateXPForQuiz, calculateLevel, checkNewBadges } from './utils/gamification.ts';
import LoginScreen from './components/LoginScreen.tsx';
import RegisterScreen from './components/RegisterScreen.tsx';
import QuizList from './components/QuizList.tsx';
import InstallPWA from './components/InstallPWA.tsx';

// Lazy load secondary components
const QuizTaking = lazy(() => import('./components/QuizTaking.tsx'));
const QuizResults = lazy(() => import('./components/QuizResults.tsx'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard.tsx'));
const UserProfile = lazy(() => import('./components/UserProfile.tsx'));
const Leaderboard = lazy(() => import('./components/Leaderboard.tsx'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
  </div>
);

// Admin credentials from environment variables (with defaults)
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@quiz.com';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

const App = () => {
  const [screen, setScreen] = useState<'login' | 'register' | 'quizList' | 'quiz' | 'results' | 'admin' | 'profile' | 'leaderboard'>('login');
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [allAttempts, setAllAttempts] = useState<AttemptData[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);

  // Load session on mount
  useEffect(() => {
    const savedSession = sessionStorage.getItem('userSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setCurrentUser(session.user);
        setIsAdmin(session.isAdmin);
        setScreen(session.isAdmin ? 'admin' : 'quizList');
      } catch (error) {
        console.error('Failed to load session:', error);
        sessionStorage.removeItem('userSession');
      }
    }
  }, []);

  // Update Page Title
  useEffect(() => {
    const titleMap: Record<string, string> = {
      login: 'Login - Quiz Platform',
      register: 'Register - Quiz Platform',
      quizList: 'Dashboard - Quiz Platform',
      quiz: selectedQuiz ? `${selectedQuiz.title} - Quiz Platform` : 'Quiz - Quiz Platform',
      results: 'Results - Quiz Platform',
      admin: 'Admin Dashboard - Quiz Platform',
      profile: 'User Profile - Quiz Platform',
      leaderboard: 'Leaderboard - Quiz Platform'
    };
    document.title = titleMap[screen] || 'Quiz Platform';
  }, [screen, selectedQuiz]);

  useEffect(() => {
    loadQuizzes();
    loadData();
  }, []);

  const loadQuizzes = async () => {
    try {
      const quizzes = await api.getQuizzes();
      setAvailableQuizzes(quizzes);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    }
  };

  const loadData = async () => {
    try {
      const { users, attempts, badges } = await api.getData();
      setAllUsers(users);
      setAllAttempts(attempts);
      setAllBadges(badges || []); // Fallback if old backend
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const userId = normalizedEmail.replace(/[^a-z0-9]/g, '_');

    // Check for admin credentials
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
      const adminUser: UserData = {
        name: 'Admin',
        email: normalizedEmail,
        userId,
        totalScore: 0,
        totalAttempts: 0,
        totalTime: 0,
        xp: 99999,
        level: 100,
        streak: 999,
        lastLoginDate: new Date().toISOString(),
        badges: []
      };
      setIsAdmin(true);
      setCurrentUser(adminUser);
      setScreen('admin');
      // Save session
      sessionStorage.setItem('userSession', JSON.stringify({ user: adminUser, isAdmin: true }));
      await loadData();
      return;
    }

    try {
      const user = await api.login({ email: normalizedEmail, password });
      setCurrentUser(user);
      setScreen('quizList');
      sessionStorage.setItem('userSession', JSON.stringify({ user, isAdmin: false }));
    } catch (error: any) {
      console.error('Login error:', error);
      alert(error.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const userId = normalizedEmail.replace(/[^a-z0-9]/g, '_');

    try {
      const baseUserData: UserData = {
        userId,
        name: name.trim(),
        email: normalizedEmail,
        totalScore: 0,
        totalAttempts: 0,
        totalTime: 0,
        xp: 0,
        level: 1,
        streak: 0,
        lastLoginDate: new Date().toISOString(),
        badges: []
      };

      // api.register expects the user object + password? The previous code was sending the whole object.
      // We will cast/extend to include password for the API call.
      await api.register({ ...baseUserData, password } as any);

      setCurrentUser(baseUserData);
      setScreen('quizList');
      sessionStorage.setItem('userSession', JSON.stringify({ user: baseUserData, isAdmin: false }));
    } catch (error: any) {
      console.error('Registration error:', error);
      alert(error.message || 'Registration failed. Please try again.');
    }
  };

  const handleQuizSelect = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setScreen('quiz');
  };

  const handleQuizComplete = async (result: any) => {
    setQuizResult(result);
    setScreen('results');

    if (!currentUser || !selectedQuiz) return;

    const attempt: AttemptData = {
      attemptId: crypto.randomUUID(),
      userId: currentUser.userId,
      userName: currentUser.name, // Keep existing fields
      userEmail: currentUser.email, // Keep existing fields
      quizId: selectedQuiz.id,
      quizTitle: selectedQuiz.title,
      score: result.score,
      totalQuestions: result.totalQuestions, // Keep existing fields
      percentage: result.percentage,
      timeTaken: result.timeSpent || 0, // Use timeSpent from result
      answers: result.answers, // Keep existing fields
      completedAt: new Date().toISOString(),
      passed: result.passed // Add passed status
    };

    try {
      // 1. Save Attempt
      await api.saveAttempt(attempt);

      // 2. Calculate Gamification Updates
      const maxQuizScore = selectedQuiz.questions.reduce((sum, q) => sum + q.points, 0);
      const xpGained = calculateXPForQuiz(
        result.score || 0, // Points gained in this quiz
        maxQuizScore, // Max possible points
        result.timeSpent || 0
      );

      const currentXP = currentUser.xp || 0;
      const newXP = currentXP + xpGained;
      const newLevel = calculateLevel(newXP);

      // Check for badges
      // We need to pass the updated user state to checkNewBadges to see if they met thresholds
      // Construct a temporary updated user object
      const tempUserForBadges = {
        ...currentUser,
        totalScore: (currentUser.totalScore || 0) + result.score,
        totalAttempts: (currentUser.totalAttempts || 0) + 1,
        totalTime: (currentUser.totalTime || 0) + (result.timeSpent || 0),
        xp: newXP,
        level: newLevel,
        streak: currentUser.streak // Streak update is handled on login/home usually? Or here if daily? Let's leave streak for login.
      };

      const newBadges = checkNewBadges(tempUserForBadges, allBadges, {
        score: result.score,
        maxScore: maxQuizScore,
        timeSpent: result.timeSpent || 0
      });

      // 3. Update User Data (Local & Server)
      const userUpdates = {
        totalScore: tempUserForBadges.totalScore,
        totalAttempts: tempUserForBadges.totalAttempts,
        totalTime: tempUserForBadges.totalTime,
        xp: newXP,
        level: newLevel,
        badges: [...(currentUser.badges || []), ...newBadges]
      };

      // Optimistic update
      setCurrentUser({ ...currentUser, ...userUpdates });

      await api.updateUser(currentUser.userId, userUpdates);

      // Notify if badge earned? (Result screen might handle this by diffing user, or we pass it)
      if (newBadges.length > 0) {
        // Could set a global "new badge" state to show a modal?
        // For now just logging it, UserProfile will show it.
        console.log('New badges earned:', newBadges);
      }

      await loadData();
    } catch (error) {
      console.error('Failed to save attempt/update user:', error);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setScreen('login');
    setSelectedQuiz(null);
    setQuizResult(null);
    // Clear session
    sessionStorage.removeItem('userSession');
  };

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} onSwitchToRegister={() => setScreen('register')} />;
  }

  if (screen === 'register') {
    return <RegisterScreen onRegister={handleRegister} onSwitchToLogin={() => setScreen('login')} />;
  }

  if (screen === 'quizList' && currentUser) {
    return (
      <>
        <InstallPWA />
        <QuizList
          quizzes={availableQuizzes}
          user={currentUser}
          onSelectQuiz={handleQuizSelect}
          onViewProfile={() => setScreen('profile')}
          onViewLeaderboard={() => setScreen('leaderboard')}
          onLogout={handleLogout}
        />
      </>
    );
  }

  if (screen === 'leaderboard' && currentUser) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Leaderboard
          users={allUsers}
          currentUser={currentUser}
          onBack={() => setScreen('quizList')}
        />
      </Suspense>
    );
  }

  if (screen === 'quiz' && selectedQuiz && currentUser) {
    return (
      <Suspense fallback={<PageLoader />}>
        <QuizTaking
          quiz={selectedQuiz}
          user={currentUser}
          onComplete={handleQuizComplete}
          onBack={() => setScreen('quizList')}
        />
      </Suspense>
    );
  }

  if (screen === 'results' && quizResult && selectedQuiz) {
    return (
      <Suspense fallback={<PageLoader />}>
        <QuizResults
          result={quizResult}
          quiz={selectedQuiz}
          user={currentUser!}
          onBackToQuizzes={() => setScreen('quizList')}
          onRetake={() => setScreen('quiz')}
        />
      </Suspense>
    );
  }

  if (screen === 'admin' && isAdmin) {
    return (
      <Suspense fallback={<PageLoader />}>
        <AdminDashboard
          users={allUsers}
          attempts={allAttempts}
          quizzes={availableQuizzes}
          badges={allBadges}
          onLogout={handleLogout}
          onRefresh={loadData}
        />
      </Suspense>
    );
  }

  if (screen === 'profile' && currentUser) {
    return (
      <Suspense fallback={<PageLoader />}>
        <UserProfile
          user={currentUser}
          attempts={allAttempts.filter(a => a.userId === currentUser.userId)}
          allUsers={allUsers}
          onBack={() => setScreen('quizList')}
        />
      </Suspense>
    );
  }

  return null;
};

export default App;
