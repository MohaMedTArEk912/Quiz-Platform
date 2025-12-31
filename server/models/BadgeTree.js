import mongoose from 'mongoose';

const badgeTreeSchema = new mongoose.Schema({
  treeId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['basic', 'track'], 
    required: true,
    index: true
  },
  trackId: { type: String, index: true }, // Only for track-based trees
  icon: { type: String, default: '🌳' },
  isActive: { type: Boolean, default: true, index: true },
  
  // Badge nodes in this tree
  nodes: [{
    badgeId: { type: String, required: true },
    position: {
      x: { type: Number, default: 0 }, // For visual positioning in tree UI
      y: { type: Number, default: 0 },
      tier: { type: Number, default: 0 } // Vertical tier (0 = root, 1 = first level, etc.)
    },
    prerequisites: [{ type: String }], // Array of badgeIds that must be earned first
    isRoot: { type: Boolean, default: false },
    isSpecial: { type: Boolean, default: false }, // For exam/tournament badges
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
badgeTreeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient queries
badgeTreeSchema.index({ type: 1, isActive: 1 });
badgeTreeSchema.index({ trackId: 1 });

export const BadgeTree = mongoose.model('BadgeTree', badgeTreeSchema);
