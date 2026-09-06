import mongoose from 'mongoose';

const trackRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  subjectId: { type: String, required: true, index: true },
  subjectTitle: { type: String, required: true },
  reason: { type: String, default: '' },
  adminNote: { type: String, default: '' },
  reRequestNote: { type: String, default: '' },
  reRequestCount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  requestedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: String }
}, {
  timestamps: true
});

// Compound index for checking duplicate pending requests quickly
trackRequestSchema.index({ userId: 1, subjectId: 1, status: 1 });

export const TrackRequest = mongoose.model('TrackRequest', trackRequestSchema);
