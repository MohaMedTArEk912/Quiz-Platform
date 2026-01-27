
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Fix ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from root
dotenv.config({ path: join(__dirname, '../.env') });

const questionSchema = new mongoose.Schema({
    questionId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    referenceCode: { type: String }, // Hidden from user
    starterCode: { type: String },
    language: { type: String, default: 'javascript' },
    testCases: [{
        input: String,
        expectedOutput: String,
        isHidden: { type: Boolean, default: false }
    }],
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    points: { type: Number, default: 100 },
    category: { type: String, default: 'algorithms' },
    tags: [String],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const CompilerQuestion = mongoose.models.CompilerQuestion || mongoose.model('CompilerQuestion', questionSchema);

const sampleQuestions = [
    {
        questionId: 'hello-world',
        title: 'Hello World',
        description: 'Write a function `greet` that returns the string "Hello, World!".',
        language: 'javascript',
        difficulty: 'easy',
        points: 50,
        category: 'basics',
        starterCode: 
`function greet() {
    // Write your code here
    
}`,
        referenceCode:
`function greet() {
    return "Hello, World!";
}`,
        testCases: [
            { input: 'greet()', expectedOutput: '"Hello, World!"', isHidden: false }
        ]
    },
    {
        questionId: 'sum-two-numbers',
        title: 'Sum of Two Numbers',
        description: 'Write a function `sum` that takes two numbers `a` and `b` and returns their sum.',
        language: 'javascript',
        difficulty: 'easy',
        points: 50,
        category: 'math',
        starterCode:
`function sum(a, b) {
    // Write your code here
    
}`,
        referenceCode:
`function sum(a, b) {
    return a + b;
}`,
        testCases: [
            { input: 'sum(1, 2)', expectedOutput: '3', isHidden: false },
            { input: 'sum(-5, 5)', expectedOutput: '0', isHidden: false },
            { input: 'sum(10, 20)', expectedOutput: '30', isHidden: true }
        ]
    },
    {
        questionId: 'is-palindrome',
        title: 'Check Palindrome',
        description: 'Write a function `isPalindrome` that checks if a given string is a palindrome (reads the same forwards and backwards). Return `true` or `false`. Case insensitive.',
        language: 'javascript',
        difficulty: 'medium',
        points: 100,
        category: 'strings',
        starterCode:
`function isPalindrome(str) {
    // Write your code here
    
}`,
        referenceCode:
`function isPalindrome(str) {
    const cleanStr = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanStr === cleanStr.split('').reverse().join('');
}`,
        testCases: [
            { input: 'isPalindrome("racecar")', expectedOutput: 'true', isHidden: false },
            { input: 'isPalindrome("hello")', expectedOutput: 'false', isHidden: false },
            { input: 'isPalindrome("A man, a plan, a canal: Panama")', expectedOutput: 'true', isHidden: true }
        ]
    }
];

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        for (const q of sampleQuestions) {
            const exists = await CompilerQuestion.findOne({ questionId: q.questionId });
            if (!exists) {
                await CompilerQuestion.create(q);
                console.log(`Created question: ${q.title}`);
            } else {
                console.log(`Skipped existing: ${q.title}`);
            }
        }

        console.log('Seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
