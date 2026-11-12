import mongoose from 'mongoose';

const tournamentParticipantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, default: 'User' },
  userEmail: { type: String, default: '' },
  userAvatar: { type: mongoose.Schema.Types.Mixed, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  attemptId: { type: String },
  score: { type: Number },
  percentage: { type: Number },
  timeTaken: { type: Number },
  submittedAt: { type: Date }
}, { _id: false });

const tournamentSchema = new mongoose.Schema({
  tournamentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  durationMinutes: { type: Number, default: 0 }, // 0 = flexible/open for the entire window
  status: { type: String, enum: ['scheduled', 'live', 'completed'], default: 'scheduled' },
  
  // Dual Quiz Configuration: either assign existing quiz(zes) or build a dedicated custom quiz
  quizMode: { type: String, enum: ['assigned', 'custom'], default: 'assigned' },
  quizIds: [{ type: String }],
  customQuiz: {
    title: { type: String },
    description: { type: String },
    timeLimit: { type: Number, default: 30 },
    passingScore: { type: Number, default: 70 },
    questions: [mongoose.Schema.Types.Mixed]
  },
  
  // Access and Join Approval
  requiresApproval: { type: Boolean, default: true },
  participants: [tournamentParticipantSchema],
  
  // Results Gating: students wait until admin reveals results
  resultsRevealed: { type: Boolean, default: false },
  revealedAt: { type: Date },
  
  // Rewards & Gamification
  rewardBadgeId: { type: String },
  rewardItemId: { type: String },
  rewardCoins: { type: Number, default: 1000 },
  rewardXp: { type: Number, default: 500 },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

tournamentSchema.index({ startsAt: 1, endsAt: 1 });
tournamentSchema.index({ 'participants.userId': 1 });

export const Tournament = mongoose.model('Tournament', tournamentSchema);
