import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  title: { type: String, default: '' },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['milestones', 'perfection', 'streaks', 'speed', 'xp', 'skills', 'social', 'arena', 'other'],
    default: 'milestones' 
  },
  rarity: { 
    type: String, 
    enum: ['common', 'rare', 'epic', 'legendary', 'mythic'],
    default: 'common' 
  },
  xpReward: { type: Number, default: 50 },
  criteria: {
    type: { 
      type: String, 
      required: true 
    },
    threshold: { type: Number, default: 1 },
    operator: { type: String, default: '>=' }
  },
  createdAt: { type: Date, default: Date.now }
});

badgeSchema.index({ category: 1, rarity: 1 });

export const Badge = mongoose.model('Badge', badgeSchema);
