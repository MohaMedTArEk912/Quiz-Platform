import mongoose from 'mongoose';

const studyCardSchema = new mongoose.Schema({
    id: { type: String, unique: true }, // For frontend finding
    title: { type: String, required: true },
    content: { type: String, required: true }, // Markdown content
    category: { type: String, default: 'General' },
    tags: [String],
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('StudyCard', studyCardSchema);
