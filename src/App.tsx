import { useState, useEffect } from 'react';
import type { Quiz, UserData, AttemptData } from './types/index.ts';
import { storage } from './utils/storage.ts';
import { supabase, isValidSupabaseConfig } from './lib/supabase.ts';
import LoginScreen from './components/LoginScreen.tsx';
import QuizList from './components/QuizList.tsx';
import QuizTaking from './components/QuizTaking.tsx';
import QuizResults from './components/QuizResults.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import UserProfile from './components/UserProfile.tsx';

const App = () => {
  const [screen, setScreen] = useState<'login' | 'quizList' | 'quiz' | 'results' | 'admin' | 'profile'>('login');
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [allAttempts, setAllAttempts] = useState<AttemptData[]>([]);

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

  const handleLogin = async (name: string, email: string, password: string) => {
    const userId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');

    if (email === 'admin@quiz.com' && password === 'admin123') {
      setIsAdmin(true);
      setCurrentUser({ name: 'Admin', email, userId });
      setScreen('admin');
      await loadData();
      return;
    }

    if (isValidSupabaseConfig() && supabase) {
      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        let userData: UserData;

        if (existingUser) {
          if (existingUser.password !== password) {
            alert('Incorrect password!');
            return;
          }
          userData = existingUser;
        } else {
          userData = {
            userId,
            name,
            email,
            password,
            totalScore: 0,
            totalAttempts: 0,
            createdAt: new Date().toISOString()
          };
          await supabase.from('users').insert([userData]);
        }

        setCurrentUser(userData);
        setScreen('quizList');
      } catch (error) {
        console.error('Login error:', error);
        alert('Login failed.');
      }
    } else {
      try {
        const userKey = `user:${userId}`;
        let userData: UserData;

        try {
          const existing = await storage.get(userKey, true);
          userData = JSON.parse(existing.value);

          if (userData.password !== password) {
            alert('Incorrect password!');
            return;
          }
        } catch {
          userData = {
            userId,
            name,
            email,
            password,
            totalScore: 0,
            totalAttempts: 0,
            createdAt: new Date().toISOString()
          };
          await storage.set(userKey, JSON.stringify(userData), true);
        }

        setCurrentUser(userData);
        setScreen('quizList');
      } catch (error) {
        console.error(error);
        alert('Login failed.');
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
  };

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
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
