import { useState, useEffect } from 'react';
import type { Quiz, UserData, AttemptData } from './types/index.ts';

import { api } from './lib/api.ts';
import LoginScreen from './components/LoginScreen.tsx';
import RegisterScreen from './components/RegisterScreen.tsx';
import QuizList from './components/QuizList.tsx';
import QuizTaking from './components/QuizTaking.tsx';
import QuizResults from './components/QuizResults.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import UserProfile from './components/UserProfile.tsx';
import Leaderboard from './components/Leaderboard.tsx';

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

  // Load session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('userSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setCurrentUser(session.user);
        setIsAdmin(session.isAdmin);
        setScreen(session.isAdmin ? 'admin' : 'quizList');
      } catch (error) {
        console.error('Failed to load session:', error);
        localStorage.removeItem('userSession');
      }
    }
  }, []);

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
      const { users, attempts } = await api.getData();
      setAllUsers(users);
      setAllAttempts(attempts);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const userId = normalizedEmail.replace(/[^a-z0-9]/g, '_');

    // Check for admin credentials
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
      const adminUser = { name: 'Admin', email: normalizedEmail, userId, totalScore: 0, totalAttempts: 0 };
      setIsAdmin(true);
      setCurrentUser(adminUser);
      setScreen('admin');
      // Save session
      localStorage.setItem('userSession', JSON.stringify({ user: adminUser, isAdmin: true }));
      await loadData();
      return;
    }

    try {
      const user = await api.login({ email: normalizedEmail, password });
      setCurrentUser(user);
      setScreen('quizList');
      localStorage.setItem('userSession', JSON.stringify({ user, isAdmin: false }));
    } catch (error: any) {
      console.error('Login error:', error);
      alert(error.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const userId = normalizedEmail.replace(/[^a-z0-9]/g, '_');

    try {
      const userData = {
        userId,
        name: name.trim(),
        email: normalizedEmail,
        password,
        totalScore: 0,
        totalAttempts: 0,
        createdAt: new Date().toISOString()
      };

      await api.register(userData);
      setCurrentUser(userData);
      setScreen('quizList');
      localStorage.setItem('userSession', JSON.stringify({ user: userData, isAdmin: false }));
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
      attemptId: `${currentUser.userId}_${Date.now()}`,
      userId: currentUser.userId,
      userName: currentUser.name,
      userEmail: currentUser.email,
      quizId: selectedQuiz.id,
      quizTitle: selectedQuiz.title,
      score: result.score,
      totalQuestions: result.totalQuestions,
      percentage: result.percentage,
      timeTaken: result.timeTaken,
      answers: result.answers,
      completedAt: new Date().toISOString()
    };

    try {
      await api.saveAttempt(attempt);

      // Speculate update local state for immediate feedback
      if (currentUser) {
        const newTotalScore = (currentUser.totalScore || 0) + result.score;
        const newTotalAttempts = (currentUser.totalAttempts || 0) + 1;
        setCurrentUser({ ...currentUser, totalScore: newTotalScore, totalAttempts: newTotalAttempts });
      }

      await loadData();
    } catch (error) {
      console.error('Failed to save attempt:', error);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setScreen('login');
    setSelectedQuiz(null);
    setQuizResult(null);
    // Clear session
    localStorage.removeItem('userSession');
  };

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} onSwitchToRegister={() => setScreen('register')} />;
  }

  if (screen === 'register') {
    return <RegisterScreen onRegister={handleRegister} onSwitchToLogin={() => setScreen('login')} />;
  }

  if (screen === 'quizList' && currentUser) {
    return (
      <QuizList
        quizzes={availableQuizzes}
        user={currentUser}
        onSelectQuiz={handleQuizSelect}
        onViewProfile={() => setScreen('profile')}
        onViewLeaderboard={() => setScreen('leaderboard')}
        onLogout={handleLogout}
      />
    );
  }

  if (screen === 'leaderboard' && currentUser) {
    return (
      <Leaderboard
        users={allUsers}
        currentUser={currentUser}
        onBack={() => setScreen('quizList')}
      />
    );
  }

  if (screen === 'quiz' && selectedQuiz && currentUser) {
    return (
      <QuizTaking
        quiz={selectedQuiz}
        user={currentUser}
        onComplete={handleQuizComplete}
        onBack={() => setScreen('quizList')}
      />
    );
  }

  if (screen === 'results' && quizResult && selectedQuiz) {
    return (
      <QuizResults
        result={quizResult}
        quiz={selectedQuiz}
        onBackToQuizzes={() => setScreen('quizList')}
        onRetake={() => setScreen('quiz')}
      />
    );
  }

  if (screen === 'admin' && isAdmin) {
    return (
      <AdminDashboard
        users={allUsers}
        attempts={allAttempts}
        quizzes={availableQuizzes}
        onLogout={handleLogout}
        onRefresh={loadData}
      />
    );
  }

  if (screen === 'profile' && currentUser) {
    return (
      <UserProfile
        user={currentUser}
        attempts={allAttempts.filter(a => a.userId === currentUser.userId)}
        allUsers={allUsers}
        onBack={() => setScreen('quizList')}
      />
    );
  }

  return null;
};

export default App;
