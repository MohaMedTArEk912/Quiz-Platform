import { useState, useEffect } from 'react';
import type { Quiz, UserData, AttemptData } from './types/index.ts';
import { storage } from './utils/storage.ts';
import { supabase, isValidSupabaseConfig } from './lib/supabase.ts';
import LoginScreen from './components/LoginScreen.tsx';
import RegisterScreen from './components/RegisterScreen.tsx';
import QuizList from './components/QuizList.tsx';
import QuizTaking from './components/QuizTaking.tsx';
import QuizResults from './components/QuizResults.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import UserProfile from './components/UserProfile.tsx';

// Admin credentials from environment variables (with defaults)
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@quiz.com';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

const App = () => {
  const [screen, setScreen] = useState<'login' | 'register' | 'quizList' | 'quiz' | 'results' | 'admin' | 'profile'>('login');
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
      const indexRes = await fetch('/quizzes/index.json');
      const quizFiles = await indexRes.json();

      const quizzes = await Promise.all(
        quizFiles.map(async (file: string) => {
          const res = await fetch(`/quizzes/${file}`);
          return res.json();
        })
      );

      setAvailableQuizzes(quizzes);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    }
  };

  const loadData = async () => {
    if (isValidSupabaseConfig() && supabase) {
      try {
        const { data: usersData } = await supabase.from('users').select('*');
        const { data: attemptsData } = await supabase.from('attempts').select('*');

        if (usersData) setAllUsers(usersData);
        if (attemptsData) setAllAttempts(attemptsData);
      } catch (error) {
        console.error('Supabase load error:', error);
      }
    } else {
      try {
        const usersResult = await storage.list('user:', true);
        const attemptsResult = await storage.list('attempt:', true);

        if (usersResult?.keys) {
          const userPromises = usersResult.keys.map(key => storage.get(key, true));
          const userDataResult = await Promise.all(userPromises);
          setAllUsers(userDataResult.filter(u => u).map(u => JSON.parse(u.value)));
        }

        if (attemptsResult?.keys) {
          const attemptPromises = attemptsResult.keys.map(key => storage.get(key, true));
          const attemptDataResult = await Promise.all(attemptPromises);
          setAllAttempts(attemptDataResult.filter(a => a).map(a => JSON.parse(a.value)));
        }
      } catch (error) {
        console.log('No existing data', error);
      }
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

    if (isValidSupabaseConfig() && supabase) {
      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .ilike('email', normalizedEmail)
          .single();

        if (!existingUser) {
          alert('User not found. Please register first.');
          return;
        }

        if (existingUser.password !== password) {
          alert('Incorrect password!');
          return;
        }

        setCurrentUser(existingUser);
        setScreen('quizList');
        // Save session
        localStorage.setItem('userSession', JSON.stringify({ user: existingUser, isAdmin: false }));
      } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please check your credentials.');
      }
    } else {
      try {
        const userKey = `user:${userId}`;
        const existing = await storage.get(userKey, true);

        if (!existing) {
          alert('User not found. Please register first.');
          return;
        }

        const userData: UserData = JSON.parse(existing.value);

        if (userData.password !== password) {
          alert('Incorrect password!');
          return;
        }

        setCurrentUser(userData);
        setScreen('quizList');
        // Save session
        localStorage.setItem('userSession', JSON.stringify({ user: userData, isAdmin: false }));
      } catch (error) {
        console.error(error);
        alert('Login failed. Please check your credentials.');
      }
    }
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const userId = normalizedEmail.replace(/[^a-z0-9]/g, '_');

    if (isValidSupabaseConfig() && supabase) {
      try {
        // Check if user already exists (case-insensitive)
        const { data: existingUsers } = await supabase
          .from('users')
          .select('email')
          .ilike('email', normalizedEmail);

        if (existingUsers && existingUsers.length > 0) {
          alert('An account with this email already exists. Please login instead.');
          return;
        }

        const userData: UserData = {
          userId,
          name: name.trim(),
          email: normalizedEmail,
          password,
          totalScore: 0,
          totalAttempts: 0,
          createdAt: new Date().toISOString()
        };

        await supabase.from('users').insert([userData]);
        setCurrentUser(userData);
        setScreen('quizList');
        // Save session
        localStorage.setItem('userSession', JSON.stringify({ user: userData, isAdmin: false }));
      } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
      }
    } else {
      try {
        const userKey = `user:${userId}`;

        // Check if user already exists
        try {
          const existing = await storage.get(userKey, true);
          if (existing) {
            alert('User already exists. Please login instead.');
            return;
          }
        } catch {
          // User doesn't exist, continue with registration
        }

        const userData: UserData = {
          userId,
          name: name.trim(),
          email: normalizedEmail,
          password,
          totalScore: 0,
          totalAttempts: 0,
          createdAt: new Date().toISOString()
        };

        await storage.set(userKey, JSON.stringify(userData), true);
        setCurrentUser(userData);
        setScreen('quizList');
        // Save session
        localStorage.setItem('userSession', JSON.stringify({ user: userData, isAdmin: false }));
      } catch (error) {
        console.error(error);
        alert('Registration failed. Please try again.');
      }
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

    if (isValidSupabaseConfig() && supabase) {
      try {
        await supabase.from('attempts').insert([attempt]);

        const newTotalScore = (currentUser.totalScore || 0) + result.score;
        const newTotalAttempts = (currentUser.totalAttempts || 0) + 1;

        await supabase.from('users')
          .update({ totalScore: newTotalScore, totalAttempts: newTotalAttempts })
          .eq('userId', currentUser.userId);

        await loadData();
      } catch (error) {
        console.error('Failed to save:', error);
      }
    } else {
      try {
        await storage.set(`attempt:${attempt.attemptId}`, JSON.stringify(attempt), true);

        const newTotalScore = (currentUser.totalScore || 0) + result.score;
        const newTotalAttempts = (currentUser.totalAttempts || 0) + 1;
        currentUser.totalScore = newTotalScore;
        currentUser.totalAttempts = newTotalAttempts;

        await storage.set(`user:${currentUser.userId}`, JSON.stringify(currentUser), true);
        await loadData();
      } catch (error) {
        console.error('Failed to save:', error);
      }
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
        onLogout={handleLogout}
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
