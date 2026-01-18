import mongoose from 'mongoose';

const studyCardSchema = new mongoose.Schema({
    id: { type: String, unique: true }, // For frontend finding
    title: { type: String, required: true },
    content: { type: String, required: true }, // Markdown content
    category: { type: String, default: 'General' },
    language: { type: String, default: 'General' }, // Add language support
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    tags: [String],
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('StudyCard', studyCardSchema);
