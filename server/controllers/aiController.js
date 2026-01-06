import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { getTextExtractor } from 'office-text-extractor';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Use the Node.js ESM export from pdf-parse
import { PDFParse } from 'pdf-parse';

const extractor = getTextExtractor();
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const standardFontDataUrl = path.join(__dirname, '../../node_modules/pdfjs-dist/standard_fonts/');

// Initialize Gemini API with new @google/generative-ai SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');

export const generateQuiz = async (req, res) => {
    try {
        let { material, difficulty = 'Medium', questionCount = 10, questionType = 'Multiple Choice', styleExamples = '' } = req.body;
        console.log('Generate Quiz Request:', { difficulty, questionCount, questionType, hasFiles: !!req.files });
        
        // Handle File Uploads (Study Material & Style Guide)
        if (req.files) {
            const processFile = async (fileObj) => {
                const filePath = fileObj.path;
                let text = '';
                let parser = null;
                try {
                    console.log(`Processing file: ${fileObj.originalname} (${fileObj.mimetype})`);
                    if (fileObj.mimetype === 'application/pdf') {
                        const dataBuffer = fs.readFileSync(filePath);
                        parser = new PDFParse({ data: dataBuffer });
                        const result = await parser.getText();
                        text = result.text || '';
                        await parser.destroy(); // Clean up resources
                    } else if (fileObj.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
                         text = await extractor.extractText({ input: filePath, type: 'file' });
                    } else {
                        text = fs.readFileSync(filePath, 'utf8');
                    }
                } catch (fileError) {
                    console.error(`Error processing file ${fileObj.originalname}:`, fileError);
                    throw new Error(`Failed to process file ${fileObj.originalname}: ${fileError.message}`);
                } finally {
                     // Always cleanup
                     if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                        } catch (e) { console.error('Failed to delete temp file:', filePath); }
                     }
                }
                return text;
            };

            console.log('Processing files...');

            if (req.files.file && req.files.file[0]) {
                try {
                    const fileText = await processFile(req.files.file[0]);
                    if (fileText) material = (material || '') + '\n\n' + fileText;
                    console.log('File text extracted, length:', fileText?.length);
                } catch (e) {
                    return res.status(400).json({ success: false, message: e.message });
                }
            }

            if (req.files.styleFile && req.files.styleFile[0]) {
                try {
                    const styleText = await processFile(req.files.styleFile[0]);
                    if (styleText) styleExamples = (styleExamples || '') + '\n\n' + styleText;
                    console.log('Style text extracted');
                } catch (e) {
                     console.warn('Style file failed to process, ignoring:', e.message);
                }
            }
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error('Missing GEMINI_API_KEY in environment variables');
            return res.status(500).json({ 
                success: false, 
                message: 'Server configuration error: AI API Key missing.' 
            });
        }

        // Final validation: Ensure we have some text to process
        if (!material || !material.trim()) {
            return res.status(400).json({ success: false, message: "No content found. Please provide text or a valid readable file (PDF/PPTX)." });
        }

        const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });
        console.log('Model initialized, sending prompt with material length:', material.length);

        // Construct Prompt
        let prompt = `You are a strict and precise exam creator. 
        Your task is to generate a quiz based strictly on the provided study material.
        
        **Configuration:**
        - Number of Questions: ${questionCount || 5}
        - Difficulty Level: ${difficulty || 'Medium'}
        - Question Types: ${questionType || 'Multiple Choice'}
        
        **Input Material:**
        """
        ${material.substring(0, 30000)} 
        """
        
        ${styleExamples ? `**Style Guide / Examples:**\n"""\n${styleExamples}\n"""\nMake sure the generated questions follow this style.` : ''}

        **Output Requirements:**
        1. Return ONLY a valid JSON array. No markdown, no explanations, no prologue.
        2. The JSON must be an ARRAY of question objects.
        3. Each object MUST strictly follow this schema:
        {
            "question": "The question text here",
            "options": ["Option A", "Option B", "Option C", "Option D"], 
            "correctAnswer": 0, // Index of the correct option (0-based)
            "explanation": "Brief explanation of why this answer is correct",
            "type": "multiple-choice" // or "true-false"
        }
        
        **Important Rules:**
        - For "Multiple Choice", provide 4 distinct options.
        - For "True/False", provided options ["True", "False"] and set correctAnswer to 0 or 1.
        - Ensure "correctAnswer" is a valid index for the "options" array.
        - The questions should test understanding, not just recall.
        `;

        const result = await geminiModel.generateContent(prompt);
        console.log('Content generated, getting response...');
        const response = await result.response;
        let text = response.text();

        // Cleaning the output to ensure valid JSON
        // Sometimes models wrap responses in ```json ... ```
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let parsedQuestions;
        try {
            parsedQuestions = JSON.parse(text);
        } catch (parseError) {
            console.error('AI JSON Parse Error. Raw Text:', text);
            return res.status(500).json({ 
                success: false, 
                message: 'AI generated invalid data format. Please try again.',
                rawResponse: text
            });
        }

        if (!Array.isArray(parsedQuestions)) {
             return res.status(500).json({ 
                success: false, 
                message: 'AI did not return a list of questions.',
                rawResponse: text
            });
        }

        // Map to internal Schema
        const questions = parsedQuestions.map((q, index) => ({
            id: index + 1, // Temporary sequential ID
            part: "Generated Section",
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "Generated by AI",
            type: q.type === 'true-false' ? 'multiple-choice' : (q.type || 'multiple-choice'), // Normalize types if needed, our DB supports 'multiple-choice' mainly for this context
            points: 1
        }));

        // Handle True/False specifically if the model returned them as separate type but we want to store as MCQ with True/False options
        // The prompt asks for options ["True", "False"], so it works as MCQ.

        res.json({
            success: true,
            data: questions
        });

    } catch (error) {
        console.error('AI Controller Error - Detailed:', error);
        console.error('Error Stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate quiz.', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
