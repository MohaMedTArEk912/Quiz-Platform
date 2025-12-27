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
    if (process.env.NODE_ENV !== 'production') {
      await seedQuizzes();
    }
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

// Save Attempt
app.post('/api/attempts', async (req, res) => {
  try {
    const attemptData = req.body;
    const newAttempt = new Attempt(attemptData);
    await newAttempt.save();

    // Update user stats
    const user = await User.findOne({ userId: attemptData.userId });
    if (user) {
      user.totalScore += attemptData.score;
      user.totalAttempts += 1;
      await user.save();
    }

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
    const quizzes = await Quiz.find({}); 
    res.json({ users, attempts, quizzes }); 
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
