import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log("=== Discovering Available Gemini Models ===\n");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Comprehensive list of possible model names from documentation
const allPossibleModels = [
    // Gemini 2.0 models (latest)
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash-thinking-exp',
    'gemini-2.0-flash-thinking-exp-1219',
    
    // Gemini 1.5 models
    'gemini-1.5-flash',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash-8b-001',
    'gemini-1.5-flash-8b-exp-0827',
    'gemini-1.5-pro',
    'gemini-1.5-pro-001',
    'gemini-1.5-pro-002',
    'gemini-1.5-pro-exp-0801',
    
    // Gemini 1.0 models (legacy)
    'gemini-1.0-pro',
    'gemini-1.0-pro-001',
    'gemini-pro',
    'gemini-pro-vision',
    
    // Experimental versions
    'gemini-exp-1114',
    'gemini-exp-1121',
    'gemini-exp-1206',
];

async function testModelQuiet(modelName) {
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hi");
        await result.response;
        return { success: true, error: null };
    } catch (e) {
        const errorType = 
            e.message.includes('429') ? 'RATE_LIMIT' :
            e.message.includes('404') ? 'NOT_FOUND' :
            e.message.includes('403') ? 'AUTH_ERROR' :
            e.message.includes('400') ? 'BAD_REQUEST' :
            'UNKNOWN';
        return { success: false, error: errorType };
    }
}

async function run() {
    const results = {
        available: [],
        rateLimited: [],
        notFound: [],
        other: []
    };
    
    console.log(`Testing ${allPossibleModels.length} model names...\n`);
    
    for (let i = 0; i < allPossibleModels.length; i++) {
        const modelName = allPossibleModels[i];
        process.stdout.write(`[${i + 1}/${allPossibleModels.length}] ${modelName.padEnd(40)} `);
        
        const result = await testModelQuiet(modelName);
        
        if (result.success) {
            console.log('✅ AVAILABLE');
            results.available.push(modelName);
        } else if (result.error === 'RATE_LIMIT') {
            console.log('⏱️  RATE LIMITED (but exists!)');
            results.rateLimited.push(modelName);
        } else if (result.error === 'NOT_FOUND') {
            console.log('❌ Not Found');
            results.notFound.push(modelName);
        } else {
            console.log(`⚠️  ${result.error}`);
            results.other.push({ model: modelName, error: result.error });
        }
        
        // Small delay to avoid hammering the API
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY\n');
    
    if (results.available.length > 0) {
        console.log(`✅ AVAILABLE MODELS (${results.available.length}):`);
        results.available.forEach(m => console.log(`   - ${m}`));
        console.log();
    }
    
    if (results.rateLimited.length > 0) {
        console.log(`⏱️  RATE LIMITED BUT EXIST (${results.rateLimited.length}):`);
        results.rateLimited.forEach(m => console.log(`   - ${m}`));
        console.log('   Note: These models work but you hit quota limits');
        console.log();
    }
    
    if (results.other.length > 0) {
        console.log(`⚠️  OTHER ERRORS (${results.other.length}):`);
        results.other.forEach(({ model, error }) => console.log(`   - ${model} (${error})`));
        console.log();
    }
    
    console.log('='.repeat(60));
    
    if (results.available.length === 0 && results.rateLimited.length === 0) {
        console.log('\n❌ No working models found. Please check:');
        console.log('   1. API key validity');
        console.log('   2. Billing status');
        console.log('   3. API access permissions');
    } else {
        console.log(`\n🎉 Found ${results.available.length + results.rateLimited.length} accessible model(s)!`);
    }
}

run().catch(console.error);
