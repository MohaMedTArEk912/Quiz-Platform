import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from './models/User.js';
import { Attempt } from './models/Attempt.js';
import { Quiz } from './models/Quiz.js';
import { Badge } from './models/Badge.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not defined in .env');
  process.exit(1);
}

// Global connection state for serverless caching
let cachedConnection = null;

async function connectToDatabase() {
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    const opts = {
      // bufferCommands: false, // Re-enable buffering to avoid race conditions
    };
    
    cachedConnection = await mongoose.connect(uri, opts);
    console.log('Connected to MongoDB');
    
    // Only seed if NOT in production (Vercel) to avoid filesystem issues
    // Run locally once to seed the database!
    // if (process.env.NODE_ENV !== 'production') {
    //   await seedQuizzes();
    // }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

// Seed Quizzes
async function seedQuizzes() {
  try {
    const quizzesDir = path.join(__dirname, '../public/quizzes');
    
    // Check if directory exists
    if (!fs.existsSync(quizzesDir)) {
        console.warn('Quizzes directory not found for seeding:', quizzesDir);
        return;
    }

    const files = fs.readdirSync(quizzesDir).filter(file => file !== 'index.json' && file.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(quizzesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      try {
        const quiz = JSON.parse(content);
        // Upsert: Update if exists, Insert if not
        await Quiz.findOneAndUpdate(
          { id: quiz.id },
          quiz,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (err) {
        console.error(`Error parsing or saving ${file}:`, err);
      }
    }
    console.log('Quizzes seeded/updated successfully.');
  } catch (error) {
    console.error('Seeding error:', error);
  }
}

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    res.status(500).json({ message: 'Database connection failed', error: error.message });
  }
});

// Routes

// Get Quizzes
app.get('/api/quizzes', async (req, res) => {
  try {
    const quizzes = await Quiz.find({});
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create Quiz
app.post('/api/quizzes', async (req, res) => {
  try {
    const quizData = req.body;
    // Basic validation could go here
    const newQuiz = new Quiz(quizData);
    await newQuiz.save();
    res.status(201).json(newQuiz);
  } catch (error) {
    res.status(500).json({ message: 'Error creating quiz', error: error.message });
  }
});

// Update Quiz
app.put('/api/quizzes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedQuiz = await Quiz.findOneAndUpdate({ id: id }, updates, { new: true });
    
    if (!updatedQuiz) {
        return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json(updatedQuiz);
  } catch (error) {
    res.status(500).json({ message: 'Error updating quiz', error: error.message });
  }
});

// Delete Quiz
app.delete('/api/quizzes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedQuiz = await Quiz.findOneAndDelete({ id: id });
    
    if (!deletedQuiz) {
        return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting quiz', error: error.message });
  }
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { userId, name, email, password, createdAt } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = new User({
      userId,
      name,
      email,
      password, // In a real app, hash this!
      createdAt
    });

    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update User (Gamification & Admin)
app.put('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    // Prevent updating userId or email to existing one (simple check)
    // For now, trust the frontend logic or add validation if needed
    
    const user = await User.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

// Save Attempt
app.post('/api/attempts', async (req, res) => {
  try {
    const attemptData = req.body;
    const newAttempt = new Attempt(attemptData);
    await newAttempt.save();

    // Update user stats
    // Handled by specific user update call from Frontend now
    
    // const user = await User.findOne({ userId: attemptData.userId });
    // if (user) {
    //   user.totalScore += attemptData.score;
    //   user.totalAttempts += 1;
    //   await user.save();
    // }

    res.status(201).json(newAttempt);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all data (for Admin/Leaderboard)
app.get('/api/data', async (req, res) => {
  try {
    const users = await User.find({});
    const attempts = await Attempt.find({});
    // Optionally return quizzes here too if the Dashboard needs them
    
    // Also fetch badges for dynamic gamification
    const badges = await Badge.find({});

    res.json({ users, attempts, badges });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// --- Badge Routes ---

// Get Badges
app.get('/api/badges', async (req, res) => {
    try {
        const badges = await Badge.find({});
        res.json(badges);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching badges', error: error.message });
    }
});

// Create Badge
app.post('/api/badges', async (req, res) => {
    try {
        const badgeData = req.body;
        const newBadge = new Badge(badgeData);
        await newBadge.save();
        res.status(201).json(newBadge);
    } catch (error) {
        res.status(500).json({ message: 'Error creating badge', error: error.message });
    }
});

// Delete Badge
app.delete('/api/badges/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Badge.findOneAndDelete({ id });
        if (!result) {
            return res.status(404).json({ message: 'Badge not found' });
        }
        res.json({ message: 'Badge deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting badge', error: error.message });
    }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
