import { Quiz } from '../models/Quiz.js';

export const getQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({}).lean();
    const normalized = quizzes.map((quiz) => ({
      ...quiz,
      id: quiz.id || quiz._id?.toString()
    }));
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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

    const newQuiz = new Quiz(quizData);
    await newQuiz.save();
    res.status(201).json(newQuiz);
  } catch (error) {
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
        const updated = await Quiz.findOneAndUpdate(
          { id: quiz.id },
          quiz,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        results.push(updated);
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
    const updatedQuiz = await Quiz.findOneAndUpdate({ id: id }, updates, { new: true });
    
    if (!updatedQuiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    res.json(updatedQuiz);
  } catch (error) {
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
