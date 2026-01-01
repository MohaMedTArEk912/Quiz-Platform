import mongoose from 'mongoose';

const skillTrackProgressSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  trackId: {
    type: String,
    required: true
  },
  completedModules: [{
    type: String // Create/store moduleIDs
  }],
  unlockedModules: [{
    type: String
  }],
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one progress record per user per track
skillTrackProgressSchema.index({ userId: 1, trackId: 1 }, { unique: true });

export const SkillTrackProgress = mongoose.model('SkillTrackProgress', skillTrackProgressSchema);
