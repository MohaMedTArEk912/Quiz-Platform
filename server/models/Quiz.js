import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  type: { type: String, enum: ['multiple-choice', 'text'], default: 'multiple-choice' },
  part: { type: String, required: true },
  question: { type: String, required: true },
  options: { type: [String], default: [] },
  correctAnswer: { type: Number }, // For text/block/compiler this might be unused or used differently
  explanation: { type: String, default: '' },
  points: { type: Number, default: 1 },
  imageUrl: { type: String },
  codeSnippet: { type: String },
  audioUrl: { type: String },

  // New features
  isBlock: { type: Boolean, default: false },
  blockConfig: {
    toolbox: { type: String }, // XML string defining the blocks available
    initialXml: { type: String }, // Starting workspace
    referenceXml: { type: String } // For auto-grading
  },
  isCompiler: { type: Boolean, default: false },
  compilerConfig: {
    language: { type: String, default: 'javascript' },
    allowedLanguages: { type: [String], default: ['javascript'] },
    initialCode: { type: String },
    referenceCode: { type: String }
  },
  shuffleOptions: { type: Boolean, default: true }
});

const quizSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Custom string ID (e.g., 'javascript-basics')
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  difficulty: { type: String, required: true },
  timeLimit: { type: Number, required: true }, // in minutes, 0 for unlimited
  passingScore: { type: Number, required: true }, // percentage
  coinsReward: { type: Number, default: 10 },
  xpReward: { type: Number, default: 50 },
  icon: { type: String, default: '📝' },
  quizType: { type: String, enum: ['quiz', 'exam', 'pool'], default: 'quiz' }, // Type: regular quiz, exam, or question pool
  isQuestionPool: { type: Boolean, default: false }, // If true, questions are served dynamically in non-repeating batches
  questionsPerAttempt: { type: Number, default: 10 }, // Number of questions served per attempt in pool mode
  shuffleQuestions: { type: Boolean, default: true },
  subjectId: { type: String }, // Link to standard Subject model
  isTournamentOnly: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: true }, // Hide from public browsing while keeping admin access
  linkedTrackId: { type: String }, // Links this quiz to a specific skill track
  linkedModuleId: { type: String }, // Links this quiz to a specific module within that track
  reviewMode: { type: Boolean, default: false }, // Enable immediate feedback after each answer
  isProctored: { type: Boolean, default: false }, // Strict exam proctoring mode
  requireFullscreen: { type: Boolean, default: false }, // Force fullscreen mode during quiz
  disableCopyPaste: { type: Boolean, default: false }, // Block clipboard & right click
  strictTabSwitchLimit: { type: Number, default: 0 }, // Max allowed tab switches before auto-submit (0 for unlimited)
  questions: [questionSchema]
});

// Performance indexes for frequent filtering and sorting
quizSchema.index({ id: 1 }, { unique: true });
quizSchema.index({ subjectId: 1 });
quizSchema.index({ category: 1, difficulty: 1 });
quizSchema.index({ quizType: 1 });
quizSchema.index({ isQuestionPool: 1 });
quizSchema.index({ linkedTrackId: 1 });
quizSchema.index({ isTournamentOnly: 1 });

export const Quiz = mongoose.model('Quiz', quizSchema);
