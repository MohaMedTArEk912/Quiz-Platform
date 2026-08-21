import { Quiz } from '../models/Quiz.js';
import { QuestionPoolProgress } from '../models/QuestionPoolProgress.js';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

const loadStaticQuizzes = async () => {
  const quizzesDir = path.join(process.cwd(), 'public', 'quizzes');

  try {
    const entries = await readdir(quizzesDir, { withFileTypes: true });
    const jsonFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'));

    const quizzes = [];
    for (const entry of jsonFiles) {
      try {
        const filePath = path.join(quizzesDir, entry.name);
        const contents = await readFile(filePath, 'utf8');
        const parsed = JSON.parse(contents);

        if (Array.isArray(parsed)) {
          quizzes.push(...parsed);
        } else if (parsed && typeof parsed === 'object') {
          quizzes.push(parsed);
        }
      } catch (fileError) {
        console.warn(`⚠️ Failed to load fallback quiz file ${entry.name}:`, fileError.message);
      }
    }

    return quizzes;
  } catch (error) {
    console.warn('⚠️ Static quiz fallback is unavailable:', error.message);
    return [];
  }
};

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

  return questions.map((rawQuestion, index) => {
    const question = (rawQuestion && typeof rawQuestion === 'object') ? rawQuestion : {};

    // Sanitize question text (preserve line breaks, remove excessive whitespace)
    if (typeof question.question === 'string') {
      question.question = question.question
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .trim();
    } else if (question.question !== undefined && question.question !== null) {
      question.question = String(question.question).trim();
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
    if (!Number.isFinite(question.id)) question.id = index + 1;
    if (!question.part || typeof question.part !== 'string') question.part = 'A';
    if (!Number.isFinite(question.points)) question.points = 10;

    // Normalize options to strings when present
    if (question.options && Array.isArray(question.options)) {
      question.options = question.options.map(opt => (typeof opt === 'string' ? opt : String(opt)));
    }

    // Auto-detect non-shuffleable patterns
    if (question.options && Array.isArray(question.options) && question.shuffleOptions !== false) {
      const nonShufflePatterns = [
        /both.*(and|&)/i,
        /all of the above/i,
        /none of the above/i,
        /neither.*nor/i,
        /options?.*(and|&)/i,
        /choices?.*(and|&)/i,
        /^[a-z]\s*(and|&)\s*[a-z]$/i
      ];

      const hasNonShufflePattern = question.options.some(opt => 
        typeof opt === 'string' && nonShufflePatterns.some(p => p.test(opt))
      );

      if (hasNonShufflePattern) {
        question.shuffleOptions = false;
      }
    }

    return question;
  });
};

