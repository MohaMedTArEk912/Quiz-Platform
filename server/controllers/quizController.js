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
    const quizzes = req.body; // Expecting array of quizzes
    if (!Array.isArray(quizzes)) {
      return res.status(400).json({ message: 'Expected an array of quizzes' });
    }

    const results = [];
    for (const quiz of quizzes) {
      const updated = await Quiz.findOneAndUpdate(
        { id: quiz.id },
        quiz,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push(updated);
    }
    
    res.json({ message: `Imported ${results.length} quizzes successfully`, count: results.length });
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
