import { Subject } from '../models/Subject.js';
import { extractTextFromFile } from '../utils/fileExtractor.js';
import Groq from 'groq-sdk';
import fs from 'fs';
import limiter, { scheduleNormal } from '../utils/aiLimiter.js';
import { chunkText } from '../utils/textProcessor.js';

// Lazy Groq client init to avoid crashing when key is missing
const getGroqClient = () => {
    const key = (process.env.GROQ_API_KEY || '').trim();
    if (!key) return null;
    try { return new Groq({ apiKey: key }); } catch (e) {
        console.warn('Failed to initialize Groq client:', e.message);
        return null;
    }
};


// PRODUCTION MODELS: Confirmed available for this API key
// Note: Try stable models first, then experimental as fallback
const getGroqModels = () => {
    const envModel = process.env.GROQ_MODEL;
    const defaults = [
        'llama-3.3-70b-versatile',
        'llama-3.1-70b-versatile',
        'llama-3.1-8b-instant'
    ];
    
    // If env var is set, prioritize it. Deduplicate using Set.
    const models = envModel ? [envModel, ...defaults] : defaults;
    return [...new Set(models)];
};

/**
 * PRODUCTION-GRADE AI GENERATION WITH RATE LIMITING
 */
async function generateContentWithFallback(prompt, jobId = `SubjectGen-${Date.now()}`) {
    return scheduleNormal(jobId, async () => {
            const groq = getGroqClient();
            if (!groq) throw new Error('GROQ_API_KEY missing. Set environment or switch provider.');
            
            let lastError = null;
            
            for (const modelName of getGroqModels()) {
                try {
                    console.log(`[Subject AI] Attempting generation with model: ${modelName}`);
                    
                    const completion = await groq.chat.completions.create({
                        messages: [{ role: 'user', content: prompt }],
                        model: modelName,
                        response_format: { type: 'json_object' },
                        temperature: 0.5,
                        max_tokens: 8000, 
                    });
                    const rawContent = completion.choices[0]?.message?.content;
                    if (!rawContent) throw new Error('Groq returned empty content');
                    return rawContent;
                } catch (error) {
                    const msg = (error?.message || String(error)).split('\n')[0];
                    console.warn(`[Subject AI][Groq] ❌ ${modelName} failed: ${msg}`);
                    lastError = error;
                    // Continued attempts...
                }
            }
            throw new Error(`All Groq models failed. Last error: ${lastError?.message || 'Unknown'}`);
    });
}

