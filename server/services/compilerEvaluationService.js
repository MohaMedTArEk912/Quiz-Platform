import Groq from 'groq-sdk';

/**
 * Compiler Evaluation Service
 * Uses Groq AI to evaluate user-submitted code against a reference solution.
 * 
 * @module compilerEvaluationService
 */

// Pass threshold for daily challenge completion
const PASS_THRESHOLD = 70;

/**
 * Lazy initialization of Groq client to avoid crashes when API key is missing.
 * @returns {Groq|null} Groq client instance or null if key is missing
 */
const getGroqClient = () => {
  const key = (process.env.GROQ_API_KEY || '').trim();
  if (!key) return null;
  try {
    return new Groq({ apiKey: key });
  } catch (e) {
    console.warn('Failed to initialize Groq client:', e.message);
    return null;
  }
};

/**
 * Get available Groq models in order of preference.
 * Falls back to alternative models if primary is unavailable.
 * @returns {Array<string>} Array of model names to try
 */
const getGroqModels = () => {
  const envModel = process.env.GROQ_MODEL;
  const models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768'
  ];
  
  if (envModel && !models.includes(envModel)) {
    models.unshift(envModel);
  }
  
  return models;
};

/**
 * Build the evaluation prompt for the AI.
 * 
 * @param {Object} params - Parameters for prompt construction
 * @param {string} params.title - Question title
 * @param {string} params.description - Problem description
 * @param {string} params.referenceCode - The correct reference solution
 * @param {string} params.userCode - User's submitted code
 * @param {string} params.language - Programming language
 * @returns {string} The constructed prompt
 */
const buildEvaluationPrompt = ({ title, description, referenceCode, userCode, language }) => {
  return `You are an expert code reviewer and programming instructor. Your task is to evaluate a student's code submission against a reference solution.

## Problem: ${title}

### Description:
${description}

### Reference Solution (${language}):
\`\`\`${language}
${referenceCode}
\`\`\`

### Student's Submission (${language}):
\`\`\`${language}
${userCode}
\`\`\`

## Evaluation Criteria:
1. **Correctness (50 points)**: Does the code solve the problem correctly? Does it handle edge cases?
2. **Code Quality (25 points)**: Is the code clean, readable, and well-structured?
3. **Efficiency (15 points)**: Is the solution efficient? Does it use appropriate algorithms/data structures?
4. **Best Practices (10 points)**: Does it follow coding best practices and conventions?

## Instructions:
Evaluate the student's submission and provide:
1. A score from 0-100 based on the criteria above
2. Constructive feedback explaining the score

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "score": <number between 0-100>,
  "feedback": "<detailed feedback string explaining the score, strengths, and areas for improvement>"
}

Do not include any text before or after the JSON. The response must be parseable as JSON.`;
};

/**
 * Evaluate a user's code submission using Groq AI.
 * 
 * @param {Object} question - The compiler question object
 * @param {string} question.title - Question title
 * @param {string} question.description - Problem description
 * @param {string} question.referenceCode - Reference solution
 * @param {string} question.language - Programming language
 * @param {string} userCode - User's submitted code
 * @returns {Promise<Object>} Evaluation result with score, feedback, and passed status
 * @throws {Error} If Groq API is unavailable or all models fail
 */
export const evaluateSubmission = async (question, userCode) => {
  const groq = getGroqClient();
  
  if (!groq) {
    throw new Error('GROQ_API_KEY is missing. Cannot evaluate submission.');
  }

  // Validate inputs
  if (!question || !question.referenceCode) {
    throw new Error('Invalid question: missing reference code');
  }
  
  if (!userCode || typeof userCode !== 'string' || userCode.trim().length === 0) {
    return {
      score: 0,
      feedback: 'No code was submitted. Please provide your solution.',
      passed: false
    };
  }

  const prompt = buildEvaluationPrompt({
    title: question.title,
    description: question.description,
    referenceCode: question.referenceCode,
    userCode: userCode.trim(),
    language: question.language || 'javascript'
  });

  const models = getGroqModels();
  let lastError = null;

  // Try each model until one succeeds
  for (const modelName of models) {
    try {
      console.log(`[Compiler Eval] Attempting model: ${modelName}`);
      
      const completion = await groq.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a code evaluation assistant. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: 'json_object' }
      });

      const rawContent = completion.choices?.[0]?.message?.content;
      
      if (!rawContent) {
        throw new Error('Empty response from Groq');
      }

      console.log(`[Compiler Eval] ✅ Success with ${modelName}`);
      
      // Parse the JSON response
      let result;
      try {
        result = JSON.parse(rawContent);
      } catch (parseError) {
        // Try to extract JSON from the response if it contains extra text
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse AI response as JSON');
        }
      }

      // Validate and sanitize the result
      const score = Math.min(100, Math.max(0, Number(result.score) || 0));
      const feedback = String(result.feedback || 'No feedback provided.');
      const passed = score >= PASS_THRESHOLD;

      return { score, feedback, passed };
      
    } catch (error) {
      const errorMsg = error.message || String(error);
      console.warn(`[Compiler Eval] ❌ Model ${modelName} failed: ${errorMsg}`);
      lastError = error;
    }
  }

  // All models failed
  throw new Error(`All Groq models failed. Last error: ${lastError?.message || 'Unknown'}`);
};

/**
 * Get the pass threshold value.
 * @returns {number} The minimum score required to pass
 */
export const getPassThreshold = () => PASS_THRESHOLD;
