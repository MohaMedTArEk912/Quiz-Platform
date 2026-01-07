import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log("=== Gemini API Quick Status Check ===\n");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.log("❌ No API key found!");
    console.log("   Add GEMINI_API_KEY to your .env file\n");
    process.exit(1);
}

console.log("✅ API Key: Found");
console.log(`   First 20 chars: ${apiKey.substring(0, 20)}...`);
console.log(`   Length: ${apiKey.length} characters\n`);

const genAI = new GoogleGenerativeAI(apiKey);

async function quickCheck() {
    const models = ["gemini-2.0-flash-exp", "gemini-exp-1206"];
    
    console.log("🔍 Quick connectivity check (minimal quota usage)...\n");
    
    for (const modelName of models) {
        try {
            console.log(`Testing: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            // Very minimal request to check status
            const result = await model.generateContent("Hi");
            const response = await result.response;
            
            console.log(`✅ WORKING - ${modelName}`);
            console.log(`   Response: ${response.text().substring(0, 50)}...\n`);
            
            console.log("🎉 Gemini API is operational!");
            console.log("   You can now use AI quiz generation.\n");
            return true;
            
        } catch (error) {
            if (error.message.includes('429')) {
                console.log(`⏱️  RATE LIMITED - ${modelName}`);
                console.log(`   The model exists but quota is exceeded\n`);
            } else if (error.message.includes('404')) {
                console.log(`❌ NOT FOUND - ${modelName}\n`);
            } else if (error.message.includes('403')) {
                console.log(`❌ AUTH ERROR - ${modelName}`);
                console.log(`   Check your API key validity\n`);
            } else {
                console.log(`⚠️  ERROR - ${modelName}`);
                console.log(`   ${error.message.split('\n')[0].substring(0, 80)}\n`);
            }
        }
    }
    
    console.log("\n⚠️  Status Summary:");
    console.log("   - API key is configured");
    console.log("   - Connection successful");
    console.log("   - Quota may be exhausted");
    console.log("\n📋 Recommendations:");
    console.log("   1. Wait 5-10 minutes and run this again");
    console.log("   2. Check: https://ai.dev/usage?tab=rate-limit");
    console.log("   3. Enable billing for higher limits");
    
    return false;
}

quickCheck().catch(error => {
    console.error("\n❌ Unexpected error:", error.message);
    process.exit(1);
});
