import mongoose from 'mongoose';

const tournamentSchema = new mongoose.Schema({
  tournamentId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  quizIds: [String],
  status: { type: String, enum: ['scheduled', 'live', 'completed'], default: 'scheduled' },
  participants: [{ type: String }], // userIds
  createdAt: { type: Date, default: Date.now }
});

tournamentSchema.index({ startsAt: 1 });

export const Tournament = mongoose.model('Tournament', tournamentSchema);