export const getQuizzes = async (req, res) => {
  try {
    // Fetch all quizzes including questions to show accurate question counts
    let quizzes = await Quiz.find({}).lean();

    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      const fallbackQuizzes = await loadStaticQuizzes();
      if (fallbackQuizzes.length > 0) {
        quizzes = fallbackQuizzes;
      }
    }
    
    // Sort quizzes by extracted number for proper "Session 1, Session 2, ... Session 10" ordering
    quizzes.sort((a, b) => {
        const getNum = (str) => {
            if (!str || typeof str !== 'string') return Number.MAX_SAFE_INTEGER;
            const match = str.match(/(\d+)/);
            return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
        };
        
        const titleA = a.title || '';
        const titleB = b.title || '';
        
        const numA = getNum(titleA);
        const numB = getNum(titleB);
        
        if (numA !== numB) {
             return numA - numB;
        }
        return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const normalized = quizzes.map((quiz) => ({
      ...quiz,
      questions: Array.isArray(quiz.questions) ? quiz.questions : [],
      id: quiz.id || quiz._id?.toString()
    }));
    
    res.json(normalized);
  } catch (error) {
    console.error('❌ Error fetching quizzes:', error);
    try {
      const fallbackQuizzes = await loadStaticQuizzes();
      if (fallbackQuizzes.length > 0) {
        const normalizedFallback = fallbackQuizzes.map((quiz) => ({
          ...quiz,
          questions: Array.isArray(quiz.questions) ? quiz.questions : [],
          id: quiz.id || quiz._id?.toString()
        }));
        return res.json(normalizedFallback);
      }
    } catch (fallbackError) {
      console.error('❌ Fallback quiz load failed:', fallbackError);
    }

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
      
      try {
        // Validate and sanitize questions before import
        if (quiz.questions && Array.isArray(quiz.questions)) {
          quiz.questions = sanitizeQuestions(quiz.questions, quiz.id);
        }

        // Remove _id to avoid CastError if it's not a valid ObjectId
        if (quiz._id) {
          delete quiz._id;
        }

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
    
    const updatedQuiz = await Quiz.findOneAndUpdate({ id: id }, updates, { new: true, runValidators: true });
    
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

/**
 * Get a tailored quiz session for taking a quiz.
 * If the quiz is a Question Pool / Bank, returns a non-repeating subset of questions
 * chosen from the questions the user hasn't seen yet in their current cycle.
 */
export const getQuizSession = async (req, res) => {
  try {
    let { id } = req.params;
    if (!id && req.params && typeof req.params[0] === 'string') {
      id = decodeURIComponent(req.params[0].replace(/^\/+/, ''));
    }
    const userId = req.query.userId || req.headers['x-user-id'] || req.user?.userId;

    let quiz = await Quiz.findOne({ id }).lean();
    if (!quiz) {
      quiz = await Quiz.findById(id).lean().catch(() => null);
    }

    if (!quiz) {
      // Check fallback static quizzes
      const fallbackQuizzes = await loadStaticQuizzes();
      quiz = fallbackQuizzes.find(q => q.id === id || q._id === id);
    }

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const isPool = Boolean(
      quiz.isQuestionPool ||
      quiz.quizType === 'pool' ||
      (quiz.questionsPerAttempt && quiz.questionsPerAttempt < (quiz.questions?.length || 0))
    );

    if (!isPool || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return res.json({
        quiz: {
          ...quiz,
          id: quiz.id || quiz._id?.toString(),
          questions: Array.isArray(quiz.questions) ? quiz.questions : []
        },
        isQuestionPool: false,
        totalPoolQuestions: quiz.questions?.length || 0,
        questionsInAttempt: quiz.questions?.length || 0
      });
    }

    const totalPoolSize = quiz.questions.length;
    const batchSize = Math.max(1, Math.min(quiz.questionsPerAttempt || 10, totalPoolSize));

    // If no userId (guest mode), return a random batch
    if (!userId) {
      const shuffled = [...quiz.questions].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, batchSize);
      return res.json({
        quiz: {
          ...quiz,
          id: quiz.id || quiz._id?.toString(),
          questions: selected
        },
        isQuestionPool: true,
        totalPoolQuestions: totalPoolSize,
        seenCount: 0,
        remainingCount: totalPoolSize,
        questionsInAttempt: selected.length,
        completedCycles: 0,
        poolCompletionPercentage: 0
      });
    }

    // Authenticated user: track seen questions
    const quizIdentifiers = [quiz.id, quiz._id?.toString(), id].filter(Boolean);
    let progress = await QuestionPoolProgress.findOne({ userId, quizId: { $in: quizIdentifiers } });
    if (!progress) {
      progress = new QuestionPoolProgress({
        userId,
        quizId: quiz.id || quiz._id?.toString() || id,
        seenQuestionIds: [],
        completedCycles: 0
      });
      await progress.save();
    }

    const seenSet = new Set((progress.seenQuestionIds || []).map(qId => String(qId)));

    // Filter questions not seen in the current cycle
    let unseenQuestions = quiz.questions.filter((q, idx) => {
      const qKey = q.id !== undefined && q.id !== null ? String(q.id) : String(idx);
      return !seenSet.has(qKey);
    });

    let completedCycleNow = false;

    // If all questions have been seen (100% pool reached), reset for next cycle
    if (unseenQuestions.length === 0) {
      progress.completedCycles = (progress.completedCycles || 0) + 1;
      progress.seenQuestionIds = [];
      await progress.save();
      seenSet.clear();
      unseenQuestions = [...quiz.questions];
      completedCycleNow = true;
    }

    // Shuffle unseen questions to select a random batch
    const shuffledUnseen = [...unseenQuestions].sort(() => 0.5 - Math.random());
    // If unseenQuestions has fewer items than batchSize (e.g. last 5 questions), serve all remaining
    const selectedQuestions = shuffledUnseen.slice(0, batchSize);

    res.json({
      quiz: {
        ...quiz,
        id: quiz.id || quiz._id?.toString(),
        questions: selectedQuestions
      },
      isQuestionPool: true,
      totalPoolQuestions: totalPoolSize,
      seenCount: seenSet.size,
      remainingCount: unseenQuestions.length,
      questionsInAttempt: selectedQuestions.length,
      completedCycles: progress.completedCycles || 0,
      poolCompletionPercentage: totalPoolSize > 0 ? Math.round((seenSet.size / totalPoolSize) * 100) : 0,
      justResetCycle: completedCycleNow
    });
  } catch (error) {
    console.error('❌ Error getting quiz session:', error);
    res.status(500).json({ message: 'Error getting quiz session', error: error.message });
  }
};

/**
 * Get question pool progress for a user on a specific quiz
 */
export const getPoolProgress = async (req, res) => {
  try {
    let { id } = req.params;
    if (!id && req.params && typeof req.params[0] === 'string') {
      id = decodeURIComponent(req.params[0].replace(/^\/+/, ''));
    }
    const userId = req.query.userId || req.headers['x-user-id'] || req.user?.userId;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    let quiz = await Quiz.findOne({ id }).lean();
    if (!quiz) {
      quiz = await Quiz.findById(id).lean().catch(() => null);
    }
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const quizIdentifiers = [quiz.id, quiz._id?.toString(), id].filter(Boolean);
    const progress = await QuestionPoolProgress.findOne({ userId, quizId: { $in: quizIdentifiers } }).lean();
    const totalPoolQuestions = quiz.questions?.length || 0;
    const seenCount = progress ? (progress.seenQuestionIds?.length || 0) : 0;
    const remainingCount = Math.max(0, totalPoolQuestions - seenCount);
    const completedCycles = progress ? (progress.completedCycles || 0) : 0;
    const percentage = totalPoolQuestions > 0 ? Math.round((seenCount / totalPoolQuestions) * 100) : 0;

    res.json({
      quizId: quiz.id,
      totalPoolQuestions,
      seenCount,
      remainingCount,
      completedCycles,
      percentage
    });
  } catch (error) {
    console.error('❌ Error getting pool progress:', error);
    res.status(500).json({ message: 'Error getting pool progress', error: error.message });
  }
};

/**
 * Manually reset a user's question pool progress for a quiz
 */
export const resetPoolProgress = async (req, res) => {
  try {
    let { id } = req.params;
    if (!id && req.params && typeof req.params[0] === 'string') {
      id = decodeURIComponent(req.params[0].replace(/^\/+/, ''));
    }
    const userId = req.body?.userId || req.query?.userId || req.headers['x-user-id'] || req.user?.userId;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    let quiz = await Quiz.findOne({ id }).lean();
    if (!quiz) {
      quiz = await Quiz.findById(id).lean().catch(() => null);
    }
    const targetQuizId = quiz ? quiz.id : id;

    await QuestionPoolProgress.findOneAndUpdate(
      { userId, quizId: targetQuizId },
      { seenQuestionIds: [] },
      { upsert: true }
    );

    res.json({ message: 'Question pool progress reset successfully', quizId: targetQuizId });
  } catch (error) {
    console.error('❌ Error resetting pool progress:', error);
    res.status(500).json({ message: 'Error resetting pool progress', error: error.message });
  }
};
