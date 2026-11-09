import Groq from 'groq-sdk';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Quiz } from '../models/Quiz.js';
import { CompilerQuestion } from '../models/CompilerQuestion.js';
import { DailyChallenge } from '../models/DailyChallenge.js';

/**
 * Lazy initialization of Groq client
 */
const getGroqClient = () => {
  const key = (process.env.GROQ_API_KEY || '').trim();
  if (!key) return null;
  try {
    return new Groq({ apiKey: key });
  } catch (e) {
    console.warn('Failed to initialize Groq client in dailyChallengeAiService:', e.message);
    return null;
  }
};

const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b'
];

/**
 * Generates 3 distinct difficulty tiers (Easy, Medium, Hard) for a daily challenge
 * using existing quiz topics/questions as a conceptual foundation.
 * 
 * @param {Object} options
 * @param {string|Date} options.date - Target date
 * @param {string} [options.referenceQuizId] - Specific quiz ID to base challenge on
 * @param {string} [options.language='javascript'] - Target language
 * @param {string} [options.customTopic] - Optional custom admin prompt/topic
 * @param {Object} [options.tierRewards] - Optional custom coin/xp/gift rewards for each tier
 * @param {boolean} [options.saveDirectly=true] - Whether to write to DB immediately
 * @returns {Promise<Object>} Generated tiers and saved challenge
 */
