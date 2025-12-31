import mongoose from 'mongoose';

const badgeNodeSchema = new mongoose.Schema({
  badgeId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  
  // Unlock criteria (can have multiple - ALL must be met)
  unlockCriteria: [{
    type: { 
      type: String,
      enum: [
        'total_attempts', 'total_score', 'streak', 'level', 
        'perfect_score', 'speed_demon', 'quiz_completion',
        'exam_pass', 'tournament_win', 'tournament_participate',
        'track_completion', 'module_completion', 'friend_count',
        'challenge_wins', 'manual' // Admin can manually award
      ],
      required: true
    },
    threshold: { type: Number }, // e.g., 10 attempts, 500 score
    quizId: { type: String }, // For quiz-specific badges
    trackId: { type: String }, // For track-specific badges
    tournamentId: { type: String }, // For tournament-specific badges
    operator: { 
      type: String, 
      enum: ['>=', '>', '=', '<', '<='],
      default: '>='
    }
  }],
  
  // Rewards for earning this badge
  rewards: {
    xp: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    powerUps: [{
      type: { type: String },
      quantity: { type: Number, default: 1 }
    }]
  },
  
  // Visual properties
  color: { type: String, default: '#3B82F6' }, // Default blue
  rarity: { 
    type: String, 
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  
  // Tree relationship (can appear in multiple trees)
  trees: [{ type: String }], // Array of treeIds
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
badgeNodeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const BadgeNode = mongoose.model('BadgeNode', badgeNodeSchema);
