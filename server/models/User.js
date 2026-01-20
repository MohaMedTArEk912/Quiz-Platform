import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  totalScore: { type: Number, default: 0 },
  totalAttempts: { type: Number, default: 0 },
  totalTime: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  lastLoginDate: { type: Date, default: Date.now },
  avatar: {
    skinColor: { type: String },
    hairStyle: { type: String },
    hairColor: { type: String },
    accessory: { type: String },
    backgroundColor: { type: String },
    mood: { type: String }
  },
  badges: [{
    id: String,
    name: String,
    description: String,
    icon: String,
    dateEarned: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  friends: [{ type: String, ref: 'User' }], // Stores userIds
  friendRequests: [{
    from: { type: String, ref: 'User' }, // userId
    to: { type: String, ref: 'User' }, // userId
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }],
  clanInvites: [{
    clanId: { type: String },
    clanName: { type: String },
    invitedBy: { type: String }, // userId of inviter
    createdAt: { type: Date, default: Date.now }
  }],
  // Economy & power-ups
  coins: { type: Number, default: 0 },
  inventory: [{
    itemId: String,
    quantity: { type: Number, default: 0 }
  }],
  powerUps: [{
    type: { type: String }, // e.g., '5050', 'time_freeze'
    quantity: { type: Number, default: 0 }
  }],
  unlockedItems: [{ type: String }], // Array of itemIds for permanent unlocks (cosmetics)
  // Daily challenge streak
  dailyChallengeDate: { type: Date },
  dailyChallengeCompleted: { type: Boolean, default: false },
  dailyChallengeStreak: { type: Number, default: 0 },
  // Skill tracks progress (simplified)
  skillTracks: [{
    trackId: String,
    unlockedModules: [String],
    completedModules: [String],
    completedSubModules: [String] // Format: "moduleId:subModuleId"
  }],
  clanId: { type: String } // Simplified link to clan
});

// Indexes to speed up lookups and leaderboards
userSchema.index({ totalScore: -1 });
userSchema.index({ name: 1 });

export const User = mongoose.model('User', userSchema);