export async function generateThreeTierChallenges(options = {}) {
  const {
    date = new Date(),
    referenceQuizId = null,
    language = 'javascript',
    customTopic = '',
    tierRewards = {},
    saveDirectly = true
  } = options;

  const groq = getGroqClient();
  if (!groq) {
    throw new Error('Groq AI API is not configured. Please set GROQ_API_KEY in your environment.');
  }

  // 1. Fetch reference quiz material from MongoDB
  let referenceContext = '';
  let referenceTitle = 'Core Programming Concepts';
  let referenceCategory = 'Algorithms';

  try {
    let referenceQuizzes = [];
    if (referenceQuizId && referenceQuizId !== 'random') {
      const isObjectId = mongoose.Types.ObjectId.isValid(referenceQuizId);
      const query = isObjectId
        ? { $or: [{ id: referenceQuizId }, { _id: referenceQuizId }] }
        : { id: referenceQuizId };
      const specificQuiz = await Quiz.findOne(query).lean();
      if (specificQuiz) {
        referenceQuizzes = [specificQuiz];
      }
    }

    if (referenceQuizzes.length === 0) {
      // Pick 2 random quizzes with questions from the database
      referenceQuizzes = await Quiz.aggregate([
        { $match: { 'questions.0': { $exists: true } } },
        { $sample: { size: 2 } }
      ]);
      if (!referenceQuizzes || referenceQuizzes.length === 0) {
        referenceQuizzes = await Quiz.find({}).limit(2).lean();
      }
    }

    if (referenceQuizzes && referenceQuizzes.length > 0) {
      referenceTitle = referenceQuizzes.map(q => q.title).join(' & ');
      referenceCategory = referenceQuizzes[0].category || 'Algorithms';

      referenceContext = referenceQuizzes.map(quiz => {
        const sampleQuestions = (quiz.questions || []).slice(0, 3).map(q => {
          let desc = `- Question: ${q.question}`;
          if (q.codeSnippet) desc += `\n  Code snippet: ${q.codeSnippet.replace(/\n/g, ' ')}`;
          if (q.explanation) desc += `\n  Explanation: ${q.explanation}`;
          return desc;
        }).join('\n');

        return `Quiz Subject: "${quiz.title}" (Category: ${quiz.category}, Level: ${quiz.difficulty})\nSummary: ${quiz.description || ''}\nKey Concepts & Reference Samples:\n${sampleQuestions}`;
      }).join('\n\n');
    }
  } catch (err) {
    console.warn('Could not retrieve reference quizzes, proceeding with general knowledge:', err.message);
  }

  // 2. Build Groq AI Prompt
  const systemPrompt = `You are an elite competitive programmer and curriculum architect for an interactive coding platform.
Your task is to design THREE completely original, distinct programming challenges (one Easy, one Medium, and one Hard) in ${language}.
The challenges MUST take inspiration from existing platform quizzes/topics provided as context, but each challenge MUST be an original algorithmic problem with complete reference code and testable input/output.
Output STRICTLY valid JSON matching the exact schema requested.`;

  const userPrompt = `Please generate THREE original coding challenges for our Daily Challenge system in ${language}.

${referenceContext ? `REFERENCE QUIZ CONTEXT TO DRAW CONCEPTS FROM:\n${referenceContext}\n` : ''}
${customTopic ? `ADMIN SPECIAL INSTRUCTIONS / FOCUS TOPIC: "${customTopic}"\n` : ''}

DIFFICULTY REQUIREMENTS:
1. "easy":
   - Target: Beginners and warm-up.
   - Core concept: Basic loops, array/string manipulation, conditionals, or math.
   - Complexity: O(n) or O(1).
2. "medium":
   - Target: Intermediate developers.
   - Core concept: Hash maps, two-pointer, sliding window, stack/queue, string transformations, or basic recursion.
   - Edge cases: Empty inputs, negative numbers, duplicates.
3. "hard":
   - Target: Advanced developers and algorithmic enthusiasts.
   - Core concept: Dynamic programming, backtracking, complex data structure manipulation, tree/graph traversal, or deep optimization.
   - Challenging edge cases.

For EACH of the three tiers (easy, medium, hard), provide:
- "title": Short, catchy problem name (e.g. "Balanced Brackets Validator", "Palindrome Substring Count")
- "category": e.g. "Arrays", "Strings", "Data Structures", "Dynamic Programming"
- "description": Concise, clear problem statement formatted in clean Markdown. Include goal, Input/Output, and 2 concrete Examples with explanation. Keep descriptions crisp (2-3 short paragraphs + examples).
- "starterCode": Boilerplate function stub with comments for the student in ${language}
- "referenceCode": Complete, clean, well-commented working reference solution in ${language}
- "hints": An array of 2 to 3 progressive hints (from subtle suggestion to key algorithmic step)
- "giftLabel": Creative themed reward gift name (e.g. "Bronze Adventurer Satchel", "Silver Adept Cache", "Gold Grandmaster Vault")

RETURN ONLY VALID JSON WITH KEYS: "easy", "medium", "hard".`;

  let responseContent = '';
  let parsed = null;

  for (const model of GROQ_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 5000,
        response_format: { type: 'json_object' }
      });

      responseContent = completion.choices[0]?.message?.content || '';
      if (responseContent) {
        let cleanJson = responseContent.trim();
        if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
        if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
        if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
        parsed = JSON.parse(cleanJson.trim());
        if (parsed.easy && parsed.medium && parsed.hard) {
          break; // successfully got all 3 tiers
        }
      }
    } catch (err) {
      console.warn(`Groq model ${model} failed in daily challenge generator:`, err.message);
    }
  }

  if (!parsed || !parsed.easy || !parsed.medium || !parsed.hard) {
    throw new Error('AI failed to generate all 3 challenge tiers. Please retry with a different topic or model.');
  }

  // 3. Normalize and enrich each tier
  const tiersData = {
    easy: {
      title: parsed.easy.title || 'Beginner Challenge',
      category: parsed.easy.category || referenceCategory,
      description: parsed.easy.description || '',
      referenceCode: parsed.easy.referenceCode || '',
      starterCode: parsed.easy.starterCode || '// Write your solution here\n',
      hints: Array.isArray(parsed.easy.hints) ? parsed.easy.hints : [],
      giftLabel: parsed.easy.giftLabel || tierRewards.easy?.giftLabel || 'Bronze Novice Satchel',
      rewardCoins: tierRewards.easy?.coins ?? 50,
      rewardXP: tierRewards.easy?.xp ?? 80,
      rewardBadgeId: tierRewards.easy?.rewardBadgeId || null,
      rewardItemId: tierRewards.easy?.rewardItemId || null
    },
    medium: {
      title: parsed.medium.title || 'Intermediate Challenge',
      category: parsed.medium.category || referenceCategory,
      description: parsed.medium.description || '',
      referenceCode: parsed.medium.referenceCode || '',
      starterCode: parsed.medium.starterCode || '// Write your solution here\n',
      hints: Array.isArray(parsed.medium.hints) ? parsed.medium.hints : [],
      giftLabel: parsed.medium.giftLabel || tierRewards.medium?.giftLabel || 'Silver Adept Cache',
      rewardCoins: tierRewards.medium?.coins ?? 100,
      rewardXP: tierRewards.medium?.xp ?? 180,
      rewardBadgeId: tierRewards.medium?.rewardBadgeId || null,
      rewardItemId: tierRewards.medium?.rewardItemId || null
    },
    hard: {
      title: parsed.hard.title || 'Advanced Challenge',
      category: parsed.hard.category || referenceCategory,
      description: parsed.hard.description || '',
      referenceCode: parsed.hard.referenceCode || '',
      starterCode: parsed.hard.starterCode || '// Write your solution here\n',
      hints: Array.isArray(parsed.hard.hints) ? parsed.hard.hints : [],
      giftLabel: parsed.hard.giftLabel || tierRewards.hard?.giftLabel || 'Gold Grandmaster Vault',
      rewardCoins: tierRewards.hard?.coins ?? 200,
      rewardXP: tierRewards.hard?.xp ?? 400,
      rewardBadgeId: tierRewards.hard?.rewardBadgeId || null,
      rewardItemId: tierRewards.hard?.rewardItemId || null
    }
  };

  // If preview only (not saving directly)
  if (!saveDirectly) {
    return {
      referenceTitle,
      referenceCategory,
      language,
      tiers: tiersData
    };
  }

  // 4. Save to Database: create 3 CompilerQuestion records and 1 DailyChallenge
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // Create Easy Question
  const easyQuestion = await CompilerQuestion.create({
    questionId: `cq_easy_${crypto.randomUUID().slice(0, 8)}`,
    title: tiersData.easy.title,
    description: tiersData.easy.description,
    referenceCode: tiersData.easy.referenceCode,
    language,
    difficulty: 'easy',
    category: tiersData.easy.category,
    hints: tiersData.easy.hints,
    rewardCoins: tiersData.easy.rewardCoins,
    rewardXP: tiersData.easy.rewardXP
  });

  // Create Medium Question
  const mediumQuestion = await CompilerQuestion.create({
    questionId: `cq_med_${crypto.randomUUID().slice(0, 8)}`,
    title: tiersData.medium.title,
    description: tiersData.medium.description,
    referenceCode: tiersData.medium.referenceCode,
    language,
    difficulty: 'medium',
    category: tiersData.medium.category,
    hints: tiersData.medium.hints,
    rewardCoins: tiersData.medium.rewardCoins,
    rewardXP: tiersData.medium.rewardXP
  });

  // Create Hard Question
  const hardQuestion = await CompilerQuestion.create({
    questionId: `cq_hard_${crypto.randomUUID().slice(0, 8)}`,
    title: tiersData.hard.title,
    description: tiersData.hard.description,
    referenceCode: tiersData.hard.referenceCode,
    language,
    difficulty: 'hard',
    category: tiersData.hard.category,
    hints: tiersData.hard.hints,
    rewardCoins: tiersData.hard.rewardCoins,
    rewardXP: tiersData.hard.rewardXP
  });

  // Upsert DailyChallenge document for target date
  const tomorrow = new Date(targetDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let dailyChallenge = await DailyChallenge.findOne({
    date: { $gte: targetDate, $lt: tomorrow }
  });

  const tiersConfig = {
    easy: {
      compilerQuestionId: easyQuestion.questionId,
      rewardCoins: tiersData.easy.rewardCoins,
      rewardXP: tiersData.easy.rewardXP,
      rewardBadgeId: tiersData.easy.rewardBadgeId,
      rewardItemId: tiersData.easy.rewardItemId,
      giftLabel: tiersData.easy.giftLabel
    },
    medium: {
      compilerQuestionId: mediumQuestion.questionId,
      rewardCoins: tiersData.medium.rewardCoins,
      rewardXP: tiersData.medium.rewardXP,
      rewardBadgeId: tiersData.medium.rewardBadgeId,
      rewardItemId: tiersData.medium.rewardItemId,
      giftLabel: tiersData.medium.giftLabel
    },
    hard: {
      compilerQuestionId: hardQuestion.questionId,
      rewardCoins: tiersData.hard.rewardCoins,
      rewardXP: tiersData.hard.rewardXP,
      rewardBadgeId: tiersData.hard.rewardBadgeId,
      rewardItemId: tiersData.hard.rewardItemId,
      giftLabel: tiersData.hard.giftLabel
    }
  };

  if (dailyChallenge) {
    dailyChallenge.compilerQuestionId = mediumQuestion.questionId;
    dailyChallenge.tiers = tiersConfig;
    dailyChallenge.rewardCoins = tiersData.medium.rewardCoins;
    dailyChallenge.rewardXP = tiersData.medium.rewardXP;
    await dailyChallenge.save();
  } else {
    dailyChallenge = await DailyChallenge.create({
      date: targetDate,
      compilerQuestionId: mediumQuestion.questionId,
      rewardCoins: tiersData.medium.rewardCoins,
      rewardXP: tiersData.medium.rewardXP,
      tiers: tiersConfig
    });
  }

  return {
    challenge: dailyChallenge,
    referenceTitle,
    referenceCategory,
    tiers: {
      easy: { ...tiersData.easy, questionId: easyQuestion.questionId },
      medium: { ...tiersData.medium, questionId: mediumQuestion.questionId },
      hard: { ...tiersData.hard, questionId: hardQuestion.questionId }
    }
  };
}
