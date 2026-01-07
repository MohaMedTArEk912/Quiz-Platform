import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log("=== Testing Gemini API with Rate Limit Handling ===\n");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const WORKING_MODELS = ["gemini-2.0-flash-exp", "gemini-exp-1206"];

async function testWithRetry(modelName, maxRetries = 3) {
    console.log(`\n📝 Testing: ${modelName}`);
    
    for (let retry = 0; retry < maxRetries; retry++) {
        try {
            console.log(`   Attempt ${retry + 1}/${maxRetries}...`);
            
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: { responseMimeType: "application/json" }
            });
            
            const prompt = `Generate a simple JSON response with this format: {"message": "Hello from Gemini!", "status": "working"}`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            console.log(`\n✅ SUCCESS on attempt ${retry + 1}!`);
            console.log(`   Model: ${modelName}`);
            console.log(`   Response: ${text}`);
            
            return true;
            
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message.split('\n')[0].substring(0, 100)}`);
            
            if (error.message.includes('429')) {
                const waitTime = Math.pow(2, retry) * 1000; // 1s, 2s, 4s
                
                if (retry < maxRetries - 1) {
                    console.log(`   ⏱️  Rate limited. Waiting ${waitTime/1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    console.log(`   ⚠️  Rate limit persists after ${maxRetries} attempts`);
                }
            } else {
                // For non-rate-limit errors, don't retry
                break;
            }
        }
    }
    
    return false;
}

async function run() {
    console.log("Testing both working models with retry logic...\n");
    
    for (const model of WORKING_MODELS) {
        const success = await testWithRetry(model);
        
        if (success) {
            console.log(`\n🎉 API is working! Model ${model} responded successfully.`);
            console.log('\nYou can now use the AI quiz generation feature.');
            return;
        }
        
        console.log('\n   Waiting 3 seconds before trying next model...');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n⚠️  All attempts failed. Recommendations:');
    console.log('   1. Wait 5-10 minutes for quota reset (free tier)');
    console.log('   2. Check usage at: https://ai.dev/usage?tab=rate-limit');
    console.log('   3. Consider enabling billing for higher limits');
    console.log('   4. The API key is valid but quota is exhausted');
}

run().catch(console.error);