export const createSubject = async (req, res) => {
    const filesToDelete = [];
    try {
        const { title, description } = req.body;
        
        // Validation
        if (!title || title.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Title is required.' });
        }
        
        if (title.length > 200) {
            return res.status(400).json({ success: false, message: 'Title must be less than 200 characters.' });
        }
        
        if (description && description.length > 1000) {
            return res.status(400).json({ success: false, message: 'Description must be less than 1000 characters.' });
        }
        
        // Check for content files (now supports multiple)
        const contentFiles = req.files?.contentFiles || [];
        if (contentFiles.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one content file is required.' });
        }

        // Validate file types
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain'];
        
        for (const file of contentFiles) {
            if (!allowedTypes.includes(file.mimetype) && !file.originalname.match(/\.(pdf|pptx|txt)$/i)) {
                return res.status(400).json({ success: false, message: `Invalid file type for ${file.originalname}. Only PDF, PPTX, and TXT are allowed.` });
            }
            filesToDelete.push(file.path);
        }
        
        const oldExamFiles = req.files?.oldExamFiles || [];
        for (const file of oldExamFiles) {
            if (!allowedTypes.includes(file.mimetype) && !file.originalname.match(/\.(pdf|pptx|txt)$/i)) {
                return res.status(400).json({ success: false, message: `Invalid file type for ${file.originalname}. Only PDF, PPTX, and TXT are allowed.` });
            }
            filesToDelete.push(file.path);
        }

        const sourceFiles = [];

        console.log(`Processing ${contentFiles.length} content file(s) and ${oldExamFiles.length} exam file(s)...`);
        
        // Extract text from all content files
        let combinedContent = '';
        for (let i = 0; i < contentFiles.length; i++) {
            console.log(`Extracting content from file ${i + 1}/${contentFiles.length}: ${contentFiles[i].originalname}`);
            const text = await extractTextFromFile(contentFiles[i]);
            if (text && text.trim().length > 0) {
                combinedContent += `\n\n--- Source: ${contentFiles[i].originalname} ---\n${text}`;
                sourceFiles.push({
                    name: contentFiles[i].originalname,
                    type: 'content',
                    uploadedAt: new Date()
                });
            }
        }
        
        if (!combinedContent || combinedContent.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Could not extract text from content files. Please ensure files contain readable text.' });
        }

        let oldQuestions = [];
        let styleContext = '';

        if (oldExamFiles.length > 0) {
            console.log(`Processing ${oldExamFiles.length} old exam file(s)...`);
            
            // Extract text from all old exam files
            let combinedExamText = '';
            for (let i = 0; i < oldExamFiles.length; i++) {
                console.log(`Extracting from exam file ${i + 1}/${oldExamFiles.length}: ${oldExamFiles[i].originalname}`);
                const text = await extractTextFromFile(oldExamFiles[i]);
                if (text && text.trim().length > 0) {
                    combinedExamText += `\n\n--- Exam Source: ${oldExamFiles[i].originalname} ---\n${text}`;
                    sourceFiles.push({
                         name: oldExamFiles[i].originalname,
                         type: 'exam',
                         uploadedAt: new Date()
                     });
                }
            }
            
            styleContext = combinedExamText; // Store raw text for style context

            if (combinedExamText.trim().length > 0) {
                // Extract questions using AI with chapter identification
                console.log('Extracting questions from old exams...');
                const prompt = `
            You are an expert exam digitizer and analyzer.
            
            **Task 1: Identify Chapters/Topics**
            First, analyze the exam text and identify distinct chapters, topics, or sections.
            
            **Task 2: Extract Questions**
            Extract ALL multiple-choice questions from the following text.
            For each question, try to identify which chapter/topic it belongs to based on context.
            
            Return a JSON ARRAY. Each item must be:
            {
                "question": "Question text",
                "options": ["A", "B", "C", "D"],
                "correctAnswer": 0, // Index, if marked in text. If not marked, try to infer or leave null.
                "explanation": "Extracted explanation if present, or leave empty",
                "chapter": "Chapter/Topic name this question belongs to (e.g., 'Chapter 1: Introduction', 'Genetics', etc.)"
            }

            **Important**: 
            - Identify the chapter/topic by looking for section headers, question groupings, or contextual clues
            - If no clear chapter is identified, use "General" or infer from question content
            - Be consistent with chapter naming

            Text to extract from:
            """
            ${combinedExamText}
            """
            `;
            
                try {
                    const text = await generateContentWithFallback(prompt);
                    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
                    const extracted = JSON.parse(cleaned);
                    
                    if (Array.isArray(extracted)) {
                        oldQuestions = extracted.map(q => ({
                            question: q.question,
                            options: q.options || [],
                            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0, 
                            explanation: q.explanation || '',
                            type: 'multiple-choice',
                            chapter: q.chapter || 'General'
                        }));
                        console.log(`Extracted ${oldQuestions.length} questions from ${[...new Set(oldQuestions.map(q => q.chapter))].length} chapters.`);

                        // ENRICHMENT: Generate explanations from content for these questions
                        if (oldQuestions.length > 0 && combinedContent) {
                            console.log('Enriching questions with conceptual explanations from slides...');
                            const enrichmentPrompt = `
                        You are an expert tutor who explains concepts, not just facts.
                        
                        I have questions from an old exam and the course slides content.
                        For each question, generate a concise but conceptual explanation that:
                        1. Explains WHY the answer is correct (the underlying concept)
                        2. Uses ONLY information from the provided slides
                        3. Helps the student understand the principle, not just memorize
                        4. References the relevant chapter/topic when applicable
                        
                        Questions with their chapters:
                        ${JSON.stringify(oldQuestions.map((q, i) => ({ 
                            index: i, 
                            question: q.question, 
                            answer: q.options[q.correctAnswer],
                            chapter: q.chapter 
                        })))}

                        Slides Content:
                        """
                        ${combinedContent}
                        """

                        Return a JSON Object where keys are the question index (as string) and values are the conceptual explanation strings.
                        Example: { "0": "This relates to the concept of... because...", "1": "The principle here is..." }
                        `;

                            try {
                                const enrichText = await generateContentWithFallback(enrichmentPrompt);
                                const cleaned = enrichText.replace(/```json/g, '').replace(/```/g, '').trim();
                                const enrichMap = JSON.parse(cleaned);
                                
                                oldQuestions = oldQuestions.map((q, i) => ({
                                    ...q,
                                    explanation: enrichMap[String(i)] || q.explanation || "Explanation not found in slides."
                                }));
                                console.log('Conceptual enrichment complete.');
                            } catch (enrichErr) {
                                console.warn('Enrichment failed:', enrichErr.message);
                                // Proceed with original explanations
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Failed to extract questions from old exams:', e.message);
                }
            }
        }

        const newSubject = new Subject({
            title,
            description,
            content: combinedContent,
            styleContext,
            content: combinedContent,
            styleContext,
            oldQuestions,
            sourceFiles
        });

        await newSubject.save();
        
        console.log(`Subject created successfully: ${newSubject._id} - ${newSubject.title}`);
        res.status(201).json({ success: true, data: newSubject });

    } catch (error) {
        console.error('Create Subject Error:', {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
        
        // Don't leak internal errors to client in production
        const clientMessage = process.env.NODE_ENV === 'production' 
            ? 'Failed to create subject. Please try again.' 
            : error.message;
            
        res.status(500).json({ success: false, message: clientMessage });
    } finally {
        // Cleanup
        filesToDelete.forEach(path => {
            if (fs.existsSync(path)) fs.unlinkSync(path);
        });
    }
};

export const getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find().select('-content -styleContext'); // Exclude heavy text fields for list view
        res.json({ success: true, data: subjects });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSubjectDetails = async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
        res.json({ success: true, data: subject });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteSubject = async (req, res) => {
    try {
        await Subject.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Subject deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateSubject = async (req, res) => {
    const filesToDelete = [];
    try {
        const { id } = req.params;
        const { title, description, appendContent } = req.body;
        
        // Find existing subject
        const subject = await Subject.findById(id);
        if (!subject) {
            return res.status(404).json({ success: false, message: 'Subject not found' });
        }

        // Validation
        if (title && title.length > 200) {
            return res.status(400).json({ success: false, message: 'Title must be less than 200 characters.' });
        }
        
        if (description && description.length > 1000) {
            return res.status(400).json({ success: false, message: 'Description must be less than 1000 characters.' });
        }

        // Update basic fields
        if (title) subject.title = title;
        if (description !== undefined) subject.description = description;

        // Process new content files if provided
        const contentFiles = req.files?.contentFiles || [];
        const oldExamFiles = req.files?.oldExamFiles || [];
        
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain'];
        
        // Validate and track files
        for (const file of contentFiles) {
            if (!allowedTypes.includes(file.mimetype) && !file.originalname.match(/\.(pdf|pptx|txt)$/i)) {
                return res.status(400).json({ success: false, message: `Invalid file type for ${file.originalname}` });
            }
            filesToDelete.push(file.path);
        }
        
        for (const file of oldExamFiles) {
            if (!allowedTypes.includes(file.mimetype) && !file.originalname.match(/\.(pdf|pptx|txt)$/i)) {
                return res.status(400).json({ success: false, message: `Invalid file type for ${file.originalname}` });
            }
            filesToDelete.push(file.path);
        }

        // Initialize sourceFiles if not exists
        if (!subject.sourceFiles) subject.sourceFiles = [];

        // Process file updates (Rename / Replace)
        if (req.body.fileUpdates) {
            try {
                const updates = JSON.parse(req.body.fileUpdates);
                const replacementFiles = req.files?.replacementFiles || [];

                for (const update of updates) {
                    const targetFileIndex = subject.sourceFiles.findIndex(f => f.name === update.originalName);
                    if (targetFileIndex === -1) continue;

                    if (update.action === 'rename') {
                        // Update DB Name
                        subject.sourceFiles[targetFileIndex].name = update.newName;
                        
                        // Update Content Headers
                        const escapedInfo = update.originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const headerRegex = new RegExp(`(--- (?:Added )?(?:Exam )?Source: )${escapedInfo}( ---)`, 'g');
                        
                        if (update.type === 'content' && subject.content) {
                            subject.content = subject.content.replace(headerRegex, `$1${update.newName}$2`);
                        } else if (update.type === 'exam' && subject.styleContext) {
                            subject.styleContext = subject.styleContext.replace(headerRegex, `$1${update.newName}$2`);
                        }

                    } else if (update.action === 'replace') {
                        const newFile = replacementFiles[update.replacementIndex];
                        if (newFile) {
                            filesToDelete.push(newFile.path);
                            const text = await extractTextFromFile(newFile);
                            if (text && text.trim().length > 0) {
                                // Update DB Info
                                subject.sourceFiles[targetFileIndex].name = newFile.originalname;
                                subject.sourceFiles[targetFileIndex].uploadedAt = new Date();

                                // Replace Content Block
                                const escapedInfo = update.originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                // Matches: Header + Content up to next header or end of string
                                const blockRegex = new RegExp(`(\\n\\n--- (?:Added )?(?:Exam )?Source: ${escapedInfo} ---\\n)([\\s\\S]*?)(?=\\n\\n--- |$)`);
                                
                                const newHeaderPrefix = update.type === 'exam' ? 'Exam Source' : 'Source';
                                const newBlock = `\n\n--- ${newHeaderPrefix}: ${newFile.originalname} ---\n${text}`;

                                if (update.type === 'content' && subject.content) {
                                    subject.content = subject.content.replace(blockRegex, newBlock);
                                } else if (update.type === 'exam' && subject.styleContext) {
                                    subject.styleContext = subject.styleContext.replace(blockRegex, newBlock);
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Error processing file updates:', e);
            }
        }

        // Extract and append new content
        if (contentFiles.length > 0) {
            console.log(`Adding ${contentFiles.length} new content file(s) to subject ${id}...`);
            
            // If replace mode, remove existing content files
            if (String(appendContent) !== 'true') {
                 subject.sourceFiles = subject.sourceFiles.filter(f => f.type !== 'content');
            }

            let newContent = '';
            for (let i = 0; i < contentFiles.length; i++) {
                console.log(`Extracting content from file ${i + 1}/${contentFiles.length}: ${contentFiles[i].originalname}`);
                const text = await extractTextFromFile(contentFiles[i]);
                if (text && text.trim().length > 0) {
                    newContent += `\n\n--- Added Source: ${contentFiles[i].originalname} ---\n${text}`;
                    subject.sourceFiles.push({
                        name: contentFiles[i].originalname,
                        type: 'content',
                        uploadedAt: new Date()
                    });
                }
            }
            
            if (newContent.trim().length > 0) {
                if (appendContent === 'true' || appendContent === true) {
                    subject.content += newContent;
                    console.log('Content appended to existing material.');
                } else {
                    subject.content = newContent;
                    console.log('Content replaced.');
                }
            }
        }

        // Process new old exam files (similar logic - append new questions)
        if (oldExamFiles.length > 0) {
            console.log(`Processing ${oldExamFiles.length} new old exam file(s)...`);
            
            // If replace mode, remove existing exam files
            if (String(appendContent) !== 'true') {
                 subject.sourceFiles = subject.sourceFiles.filter(f => f.type !== 'exam');
            }
            
            let newExamText = '';
            for (let i = 0; i < oldExamFiles.length; i++) {
                const text = await extractTextFromFile(oldExamFiles[i]);
                if (text && text.trim().length > 0) {
                    newExamText += `\n\n--- Exam Source: ${oldExamFiles[i].originalname} ---\n${text}`;
                    subject.sourceFiles.push({
                        name: oldExamFiles[i].originalname,
                        type: 'exam',
                        uploadedAt: new Date()
                    });
                }
            }
            
            if (newExamText.trim().length > 0) {
                if (appendContent === 'true' || appendContent === true) {
                    subject.styleContext = (subject.styleContext || '') + newExamText;
                } else {
                    subject.styleContext = newExamText;
                }
                
                // Extract and add new questions (simplified - full implementation in production)
                console.log('Extracting questions from new exam files...');
                // Note: Full extraction logic similar to createSubject can be added here
            }
        }

        await subject.save();
        
        console.log(`Subject updated successfully: ${subject._id} - ${subject.title}`);
        res.json({ success: true, data: subject });

    } catch (error) {
        console.error('Update Subject Error:', {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
        
        const clientMessage = process.env.NODE_ENV === 'production' 
            ? 'Failed to update subject. Please try again.' 
            : error.message;
            
        res.status(500).json({ success: false, message: clientMessage });
    } finally {
        filesToDelete.forEach(path => {
            if (fs.existsSync(path)) fs.unlinkSync(path);
        });
    }
};

export const generateQuizFromSubject = async (req, res) => {
    try {
        const { subjectIds, filters, difficulty = 'Medium', questionCount = 10, useOldQuestions = true, includeNewQuestions = true } = req.body;
        
        // Validation
        if (!subjectIds || (Array.isArray(subjectIds) && subjectIds.length === 0)) {
            return res.status(400).json({ success: false, message: 'At least one subject ID is required.' });
        }
        
        if (questionCount < 1 || questionCount > 100) {
            return res.status(400).json({ success: false, message: 'Question count must be between 1 and 100.' });
        }
        
        if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
            return res.status(400).json({ success: false, message: 'Invalid difficulty level.' });
        }
        
        if (!useOldQuestions && !includeNewQuestions) {
            return res.status(400).json({ success: false, message: 'At least one question source must be enabled.' });
        }
        
        // Handle both single ID and array
        const ids = Array.isArray(subjectIds) ? subjectIds : [subjectIds];
        
        // Validate MongoDB ObjectIDs
        const validIdPattern = /^[0-9a-fA-F]{24}$/;
        const invalidIds = ids.filter(id => !validIdPattern.test(id));
        if (invalidIds.length > 0) {
            return res.status(400).json({ success: false, message: 'Invalid subject ID format.' });
        }
        
        const subjects = await Subject.find({ _id: { $in: ids } });
        if (!subjects.length) return res.status(404).json({ success: false, message: 'Subjects not found' });

        let finalQuestions = [];
        let allOldQuestions = [];
        let combinedContent = '';
        let combinedStyle = '';

        // Aggregate data from all subjects
        subjects.forEach(sub => {
            if (sub.oldQuestions && sub.oldQuestions.length > 0) {
                allOldQuestions = [...allOldQuestions, ...sub.oldQuestions];
            }

            // Filter Content Logic
            let subjectContentToAdd = '';
            const fileFilters = filters && filters[sub._id];

            if (fileFilters && Array.isArray(fileFilters) && sub.content) {
                // Regex to match header and content block
                // Matches: 
                // 1. Newline pairs
                // 2. Header: --- Source: NAME --- OR --- Added Source: NAME ---
                // 3. Content: Anything until the next header OR end of string
                const regex = /\n\n--- (?:Added )?Source: (.*?) ---\n([\s\S]*?)(?=\n\n--- (?:Added )?Source:|$)/g;
                
                // Use a Set for faster lookup
                const allowedFiles = new Set(fileFilters);
                let hasMatches = false;

                const matches = sub.content.matchAll(regex);
                for (const match of matches) {
                    const fileName = match[1].trim(); 
                    const contentBlock = match[2];
                    
                    if (allowedFiles.has(fileName)) {
                        subjectContentToAdd += `\n\n--- Source: ${fileName} ---\n${contentBlock}`;
                        hasMatches = true;
                    }
                }

                // If parsing failed or no matches found (but filtering requested), 
                // check if the content doesn't match the regex format (legacy/fallback)
                if (!hasMatches && sub.content && allowedFiles.size > 0 && sub.content.length > 0) {
                     // Debug/Fallback: If strict parsing returns nothing but we have content, 
                     // it might be because the regex didn't match (e.g. slight format diff).
                     // For safety, if filters cover 'everything', just use full content?
                     // But for now, assume regex matches. If format is broken, we skip content (safe fail).
                }

            } else {
                // No filter -> Use all content
                subjectContentToAdd = sub.content || '';
            }

            combinedContent += `\n--- Subject: ${sub.title} ---\n${subjectContentToAdd}\n`;
            
            if (sub.styleContext) {
                combinedStyle += `\n--- Style for ${sub.title} ---\n${sub.styleContext}\n`;
            }
        });

        // 1. Add Old Questions if requested
        if (useOldQuestions && allOldQuestions.length > 0) {
            const shuffled = [...allOldQuestions].sort(() => 0.5 - Math.random());
            const toTake = shuffled.slice(0, questionCount);
            finalQuestions = toTake.map((q, idx) => ({
                id: `old_${idx}`,
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                type: 'multiple-choice',
                isOldExam: true
            }));
        }

        // 2. Generate New Questions if needed
        const needed = questionCount - finalQuestions.length;
        if (needed > 0 && includeNewQuestions) {
            console.log(`Generating ${needed} new questions from combined subject content...`);
            
            // Extract chapter information from old questions for context
            const chapterContext = allOldQuestions.length > 0 
                ? `\n**Available Chapters/Topics (for context):**\n${[...new Set(allOldQuestions.map(q => q.chapter))].join(', ')}\n`
                : '';
            
            // Chunking Strategy to avoid Throughput Cap
            // Safe request size: ~2000 tokens (~8000 chars)
            const SAFE_CHUNK_SIZE = 8000;
            const textChunks = chunkText(combinedContent, SAFE_CHUNK_SIZE);
            
            console.log(`[Subject AI] Splitting content into ${textChunks.length} chunks to bypass rate limits.`);
            
            let generatedNewQs = [];
            
            for (let i = 0; i < textChunks.length; i++) {
                // Check if we have enough questions
                if (generatedNewQs.length >= needed) break;

                const chunk = textChunks[i];
                // Calculate questions needed for this chunk
                const remainingNeeded = needed - generatedNewQs.length;
                const chunksLeft = textChunks.length - i;
                const qsPerChunk = Math.ceil(remainingNeeded / chunksLeft) + 1; // Buffer

                console.log(`[Subject AI] Processing Chunk ${i + 1}/${textChunks.length}... requesting ~${qsPerChunk} questions`);

                const prompt = `You are an expert exam creator.
Create ${qsPerChunk} multiple choice questions based strictly on the following text.

**Strict Rules:**
1. **NO META-REFERENCES**: ABSOLUTELY DO NOT use phrases like "according to the study material", "as mentioned in the text", "in the provided slides", or "the author states".
2. **Direct Questions**: Ask directly about the concept.
   - ❌ Bad: "What does the text say about Neural Networks?"
   - ✅ Good: "What is the primary function of a hidden layer in a Neural Network?"
3. **Conceptual**: Test understanding, not rote memorization.
4. **Format**: Return ONLY a valid JSON array.

**Study Material:**
"""
${chunk}
"""
${chapterContext}

**Output JSON Format:**
[
    {
        "question": "Direct conceptual question (no 'according to text')",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0,
        "explanation": "Clear explanation of the concept",
        "type": "multiple-choice"
    }
]`;

                try {
                    const text = await generateContentWithFallback(prompt);
                    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
                    const chunkQuestions = JSON.parse(cleaned);

                    if (Array.isArray(chunkQuestions)) {
                        generatedNewQs = [...generatedNewQs, ...chunkQuestions];
                    }
                    
                    // Artificial Delay to respect TPM cooling
                    if (i < textChunks.length - 1) {
                        console.log("Waiting 2s to respect API cooling...");
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (err) {
                    console.error(`[Subject AI] Error on chunk ${i + 1}:`, err.message);
                    // Continue to next chunk
                }
            }

            // Map to final format and trim to exact count
            if (generatedNewQs.length > 0) {
                 const newQs = generatedNewQs.slice(0, needed).map((q, index) => ({
                    id: `new_${index}`,
                    question: q.question,
                    options: q.options || [],
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || "Generated by AI",
                    type: 'multiple-choice',
                    isGenerated: true
                }));
                finalQuestions = [...finalQuestions, ...newQs];
            } else if (finalQuestions.length === 0) {
                 // Only error if we have ZERO questions total (old + new)
                 throw new Error('Failed to generate any new questions from content.');
            }
        }

        console.log(`Quiz generated successfully: ${finalQuestions.length} questions from ${subjects.length} subject(s)`);
        
        res.json({
            success: true,
            data: finalQuestions
        });

    } catch (error) {
        console.error('Generate Quiz from Subject Error:', {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
        
        const clientMessage = process.env.NODE_ENV === 'production' 
            ? 'Failed to generate quiz. Please try again.' 
            : error.message;
            
        res.status(500).json({ success: false, message: clientMessage });
    }
};
