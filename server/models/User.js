import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  totalScore: { type: Number, default: 0 },
  totalAttempts: { type: Number, default: 0 },
  totalTime: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  lastLoginDate: { type: Date, default: Date.now },
  badges: [{
    id: String,
    name: String,
    description: String,
    icon: String,
    dateEarned: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
