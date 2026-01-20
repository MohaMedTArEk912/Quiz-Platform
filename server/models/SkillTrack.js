import mongoose from 'mongoose';

/**
 * SubModule Schema - Individual lessons within a module
 * Note: Fields are optional for backward compatibility
 */
const subModuleSchema = new mongoose.Schema({
  id: { type: String },
  title: { type: String, default: 'Untitled Lesson' },
  state: { type: String, enum: ['locked', 'available', 'completed'], default: 'locked' },
  xp: { type: Number, default: 0 },
  quizId: { type: String },
  videoUrl: { type: String }
}, { _id: false });

/**
 * Module Schema - Nodes in the roadmap graph
 */
const moduleSchema = new mongoose.Schema({
  moduleId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  level: { type: Number, default: 0 },
  // Support various node types - add more as needed
  type: { type: String, enum: ['core', 'optional', 'achievement', 'project', 'quiz', 'milestone'], default: 'core' },
  status: { type: String, enum: ['locked', 'available', 'in_progress', 'completed', 'skipped'], default: 'locked' },
  xpReward: { type: Number, default: 100 },
  coordinates: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  prerequisites: [{ type: String }],
  subModules: [subModuleSchema],
  quizIds: [{ type: String }],
  badgeId: { type: String }
}, { _id: false });

/**
 * SkillTrack Schema - The complete roadmap
 */
const skillTrackSchema = new mongoose.Schema({
  trackId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '🗺️' },
  category: { type: String, default: 'General' },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  modules: [moduleSchema]
}, {
  timestamps: true // Automatically manages createdAt and updatedAt
});

export const SkillTrack = mongoose.model('SkillTrack', skillTrackSchema);
