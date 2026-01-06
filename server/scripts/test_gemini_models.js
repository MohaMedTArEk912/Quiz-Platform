import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust path to .env file in server root
dotenv.config({ path: path.join(__dirname, '../../.env') });


async function listAvailableModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API KEY found!");
    return;
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    console.log("Fetching models from:", url.replace(apiKey, 'HIDDEN_KEY'));
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
        console.error("API Error:", data.error);
        return;
    }
    
    if (data.models) {
        console.log("Available Models:");
        data.models.forEach(m => {
            if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                 console.log(`- ${m.name}`);
            }
        });
    } else {
        console.log("No models returned or unexpected format:", data);
    }
    
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

listAvailableModels();

