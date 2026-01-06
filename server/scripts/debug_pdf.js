import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
    const pdfParse = require('pdf-parse');
    console.log('--- Checking properties ---');
    console.log('pdfParse.PDFParse type:', typeof pdfParse.PDFParse);
    console.log('pdfParse.PDFParse toString:', pdfParse.PDFParse ? pdfParse.PDFParse.toString().substring(0, 100) : 'N/A');
    
    // Check if it's the main function we expect
    // The main function usually takes (dataBuffer, options)
    
} catch (e) {
    console.error('Import failed:', e);
}
