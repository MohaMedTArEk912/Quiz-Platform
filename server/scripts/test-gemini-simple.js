import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log("=== Simple Gemini API Test ===\n");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function testModel(modelName) {
    console.log(`\n📝 Testing model: ${modelName}`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        console.log("   Sending prompt...");
        const result = await model.generateContent("Hello! Please respond with 'Gemini API is working!'");
        
        console.log("   Getting response...");
        const response = await result.response;
        const text = response.text();
        
        console.log(`\n✅ SUCCESS!`);
        console.log(`   Model: ${modelName}`);
        console.log(`   Response: ${text}`);
        
        return true;
    } catch (e) {
        console.log(`\n❌ FAILED`);
        console.log(`   Error Type: ${e.message.includes('429') ? 'RATE LIMIT' : e.message.includes('404') ? 'MODEL NOT FOUND' : e.message.includes('403') ? 'AUTHENTICATION' : 'UNKNOWN'}`);
        console.log(`   Details: ${e.message.split('\n')[0].substring(0, 150)}`);
        
        if (e.message.includes('429')) {
            console.log(`   Note: You've exceeded your quota. Wait a moment or check billing.`);
        }
        
        return false;
    }
}

async function run() {
    // Try the most common working models
    const modelsToTry = [
        'gemini-1.5-flash-8b',
        'gemini-2.0-flash-exp',
        'models/gemini-2.0-flash-exp',  // Try with models/ prefix
        'models/gemini-1.5-flash',
    ];
    
    for (const model of modelsToTry) {
        const success = await testModel(model);
        if (success) {
            console.log(`\n🎉 Found working model: ${model}`);
            break;
        }
        
        // Wait 2 seconds between attempts to avoid rate limiting
        console.log('   Waiting 2 seconds before next attempt...');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

run().catch(console.error);
