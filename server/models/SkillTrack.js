import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  moduleId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  quizId: { type: String }, // optional quiz association
  badgeId: { type: String } // Links to a Badge reward association
}, { _id: false });

const skillTrackSchema = new mongoose.Schema({
  trackId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'General' },
  modules: [moduleSchema],
  createdAt: { type: Date, default: Date.now }
});

export const SkillTrack = mongoose.model('SkillTrack', skillTrackSchema);
