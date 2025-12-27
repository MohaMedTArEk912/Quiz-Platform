import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Award, RotateCcw, User, Mail, Lock, LogOut, BarChart3, Users, TrendingUp } from 'lucide-react';

const PythonQuiz = () => {
  const [screen, setScreen] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [allAttempts, setAllAttempts] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const usersResult = await window.storage.list('user:', true);
      const attemptsResult = await window.storage.list('attempt:', true);
      
      if (usersResult && usersResult.keys) {
        const userPromises = usersResult.keys.map(key => 
          window.storage.get(key, true)
        );
        const userData = await Promise.all(userPromises);
        setAllUsers(userData.filter(u => u).map(u => JSON.parse(u.value)));
      }

      if (attemptsResult && attemptsResult.keys) {
        const attemptPromises = attemptsResult.keys.map(key => 
          window.storage.get(key, true)
        );
        const attemptData = await Promise.all(attemptPromises);
        setAllAttempts(attemptData.filter(a => a).map(a => JSON.parse(a.value)));
      }
    } catch (error) {
      console.log('No existing data');
    }
  };

  const handleLogin = async (name, email, password) => {
    const userId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    if (email === 'admin@python.com' && password === 'admin123') {
      setIsAdmin(true);
      setCurrentUser({ name: 'Admin', email, userId });
      setScreen('dashboard');
      await loadData();
      return;
    }

    try {
      const userKey = `user:${userId}`;
      let userData;
      
      try {
        const existing = await window.storage.get(userKey, true);
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
          createdAt: new Date().toISOString()
        };
        await window.storage.set(userKey, JSON.stringify(userData), true);
      }

      setCurrentUser(userData);
      setScreen('quiz');
    } catch (error) {
      alert('Login failed. Please try again.');
    }
  };

  const saveAttempt = async () => {
    const attemptId = `${currentUser.userId}_${Date.now()}`;
    const attempt = {
      attemptId,
      userId: currentUser.userId,
      userName: currentUser.name,
      userEmail: currentUser.email,
      score,
      totalQuestions: questions.length,
      percentage: Math.round((score / questions.length) * 100),
      answers,
      completedAt: new Date().toISOString()
    };

    try {
      await window.storage.set(`attempt:${attemptId}`, JSON.stringify(attempt), true);
      await loadData();
    } catch (error) {
      console.error('Failed to save attempt:', error);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setScreen('login');
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnswers({});
  };

  const questions = [
    {
      part: "Part 1: Variables & Printing",
      number: 1,
      question: "Nora wants to save her name in Python. Which line is correct?",
      options: ['name = Nora', 'name == "Nora"', 'name = "Nora"', '"Nora" = name'],
      correct: 2,
      explanation: 'Variables are assigned using = and strings need quotes.'
    },
    {
      part: "Part 1: Variables & Printing",
      number: 2,
      question: "Which sentence best describes a variable?",
      options: ['A picture in Python', 'A place that stores information', 'A button', 'A command that prints'],
      correct: 1,
      explanation: 'A variable is like a box that stores information for later use.'
    },
    {
      part: "Part 1: Variables & Printing",
      number: 3,
      question: "Ahmed writes this code:\n\nage = 9\nprint(age)\n\nWhat will appear on the screen?",
      options: ['age', '"age"', '9', 'error'],
      correct: 2,
      explanation: 'print(age) displays the VALUE stored in the variable age, which is 9.'
    },
    {
      part: "Part 1: Variables & Printing",
      number: 4,
      question: "Which one is NOT allowed as a variable name?",
      options: ['_score', 'score1', '1score', 'score'],
      correct: 2,
      explanation: 'Variable names cannot START with a number. 1score is invalid.'
    },
    {
      part: "Part 1: Variables & Printing",
      number: 5,
      question: 'What will Python print?\n\nprint("apple")',
      options: ['apple', '"apple"', 'Apple', 'error'],
      correct: 0,
      explanation: 'print() displays the text without the quotes. Output: apple'
    },
    {
      part: "Part 1: Variables & Printing",
      number: 6,
      question: "Lina wants to store her favorite number. Which is correct?",
      options: ['fav = "7"', 'fav = 7', 'fav == 7', '"fav" = 7'],
      correct: 1,
      explanation: 'To store a number (not text), use fav = 7 without quotes.'
    },
    {
      part: "Part 1: Variables & Printing",
      number: 7,
      question: "Which data type is used for words and sentences?",
      options: ['Number', 'Boolean', 'String', 'Operator'],
      correct: 2,
      explanation: 'String is the data type for text, words, and sentences.'
    },
    {
      part: "Part 1: Variables & Printing",
      number: 8,
      question: "What does print() do?",
      options: ['Saves data', 'Deletes data', 'Shows output', 'Checks condition'],
      correct: 2,
      explanation: 'print() displays output on the screen for the user to see.'
    },
    {
      part: "Part 2: Boolean & Comparisons",
      number: 9,
      question: "Which value means YES in Python?",
      options: ['yes', '1', 'True', 'ok'],
      correct: 2,
      explanation: 'True (with capital T) is the Boolean value that means YES.'
    },
    {
      part: "Part 2: Boolean & Comparisons",
      number: 10,
      question: "What is the result of:\n\n10 > 3",
      options: ['False', 'True', '10', 'error'],
      correct: 1,
      explanation: '10 is greater than 3, so the comparison returns True.'
    },
    {
      part: "Part 2: Boolean & Comparisons",
      number: 11,
      question: "What does Python print?\n\n5 == 5",
      options: ['False', 'True', '5', 'error'],
      correct: 1,
      explanation: '5 equals 5, so the comparison returns True.'
    },
    {
      part: "Part 2: Boolean & Comparisons",
      number: 12,
      question: "Which symbol checks equality?",
      options: ['=', '==', '!=', '=>'],
      correct: 1,
      explanation: '== checks if two values are equal. = is for assignment.'
    },
    {
      part: "Part 2: Boolean & Comparisons",
      number: 13,
      question: 'What will this show?\n\n"5" == 5',
      options: ['True', 'False', 'error', '5'],
      correct: 1,
      explanation: '"5" is a string and 5 is a number. Different types are not equal.'
    },
    {
      part: "Part 2: Boolean & Comparisons",
      number: 14,
      question: 'Sara checks if two names are the same:\n\n"Ali" == "Ali"\n\nWhat is the result?',
      options: ['False', 'True', 'error', 'Ali'],
      correct: 1,
      explanation: 'Both strings are identical, so the comparison returns True.'
    },
    {
      part: "Part 2: Boolean & Comparisons",
      number: 15,
      question: "Which one is a Boolean value?",
      options: ['"True"', 'yes', 'False', '1'],
      correct: 2,
      explanation: 'False (with capital F) is a Boolean value.'
    },
    {
      part: "Part 3: Logic (and / or / not)",
      number: 16,
      question: "A game opens only if the player is logged in AND has coins. Which operator should be used?",
      options: ['or', 'not', 'and', '=='],
      correct: 2,
      explanation: 'AND requires BOTH conditions to be true.'
    },
    {
      part: "Part 3: Logic (and / or / not)",
      number: 17,
      question: "What is the result?\n\nTrue and False",
      options: ['True', 'False', '1', 'error'],
      correct: 1,
      explanation: 'AND requires both to be True. Since one is False, result is False.'
    },
    {
      part: "Part 3: Logic (and / or / not)",
      number: 18,
      question: "A child can enter the park if they have a ticket OR a pass. Which operator fits?",
      options: ['and', 'not', 'or', '=='],
      correct: 2,
      explanation: 'OR means at least ONE condition must be true.'
    },
    {
      part: "Part 3: Logic (and / or / not)",
      number: 19,
      question: "What will Python print?\n\nnot True",
      options: ['True', 'False', '1', 'error'],
      correct: 1,
      explanation: 'NOT reverses the value. not True becomes False.'
    },
    {
      part: "Part 3: Logic (and / or / not)",
      number: 20,
      question: "Which result is correct?\n\nFalse or False",
      options: ['True', 'False', '0', 'error'],
      correct: 1,
      explanation: 'OR requires at least ONE to be True. Both are False, so result is False.'
    },
    {
      part: "Part 3: Logic (and / or / not)",
      number: 21,
      question: "What does not do?",
      options: ['adds values', 'compares values', 'reverses True/False', 'prints text'],
      correct: 2,
      explanation: 'NOT flips Boolean values: True becomes False, False becomes True.'
    },
    {
      part: "Part 4: If / Elif / Else",
      number: 22,
      question: "Python checks conditions using:",
      options: ['print', 'input', 'if', 'type'],
      correct: 2,
      explanation: 'if is the keyword used to check conditions in Python.'
    },
    {
      part: "Part 4: If / Elif / Else",
      number: 23,
      question: "What happens if the if condition is False and there is no else?",
      options: ['Error', 'Program stops', 'Nothing happens', 'Prints False'],
      correct: 2,
      explanation: 'Python simply skips the if block and continues.'
    },
    {
      part: "Part 4: If / Elif / Else",
      number: 24,
      question: "Which code is written correctly?",
      options: ['if x > 5 print("Hi")', 'if x > 5: print("Hi")', 'if (x > 5) print("Hi")', 'if x > 5 then:'],
      correct: 1,
      explanation: 'Python if statements need a colon and indentation.'
    },
    {
      part: "Part 4: If / Elif / Else",
      number: 25,
      question: "You are making a calculator. Which structure is BEST?",
      options: ['only if', 'only else', 'if-elif', 'print'],
      correct: 2,
      explanation: 'if-elif allows checking multiple operations.'
    },
    {
      part: "Part 4: If / Elif / Else",
      number: 26,
      question: "What keyword lets you check another condition?",
      options: ['else', 'elif', 'when', 'check'],
      correct: 1,
      explanation: 'elif (else if) allows checking additional conditions after if.'
    },
    {
      part: "Part 4: If / Elif / Else",
      number: 27,
      question: "What keyword runs when all conditions are false?",
      options: ['elif', 'if', 'else', 'stop'],
      correct: 2,
      explanation: 'else runs when all previous if and elif conditions are False.'
    },
    {
      part: "Part 4: If / Elif / Else",
      number: 28,
      question: "Apple color can be red, yellow, or green. Which structure is BEST to check this?",
      options: ['if only', 'if-elif-else', 'print', 'and'],
      correct: 1,
      explanation: 'if-elif-else is perfect for checking multiple distinct options.'
    },
    {
      part: "Part 4: If / Elif / Else",
      number: 29,
      question: "A school allows students if they wear a white shirt OR blue pants. Which operator is correct?",
      options: ['and', 'or', 'not', '=='],
      correct: 1,
      explanation: 'OR means either condition can be true.'
    },
    {
      part: "Part 4: If / Elif / Else",
      number: 30,
      question: "What will this print?\n\nwhiteShirt = False\nbluePantalon = True\nprint(whiteShirt or bluePantalon)",
      options: ['False', 'True', 'error', 'nothing'],
      correct: 1,
      explanation: 'OR returns True if at least ONE value is True.'
    }
  ];

  const handleAnswer = (index) => {
    setSelectedAnswer(index);
    const isCorrect = index === questions[currentQuestion].correct;
    
    setAnswers({
      ...answers,
      [currentQuestion]: {
        selected: index,
        correct: isCorrect
      }
    });

    if (isCorrect) {
      setScore(score + 1);
    }
    
    setShowResult(true);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      saveAttempt();
      setScreen('complete');
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnswers({});
    setScreen('quiz');
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (screen === 'dashboard') {
    return <Dashboard attempts={allAttempts} users={allUsers} onLogout={handleLogout} />;
  }

  if (screen === 'complete') {
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-700">Welcome, {currentUser.name}!</h2>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors">
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>

          <div className="text-center">
            <Award className="w-24 h-24 mx-auto mb-6" style={{ color: getScoreColor(percentage) }} />
            <h1 className="text-4xl font-bold mb-4" style={{ color: getScoreColor(percentage) }}>Quiz Complete!</h1>
            <div className="text-6xl font-bold mb-6" style={{ color: getScoreColor(percentage) }}>{score}/{questions.length}</div>
            <div className="text-2xl mb-8 text-gray-700">You scored {percentage}%</div>
            
            {percentage >= 80 && <p className="text-xl text-green-600 mb-6">Excellent! You are a Python superstar!</p>}
            {percentage >= 60 && percentage < 80 && <p className="text-xl text-yellow-600 mb-6">Good job! Keep practicing to improve!</p>}
            {percentage < 60 && <p className="text-xl text-red-600 mb-6">Don't give up! Review the material and try again!</p>}
            
            <button onClick={restartQuiz} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl text-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 flex items-center gap-3 mx-auto">
              <RotateCcw className="w-6 h-6" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-purple-600">Python JR Quiz</h1>
              <p className="text-gray-600 mt-1">{q.part}</p>
              <p className="text-sm text-gray-500">Student: {currentUser.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{score}</div>
                <div className="text-sm text-gray-600">Score</div>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-center text-sm text-gray-600 mt-2">Question {currentQuestion + 1} of {questions.length}</div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <div className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-semibold mb-4">Question {q.number}</div>
            <h2 className="text-2xl font-bold text-gray-800 whitespace-pre-line">{q.question}</h2>
          </div>

          <div className="space-y-4 mb-6">
            {q.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === q.correct;
              const showCorrect = showResult && isCorrect;
              const showIncorrect = showResult && isSelected && !isCorrect;

              return (
                <button key={index} onClick={() => !showResult && handleAnswer(index)} disabled={showResult}
                  className={`w-full p-5 rounded-xl text-left transition-all transform hover:scale-102 flex items-center gap-4 font-medium text-lg ${
                    showCorrect ? 'bg-green-100 border-2 border-green-500 text-green-800' :
                    showIncorrect ? 'bg-red-100 border-2 border-red-500 text-red-800' :
                    isSelected ? 'bg-purple-100 border-2 border-purple-500' :
                    'bg-gray-50 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                  }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${
                    showCorrect ? 'bg-green-500 text-white' :
                    showIncorrect ? 'bg-red-500 text-white' :
                    'bg-gray-300 text-gray-700'
                  }`}>
                    {String.fromCharCode(97 + index)}
                  </div>
                  <span className="whitespace-pre-line flex-1">{option}</span>
                  {showCorrect && <CheckCircle className="w-6 h-6 text-green-500" />}
                  {showIncorrect && <XCircle className="w-6 h-6 text-red-500" />}
                </button>
              );
            })}
          </div>

          {showResult && (
            <div className={`p-6 rounded-xl mb-6 ${selectedAnswer === q.correct ? 'bg-green-50 border-2 border-green-300' : 'bg-blue-50 border-2 border-blue-300'}`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">{selectedAnswer === q.correct ? '✅' : '💡'}</div>
                <div>
                  <div className="font-bold text-lg mb-2">{selectedAnswer === q.correct ? 'Correct!' : 'Explanation:'}</div>
                  <p className="text-gray-700">{q.explanation}</p>
                </div>
              </div>
            </div>
          )}

          {showResult && (
            <button onClick={nextQuestion} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-xl hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105">
              {currentQuestion < questions.length - 1 ? 'Next Question' : 'See Results'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const LoginScreen = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() && email.trim() && password.trim()) {
      onLogin(name, email, password);
    } else {
      alert('Please fill in all fields');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🐍</div>
          <h1 className="text-4xl font-bold text-purple-600 mb-2">Python JR Quiz</h1>
          <p className="text-gray-600">Sign in to start your quiz</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your.email@example.com"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors" />
            </div>
          </div>

          <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg">
            Start Quiz
          </button>
        </form>

        <div className="mt-6 p-4 bg-purple-50 rounded-xl">
          <p className="text-sm text-center text-gray-600">
            <strong>Admin Access:</strong><br />
            Email: admin@python.com<br />
            Password: admin123
          </p>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ attempts, users, onLogout }) => {
  const sortedAttempts = [...attempts].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  const stats = {
    totalUsers: users.length,
    totalAttempts: attempts.length,
    averageScore: attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length) : 0
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold text-purple-600">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">Python JR Quiz Management</p>
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-semibold">
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white">
              <div className="flex items-center gap-4">
                <Users className="w-12 h-12" />
                <div>
                  <div className="text-3xl font-bold">{stats.totalUsers}</div>
                  <div className="text-blue-100">Total Students</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white">
              <div className="flex items-center gap-4">
                <BarChart3 className="w-12 h-