import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  criteria: {
    type: { 
      type: String, 
      enum: ['total_attempts', 'total_score', 'streak', 'level', 'perfect_score', 'speed_demon'],
      required: true 
    },
    threshold: { type: Number, required: true }
  },
  createdAt: { type: Date, default: Date.now }
});

export const Badge = mongoose.model('Badge', badgeSchema);
