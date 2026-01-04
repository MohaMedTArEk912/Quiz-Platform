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
  }
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
  isTournamentOnly: { type: Boolean, default: false },
  linkedTrackId: { type: String }, // Links this quiz to a specific skill track
  linkedModuleId: { type: String }, // Links this quiz to a specific module within that track
  questions: [questionSchema]
});

export const Quiz = mongoose.model('Quiz', quizSchema);
