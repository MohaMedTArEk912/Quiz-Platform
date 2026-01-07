import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log("=== Gemini API Comprehensive Test ===\n");
console.log("API KEY exists:", !!process.env.GEMINI_API_KEY);
console.log("API KEY (first 20 chars):", process.env.GEMINI_API_KEY?.substring(0, 20) + "...\n");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function run() {
    try {
        // Test with the latest models that should definitely work
        const modelsToTest = [
            "gemini-2.0-flash-exp",
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro-latest",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-pro",
        ];
        
        console.log("--- Testing Models ---\n");
        
        for (const modelName of modelsToTest) {
            console.log(`Testing: ${modelName}`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Say 'Hello from Gemini!' if you're working correctly.");
                const response = await result.response;
                const text = response.text();
                console.log(`✅ SUCCESS: ${modelName}`);
                console.log(`   Response: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
                console.log();
                
                // If one works, we can stop
                console.log("\n🎉 Gemini API is working correctly!");
                console.log(`Working model: ${modelName}`);
                return;
            } catch (e) {
                console.log(`❌ FAILED: ${modelName}`);
                console.log(`   Error: ${e.message.split('\n')[0]}`);
                console.log();
            }
        }
        
        console.log("\n⚠️ All models failed. Please check:");
        console.log("1. Your API key is valid");
        console.log("2. Billing is enabled in Google Cloud Console");
        console.log("3. Gemini API is enabled in your project");
        
    } catch (e) {
        console.error("Fatal Script Error:", e);
    }
}

run();
