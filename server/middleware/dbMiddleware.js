import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;

// Global connection state for serverless caching
let cachedConnection = null;

export async function connectToDatabase() {
  if (cachedConnection) {
    return cachedConnection;
  }

  if (!uri) {
    console.error('MONGODB_URI is not defined in .env');
    throw new Error('MONGODB_URI is not defined');
  }

  try {
    const opts = {
      serverSelectionTimeoutMS: 5000, // Fail fast after 5s if DB is unreachable
      socketTimeoutMS: 45000,
    };
    cachedConnection = await mongoose.connect(uri, opts);
    console.log('Connected to MongoDB');
    return cachedConnection;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

export const dbMiddleware = async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    res.status(500).json({ message: 'Database connection failed', error: error.message });
  }
};
