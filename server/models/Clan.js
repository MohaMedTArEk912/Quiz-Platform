import mongoose from 'mongoose';

const clanSchema = new mongoose.Schema({
  clanId: { type: String, required: true, unique: true, default: () => crypto.randomUUID() },
  name: { type: String, required: true, unique: true },
  tag: { type: String, required: true, uppercase: true, minlength: 2, maxlength: 5 },
  description: { type: String, default: '' },
  leaderId: { type: String, required: true }, // userId
  
  // Stats
  totalXP: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  isPublic: { type: Boolean, default: true },
  
  // Membership
  members: [{
    userId: { type: String, required: true },
    role: { type: String, enum: ['leader', 'elder', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    contribution: { type: Number, default: 0 } // XP contributed
  }],
  
  activeJoinRequests: [{
    userId: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],

  settings: {
    minLevel: { type: Number, default: 1 },
    autoAccept: { type: Boolean, default: true }
  },

  createdAt: { type: Date, default: Date.now }
});

clanSchema.index({ totalXP: -1 });

export const Clan = mongoose.model('Clan', clanSchema);
