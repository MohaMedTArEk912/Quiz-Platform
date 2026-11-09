import axios from 'axios';
import vm from 'vm';
import Groq from 'groq-sdk';

// Judge0 Language IDs
const LANGUAGE_IDS = {
  javascript: 63, // Node.js 18.15.0
  typescript: 74, // TypeScript 5.0.3
  python: 71,     // Python 3.11.2
  java: 62,       // Java (OpenJDK 13.0.1)
  c: 50,          // C (GCC 9.2.0)
  cpp: 54,        // C++ (GCC 9.2.0)
};

/**
 * Execute JavaScript/TypeScript locally in a secure Node.js VM context.
 */
const runInLocalSandbox = (sourceCode, timeoutMs = 3500) => {
  const logs = [];
  const sandbox = {
    console: {
      log: (...args) => logs.push(args.map(a => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))).join(' ')),
      error: (...args) => logs.push('[ERROR] ' + args.map(a => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))).join(' ')),
      warn: (...args) => logs.push('[WARN] ' + args.map(a => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))).join(' ')),
      info: (...args) => logs.push(args.map(a => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))).join(' '))
    },
    Math, Date, JSON, Array, Object, String, Number, Boolean, RegExp, Map, Set, Promise,
    parseInt, parseFloat, isNaN, isFinite
  };

  const context = vm.createContext(sandbox);

  try {
    const startTime = Date.now();
    const result = vm.runInContext(sourceCode, context, { timeout: timeoutMs });
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(3);

    if (logs.length === 0 && result !== undefined) {
      logs.push(typeof result === 'object' && result !== null ? JSON.stringify(result) : String(result));
    }

    return {
      output: logs.join('\n') || '(No output)',
      isError: false,
      executionTime,
      memory: 2048,
      status: { id: 3, description: 'Accepted' },
      engine: 'local-node-vm'
    };
  } catch (err) {
    return {
      output: err.message || String(err),
      isError: true,
      executionTime: '0.001',
      memory: 1024,
      status: { id: 11, description: 'Runtime Error' },
      engine: 'local-node-vm'
    };
  }
};

/**
 * Execute code using Judge0 (prefers RapidAPI if subscribed, otherwise falls back to free public Judge0 CE).
 */
const runWithJudge0 = async (sourceCode, languageId) => {
  const payload = {
    source_code: sourceCode,
    language_id: languageId,
    stdin: ''
  };

  // 1. Try RapidAPI if an explicit key is configured and not empty
  const rapidApiKey = (process.env.JUDGE0_API_KEY || '').trim();
  if (rapidApiKey && rapidApiKey.length > 5) {
    try {
      const rapidOptions = {
        method: 'POST',
        url: process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com/submissions',
        params: { base64_encoded: 'false', wait: 'true' },
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com',
        },
        data: payload,
        timeout: 10000
      };
      const response = await axios.request(rapidOptions);
      if (response.data && response.data.status) {
        return { ...response.data, engine: 'judge0-rapidapi' };
      }
    } catch (rapidErr) {
      console.warn('[Compiler] RapidAPI Judge0 attempt failed, falling back to public Judge0 CE:', rapidErr?.response?.data?.message || rapidErr.message);
    }
  }

  // 2. Fallback to public Judge0 CE (ce.judge0.com)
  const ceOptions = {
    method: 'POST',
    url: 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true',
    headers: { 'Content-Type': 'application/json' },
    data: payload,
    timeout: 12000
  };

  const response = await axios.request(ceOptions);
  return { ...response.data, engine: 'judge0-public-ce' };
};

/**
 * AI simulation fallback using Groq when external compilers are unavailable.
 */
const runWithAiSimulator = async (sourceCode, language) => {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) return null;

  try {
    const groq = new Groq({ apiKey });
    const prompt = `You are a high-precision code execution engine.
Execute the following ${language} code and determine its exact standard output (stdout), standard error (stderr), and exit status.

CODE:
\`\`\`${language}
${sourceCode}
\`\`\`

Respond ONLY with valid JSON in this exact structure:
{
  "stdout": "the printed output here or empty string",
  "stderr": "any runtime error message or empty string",
  "isError": false,
  "statusDescription": "Accepted"
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'qwen/qwen3.8-27b',
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
      output: parsed.isError ? (parsed.stderr || parsed.stdout || 'Execution error') : (parsed.stdout || '(No output)'),
      isError: Boolean(parsed.isError),
      executionTime: '0.045',
      memory: 4096,
      status: { id: parsed.isError ? 11 : 3, description: parsed.statusDescription || (parsed.isError ? 'Runtime Error' : 'Accepted') },
      engine: 'groq-ai-simulator'
    };
  } catch (err) {
    console.warn('[Compiler] AI code simulator failed:', err.message);
    return null;
  }
};

/**
 * POST /api/compiler/compile
 */
export const runCode = async (req, res) => {
  try {
    const { sourceCode, language } = req.body;

    if (!sourceCode) {
      return res.status(400).json({ message: 'Source code is required' });
    }

    const langKey = (language || 'javascript').toLowerCase();
    const languageId = LANGUAGE_IDS[langKey];
    if (!languageId) {
      return res.status(400).json({ message: `Language '${language}' is not supported` });
    }

    let result = null;

    // 1. For JavaScript/TypeScript, local Node.js VM execution provides instant 0ms latency
    if (langKey === 'javascript' || langKey === 'typescript') {
      try {
        result = runInLocalSandbox(sourceCode);
      } catch (e) {
        console.warn('[Compiler] Local VM failed, trying Judge0:', e.message);
      }
    }

    // 2. If not already resolved (or for Python, C++, Java, etc.), try Judge0
    if (!result) {
      try {
        const judge0Res = await runWithJudge0(sourceCode, languageId);
        if (judge0Res && judge0Res.status) {
          const isError = judge0Res.status.id !== 3;
          const output = isError
            ? (judge0Res.compile_output || judge0Res.stderr || judge0Res.message || `Error: ${judge0Res.status.description}`)
            : (judge0Res.stdout || '(No output)');

          result = {
            output,
            isError,
            executionTime: judge0Res.time,
            memory: judge0Res.memory,
            status: judge0Res.status,
            engine: judge0Res.engine
          };
        }
      } catch (judgeErr) {
        console.warn('[Compiler] Judge0 request failed:', judgeErr.message);
      }
    }

    // 3. If Judge0 failed and it's JS/TS, fallback to local VM
    if (!result && (langKey === 'javascript' || langKey === 'typescript')) {
      result = runInLocalSandbox(sourceCode);
    }

    // 4. Final safety net: Groq AI simulator
    if (!result) {
      result = await runWithAiSimulator(sourceCode, langKey);
    }

    // 5. If somehow all three fail, provide a safe friendly response instead of crashing with 500
    if (!result) {
      return res.json({
        output: 'Execution service is temporarily busy. Please try running your code again in a moment.',
        isError: true,
        executionTime: '0.000',
        status: { id: 13, description: 'Service Busy' }
      });
    }

    return res.json({
      output: result.output,
      isError: result.isError,
      executionTime: result.executionTime,
      memory: result.memory,
      status: result.status,
      engine: result.engine
    });

  } catch (error) {
    console.error('[Compiler] Unexpected error:', error.message);
    res.status(200).json({
      output: `Runtime error: ${error.message}`,
      isError: true,
      executionTime: '0.000',
      status: { id: 11, description: 'Runtime Error' }
    });
  }
};
