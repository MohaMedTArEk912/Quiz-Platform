import StudyCard from '../models/StudyCard.js';

// Simple UUID generator to avoid dependency issues or Node version constraints
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const getAllCards = async (req, res) => {
    try {
        const query = {};
        if (req.query.subjectId) {
            query.subjectId = req.query.subjectId;
        }
        const cards = await StudyCard.find(query);
        res.json(cards);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createCard = async (req, res) => {
    try {
        const newCard = new StudyCard({
            ...req.body,
            id: generateUUID(),
            createdBy: req.user ? req.user.userId : 'admin', // Middleware should provide user
            createdAt: new Date()
        });
        const savedCard = await newCard.save();
        res.status(201).json(savedCard);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updateCard = async (req, res) => {
    try {
        const updatedCard = await StudyCard.findOneAndUpdate(
            { id: req.params.id },
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        if (!updatedCard) return res.status(404).json({ message: 'Card not found' });
        res.json(updatedCard);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteCard = async (req, res) => {
    try {
        const deleted = await StudyCard.findOneAndDelete({ id: req.params.id });
        if (!deleted) return res.status(404).json({ message: 'Card not found' });
        res.json({ message: 'Card deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteStack = async (req, res) => {
    try {
        const { category } = req.params;
        await StudyCard.deleteMany({ category });
        res.json({ message: `Stack ${category} deleted` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateStack = async (req, res) => {
    try {
        const { oldCategory, newCategory } = req.body;
        await StudyCard.updateMany(
            { category: oldCategory },
            { $set: { category: newCategory } }
        );
        res.json({ message: `Stack renamed to ${newCategory}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
