import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log("Checking Gemini API Models...");
console.log("API KEY exists:", !!process.env.GEMINI_API_KEY);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function run() {
    try {
        // 1. List Models
        console.log("\n--- Listing Available Models ---");
        // Note: listModels is invalid on the instance directly in some versions, it's usually on the class or via valid model? 
        // Actually it's unlikely this method exists on the client instance in this SDK version?
        // Wait, standard way to list models in node SDK?
        // It seems getGenerativeModel is the main entry. 
        // There isn't a direct 'listModels' helper on the client instance in some versions?
        // Let's check documentation or try the model manager if available
        
        // Actually, checking the docs for 0.21.0+:
        // There is no direct listModels() on GoogleGenerativeAI instance often?
        // Wait, usually it is: 
        // const genAI = new GoogleGenerativeAI(API_KEY);
        // const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Let's just try to generate content with specific models and see the precise error for each.
        
        const modelsToTest = [
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-1.0-pro", 
            "gemini-pro"
        ];
        
        for (const modelName of modelsToTest) {
            console.log(`\nTesting: ${modelName}`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello, are you working?");
                const response = await result.response;
                console.log(`✅ SUCCESS: ${modelName}`);
            } catch (e) {
                console.log(`❌ FAILED: ${modelName}`);
                console.log(`   Error: ${e.message}`);
                // console.log(JSON.stringify(e, null, 2));
            }
        }
        
    } catch (e) {
        console.error("Fatal Script Error:", e);
    }
}

run();
