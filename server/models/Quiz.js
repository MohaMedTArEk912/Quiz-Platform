import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  type: { type: String, enum: ['multiple-choice', 'text'], default: 'multiple-choice' },
  part: { type: String, required: true },
  question: { type: String, required: true },
  options: { type: [String], default: [] },
  correctAnswer: { type: Number },
  explanation: { type: String, default: '' },
  points: { type: Number, default: 1 }
});

const quizSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Custom string ID (e.g., 'javascript-basics')
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  difficulty: { type: String, required: true },
  timeLimit: { type: Number, required: true }, // in minutes
  passingScore: { type: Number, required: true }, // percentage
  icon: { type: String, default: '📝' },
  questions: [questionSchema]
});

export const Quiz = mongoose.model('Quiz', quizSchema);
