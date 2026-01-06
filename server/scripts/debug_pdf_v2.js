import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import path from 'path';

console.log('--- Debugging pdf-parse v2 ---');
console.log('PDFParse is:', PDFParse);

// We need a dummy PDF buffer to test if possible, or just inspect prototype
const dummyPdf = Buffer.from('%PDF-1.7\n%\n1 0 obj\n<<...>>\nendobj\ntrailer\n<<>>\n%%EOF');

try {
    const parser = new PDFParse(dummyPdf);
    console.log('Instance created.');
    console.log('Instance keys:', Object.keys(parser));
    console.log('Prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
    
    // Check if it has a specific method
    if (typeof parser.extractText === 'function') console.log('Has extractText');
    if (typeof parser.text === 'function') console.log('Has text() method');
    
} catch (e) {
    console.error('Instantiation failed:', e);
}
