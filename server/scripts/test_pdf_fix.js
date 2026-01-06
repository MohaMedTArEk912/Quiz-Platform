import * as pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test PDF parsing with Uint8Array conversion
async function testPdfParsing() {
    try {
        // Find a test PDF file (adjust path as needed)
        const testPdfPath = path.join(__dirname, '../uploads/CHAPTER-3-Security-Management-Concepts-and-Principles.pdf');
        
        if (!fs.existsSync(testPdfPath)) {
            console.log('❌ Test PDF not found at:', testPdfPath);
            console.log('Please upload a PDF file first to test.');
            return;
        }

        console.log('📄 Testing PDF parsing...');
        console.log('File:', testPdfPath);
        
        // Read the file as Buffer
        const dataBuffer = fs.readFileSync(testPdfPath);
        console.log('✅ File read successfully, size:', dataBuffer.length, 'bytes');
        
        // Convert Buffer to Uint8Array (this is the fix)
        const uint8Array = new Uint8Array(dataBuffer);
        console.log('✅ Converted to Uint8Array');
        
        // Parse PDF
        const pdfData = await pdfParse.default(uint8Array);
        console.log('✅ PDF parsed successfully!');
        console.log('📊 Pages:', pdfData.numpages);
        console.log('📝 Text length:', pdfData.text.length, 'characters');
        console.log('📖 First 200 characters:', pdfData.text.substring(0, 200));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testPdfParsing();
