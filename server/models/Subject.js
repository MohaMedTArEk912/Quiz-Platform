import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  
  // The content extracted from the main source (Slides)
  content: { type: String, required: true }, 
  
  // Raw text content from old exams to be used as "style guide" or "doctor's thinking"
  styleContext: { type: String },

  // Questions extracted from old exams
  // These are stored so they can be reused "as is"
  oldQuestions: [{
    question: { type: String, required: true },
    options: { type: [String], default: [] },
    correctAnswer: { type: Number }, // Index
    explanation: { type: String },
    type: { type: String, default: 'multiple-choice' },
    chapter: { type: String } // Track which chapter/topic this question belongs to
  }],

  // Track source files for management
  sourceFiles: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['content', 'exam'], required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now }
});

export const Subject = mongoose.model('Subject', subjectSchema);
