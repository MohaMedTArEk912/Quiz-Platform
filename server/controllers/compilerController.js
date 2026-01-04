import axios from 'axios';

// Judge0 Language IDs
const LANGUAGE_IDS = {
  javascript: 63, // Node.js 18.15.0
  typescript: 74, // TypeScript 5.0.3
  python: 71,     // Python 3.11.2
  java: 62,       // Java (OpenJDK 13.0.1)
  c: 50,          // C (GCC 9.2.0)
  cpp: 54,        // C++ (GCC 9.2.0)
};

export const runCode = async (req, res) => {
  try {
    const { sourceCode, language } = req.body;

    if (!sourceCode) {
      return res.status(400).json({ message: 'Source code is required' });
    }

    const languageId = LANGUAGE_IDS[language.toLowerCase()];
    if (!languageId) {
      return res.status(400).json({ message: `Language '${language}' is not supported` });
    }

    // Prepare payload for Judge0
    const payload = {
      source_code: sourceCode,
      language_id: languageId,
      stdin: "", // Can be added later if needed
    };

    const options = {
      method: "POST",
      url: process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com/submissions",
      params: { base64_encoded: "false", wait: "true" },
      headers: {
        "content-type": "application/json",
        "Content-Type": "application/json",
        "X-RapidAPI-Key": process.env.JUDGE0_API_KEY,
        "X-RapidAPI-Host": process.env.JUDGE0_API_HOST || "judge0-ce.p.rapidapi.com",
      },
      data: payload,
    };

    const response = await axios.request(options);
    const result = response.data;

    // Normalize response for frontend
    // Judge0 returns: stdout, stderr, compile_output, status { id, description }
    
    // Check for compilation errors or runtime errors
    // Status ID 3 means "Accepted" (Success)
    
    let output = "";
    let isError = false;

    if (result.status.id === 3) {
      // Success
      output = result.stdout || "(No output)";
    } else {
      // Error (Compile error, runtime error, etc.)
      isError = true;
      output = result.compile_output || result.stderr || result.message || `Error: ${result.status.description}`;
    }

    res.json({
      output,
      isError,
      executionTime: result.time,
      memory: result.memory,
      status: result.status
    });

  } catch (error) {
    console.error('Judge0 Error:', error?.response?.data || error.message);
    res.status(500).json({ 
      message: 'Execution failed', 
      error: error?.response?.data?.message || error.message,
      hint: "Make sure JUDGE0_API_KEY is set in .env"
    });
  }
};
