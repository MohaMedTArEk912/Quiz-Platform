import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Initialize require for CommonJS modules
const require = createRequire(import.meta.url);

// PDF Parse will be lazy-loaded


// Lazy load extractor for other file types (PPTX)
let extractor = null;

const getExtractorInstance = async () => {
    if (!extractor) {
        try {
            const { getTextExtractor } = await import('office-text-extractor');
            extractor = getTextExtractor();
            console.log('Text extractor initialized successfully');
        } catch (error) {
            console.warn('Failed to initialize text extractor:', error.message);
            // Return a dummy extractor that throws explicitly when used
            return { 
                extractText: async () => { 
                    throw new Error(`Text extraction unavailable: ${error.message}`); 
                } 
            };
        }
    }
    return extractor;
};

dotenv.config();

// Initialize Gemini API
// Note: It's safe to instantiate even if key is missing, but calls will fail. Check in handler.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');

const ATTEMPT_MODELS = [
    "gemini-2.0-flash", 
    "gemini-2.0-flash-lite-preview-02-05", 
    "gemini-2.5-flash",
    "gemini-2.0-flash-exp"
];

async function generateContentWithFallback(prompt) {
    let lastError = null;
    for (const modelName of ATTEMPT_MODELS) {
        try {
            console.log(`Attempting generation with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent(prompt);
            console.log(`Success with model: ${modelName}`);
            return result;
        } catch (error) {
            console.warn(`Model ${modelName} failed: ${error.message.split('\n')[0]}`);
            if (error.message.includes('429')) {
                console.warn('Rate limit hit, switching to next model...');
            }
            lastError = error;
        }
    }
    throw lastError;
}

export const generateQuiz = async (req, res) => {
    try {
        let { material, difficulty = 'Medium', questionCount = 10, questionType = 'Multiple Choice', styleExamples = '' } = req.body;
        console.log('Generate Quiz Request:', { difficulty, questionCount, questionType, hasFiles: !!req.files });
        
        // Handle File Uploads (Study Material & Style Guide)
        if (req.files) {
            const processFile = async (fileObj) => {
                const filePath = fileObj.path;
                let text = '';
                const MAX_EXTRACTION_TIME = 30000; // 30 second timeout
                
                try {
                    console.log(`Processing file: ${fileObj.originalname} (${fileObj.mimetype})`);
                    
                    // Validate file exists and is readable
                    if (!fs.existsSync(filePath)) {
                        throw new Error('Uploaded file not found');
                    }
                    
                    const stats = fs.statSync(filePath);
                    if (stats.size === 0) {
                        throw new Error('Uploaded file is empty');
                    }
                    
                    // Process based on MIME type
                    if (fileObj.mimetype === 'application/pdf') {
                        // Read file buffer for pdf-parse
                        const dataBuffer = fs.readFileSync(filePath);
                        
                        // Use pdf-parse v2 API (Class-based) or v1 (Function-based)
                        let parser = null;
                        try {
                             // Lazy load pdf-parse
                            const pdfParseLib = require('pdf-parse');
                            const pdfParse = (typeof pdfParseLib === 'function') ? pdfParseLib : pdfParseLib.PDFParse;

                            // Extract Class from the required library
                            // In v2, it exports { PDFParse }
                            const PDFParseClass = pdfParse.PDFParse || pdfParse;
                           
                            // Check if it's a class (constructor) or function
                            if (typeof PDFParseClass === 'function' && /^class\s/.test(Function.prototype.toString.call(PDFParseClass))) {
                                // It is a class
                                parser = new PDFParseClass({ data: dataBuffer });
                                text = await Promise.race([
                                     (async () => {
                                        const result = await parser.getText();
                                        return result.text;
                                     })(),
                                     new Promise((_, reject) => 
                                        setTimeout(() => reject(new Error('PDF extraction timeout')), MAX_EXTRACTION_TIME)
                                     )
                                ]);
                            } else {
                                // It is likely the v1 function (returns promise with .text)
                                const data = await pdfParse(dataBuffer);
                                text = data.text;
                            }
                        } finally {
                            if (parser && typeof parser.destroy === 'function') {
                                try { await parser.destroy(); } catch (e) {
                                    console.warn('Failed to destroy PDF parser:', e.message);
                                }
                            }
                        }
                    } else if (fileObj.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
                        const extractor = await getExtractorInstance();
                        text = await Promise.race([
                            extractor.extractText({ input: filePath, type: 'file' }),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('PPTX extraction timeout')), MAX_EXTRACTION_TIME)
                            )
                        ]);
                    } else if (fileObj.mimetype === 'text/plain' || fileObj.mimetype === 'text/markdown') {
                        text = fs.readFileSync(filePath, 'utf8');
                    } else {
                        throw new Error(`Unsupported file type: ${fileObj.mimetype}`);
                    }
                    
                    if (!text || !text.trim()) {
                        throw new Error('No text extracted from file');
                    }
                    
                    console.log(`Successfully extracted ${text.length} characters from ${fileObj.originalname}`);
                } catch (fileError) {
                    console.error(`Error processing file ${fileObj.originalname}:`, fileError);
                    throw new Error(`Failed to process file ${fileObj.originalname}: ${fileError.message}`);
                } finally {
                    // Always cleanup
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                        } catch (e) { 
                            console.error('Failed to delete temp file:', filePath, e.message); 
                        }
                    }
                }
                return text;
            };

            console.log('Processing files...');

            if (req.files.file && req.files.file[0]) {
                try {
                    const fileText = await processFile(req.files.file[0]);
                    if (fileText && fileText.trim()) {
                        material = (material || '') + '\n\n' + fileText;
                        console.log('Study material extracted, length:', fileText.length);
                    }
                } catch (e) {
                    console.error('Main file processing failed:', e.message);
                    return res.status(400).json({ 
                        success: false, 
                        message: e.message,
                        errorType: 'FILE_PROCESSING_ERROR'
                    });
                }
            }

            if (req.files.styleFile && req.files.styleFile[0]) {
                try {
                    const styleText = await processFile(req.files.styleFile[0]);
                    if (styleText && styleText.trim()) {
                        styleExamples = (styleExamples || '') + '\n\n' + styleText;
                        console.log('Style guide extracted');
                    }
                } catch (e) {
                    console.warn('Style file processing failed, continuing without style guide:', e.message);
                    // Don't fail the request, just continue without style guide
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

        const result = await generateContentWithFallback(prompt);
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
