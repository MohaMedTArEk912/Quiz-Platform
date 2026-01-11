import { Quiz } from '../models/Quiz.js';

/**
 * Sanitize and validate quiz questions
 * @param {Array} questions - Array of question objects
 * @param {string} quizId - Quiz ID for logging purposes
 * @returns {Array} Sanitized questions array
 */
const sanitizeQuestions = (questions, quizId = 'unknown') => {
  if (!questions || !Array.isArray(questions)) {
    return questions;
  }

  return questions.map((question, index) => {
    // Sanitize question text (preserve line breaks, remove excessive whitespace)
    if (question.question) {
      question.question = question.question
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .trim();
    }

    // Validate image URL if provided
    if (question.imageUrl) {
      const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i;
      const isValidUrl = urlPattern.test(question.imageUrl) || 
                       /^https?:\/\/.+/.test(question.imageUrl); // Allow any URL format
      
      if (!isValidUrl) {
        console.warn(`⚠️ Invalid image URL for question ${index + 1} in quiz ${quizId}: ${question.imageUrl}`);
        delete question.imageUrl; // Remove invalid URL
      } else {
        question.imageUrl = question.imageUrl.trim();
      }
    }

    // Ensure required fields
    if (!question.id) question.id = index + 1;
    if (!question.part) question.part = 'A';
    if (!question.points) question.points = 10;

    return question;
  });
};

export const getQuizzes = async (req, res) => {
  try {
    console.log('📚 Fetching quizzes...');
    const quizzes = await Quiz.find({}).lean();
    console.log(`✅ Found ${quizzes.length} quizzes`);
    
    const normalized = quizzes.map((quiz) => ({
      ...quiz,
      id: quiz.id || quiz._id?.toString()
    }));
    
    res.json(normalized);
  } catch (error) {
    console.error('❌ Error fetching quizzes:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const createQuiz = async (req, res) => {
  try {
    const quizData = req.body;
    
    // Check for duplicate ID
    const existing = await Quiz.findOne({ id: quizData.id });
    if (existing) {
      return res.status(400).json({ message: 'Quiz ID already exists' });
    }

    // Validate and sanitize questions
    if (quizData.questions && Array.isArray(quizData.questions)) {
      quizData.questions = sanitizeQuestions(quizData.questions, quizData.id);
    }

    const newQuiz = new Quiz(quizData);
    await newQuiz.save();
    
    console.log(`✅ Quiz created: ${newQuiz.title} (${newQuiz.id})`);
    res.status(201).json(newQuiz);
  } catch (error) {
    console.error('❌ Error creating quiz:', error);
    res.status(500).json({ message: 'Error creating quiz', error: error.message });
  }
};

export const importQuizzes = async (req, res) => {
  try {
    let quizzes = req.body;
    
    // Support single quiz import by wrapping in array
    if (!Array.isArray(quizzes)) {
      if (typeof quizzes === 'object' && quizzes !== null && quizzes.id) {
        quizzes = [quizzes];
      } else {
        return res.status(400).json({ message: 'Expected an array of quizzes or a valid quiz object' });
      }
    }

    const results = [];
    const errors = [];
    
    for (const quiz of quizzes) {
      if (!quiz.id || !quiz.title) {
         errors.push(`Skipped invalid quiz: ${JSON.stringify(quiz).substring(0, 50)}...`);
         continue;
      }
      
      // Validate and sanitize questions before import
      if (quiz.questions && Array.isArray(quiz.questions)) {
        quiz.questions = sanitizeQuestions(quiz.questions, quiz.id);
      }
      
      try {
        const updated = await Quiz.findOneAndUpdate(
          { id: quiz.id },
          quiz,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        results.push(updated);
        console.log(`✅ Imported/Updated quiz: ${quiz.title} (${quiz.id})`);
      } catch (err) {
        errors.push(`Error importing quiz ${quiz.id}: ${err.message}`);
      }
    }
    
    if (results.length === 0 && errors.length > 0) {
        return res.status(400).json({ message: 'Failed to import quizzes', errors });
    }
    
    res.json({ 
        message: `Imported ${results.length} quizzes successfully`, 
        count: results.length,
        errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('❌ Error importing quizzes:', error);
    res.status(500).json({ message: 'Error importing quizzes', error: error.message });
  }
};

export const updateQuiz = async (req, res) => {
  try {
    let { id } = req.params;
    if (!id && req.params && typeof req.params[0] === 'string') {
      id = decodeURIComponent(req.params[0].replace(/^\/+/, ''));
    }
    if (!id) {
      return res.status(400).json({ message: 'Invalid quiz id' });
    }
    
    const updates = req.body;
    
    // Validate and sanitize questions if they're being updated
    if (updates.questions && Array.isArray(updates.questions)) {
      updates.questions = sanitizeQuestions(updates.questions, id);
    }
    
    const updatedQuiz = await Quiz.findOneAndUpdate({ id: id }, updates, { new: true });
    
    if (!updatedQuiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    console.log(`✅ Quiz updated: ${updatedQuiz.title} (${updatedQuiz.id})`);
    res.json(updatedQuiz);
  } catch (error) {
    console.error('❌ Error updating quiz:', error);
    res.status(500).json({ message: 'Error updating quiz', error: error.message });
  }
};

export const deleteQuiz = async (req, res) => {
  try {
    let { id } = req.params;
    if (!id && req.params && typeof req.params[0] === 'string') {
      id = decodeURIComponent(req.params[0].replace(/^\/+/, ''));
    }
    if (!id) {
      return res.status(400).json({ message: 'Invalid quiz id' });
    }
    const deletedQuiz = await Quiz.findOneAndDelete({ id: id });
    
    if (!deletedQuiz) {
        return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting quiz', error: error.message });
  }
};
