import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], default: [] },
  correctAnswer: { type: Number }, // Index
  explanation: { type: String },
  type: { type: String, default: 'multiple-choice' },
  points: { type: Number, default: 1 }
});

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['lesson', 'exam_raw', 'exam_processed'], required: true },
  rawContent: { type: String }, // The full extracted text
  isProcessed: { type: Boolean, default: false },
  
  // For Exams: Specific extracted questions from this file
  extractedQuestions: [questionSchema], 
  
  // For Lessons: AI generated summary or key points
  summary: { type: String },
  
  originalFileName: { type: String },
  uploadedAt: { type: Date, default: Date.now }
});

const subjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  
  // --- NEW GRANULAR CONTENT MODEL ---
  materials: [materialSchema],

  // --- DEPRECATED / LEGACY FIELDS ---
  // The content extracted from the main source (Slides)
  content: { type: String }, 
  
  // Raw text content from old exams
  styleContext: { type: String },

  // Legacy pool of questions (Global for the subject)
  oldQuestions: [{
    question: { type: String, required: true },
    options: { type: [String], default: [] },
    correctAnswer: { type: Number }, // Index
    explanation: { type: String },
    type: { type: String, default: 'multiple-choice' },
    chapter: { type: String } 
  }],

  // Track source files for management (Legacy)
  sourceFiles: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['content', 'exam'], required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now }
});

export const Subject = mongoose.model('Subject', subjectSchema);
