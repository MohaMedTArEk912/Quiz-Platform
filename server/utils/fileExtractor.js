import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lazy load extractor for PPTX
let pptxExtractor = null;

const getPptxExtractor = async () => {
    if (!pptxExtractor) {
        try {
            const { getTextExtractor } = await import('office-text-extractor');
            pptxExtractor = getTextExtractor();
        } catch (error) {
            console.warn('Failed to initialize text extractor:', error.message);
            return { 
                extractText: async () => { 
                    throw new Error(`Text extraction unavailable: ${error.message}`); 
                } 
            };
        }
    }
    return pptxExtractor;
};

export const extractTextFromFile = async (fileObj) => {
    const filePath = fileObj.path;
    let text = '';
    const MAX_EXTRACTION_TIME = 30000; // 30 second timeout
    
    try {
        // Validate file exists and is readable
        if (!fs.existsSync(filePath)) {
            throw new Error('Uploaded file not found');
        }
        
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
            throw new Error('Uploaded file is empty');
        }
        
        // Process based on MIME type
        if (fileObj.mimetype === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            
            // Polyfill DOMMatrix for pdfjs-dist / pdf-parse if needed
            if (typeof DOMMatrix === 'undefined') {
                global.DOMMatrix = class DOMMatrix {
                    constructor() {
                        this.a = 1; this.b = 0; this.c = 0; this.d = 1;
                        this.e = 0; this.f = 0;
                    }
                    setMatrixValue(str) {} 
                    multiply(m) { return this; }
                    translate(x, y) { return this; }
                    scale(x, y) { return this; }
                    rotate(angle) { return this; }
                    toString() { return 'matrix(1, 0, 0, 1, 0, 0)'; }
                };
            }

            // Lazy load pdf-parse
            const pdfParseLib = require('pdf-parse');
            const PDFParseEntity = pdfParseLib.PDFParse || pdfParseLib;

            // unified handler
            try {
                const instance = new PDFParseEntity(dataBuffer);
                if (instance instanceof Promise || (typeof instance === 'object' && typeof instance.then === 'function')) {
                    const data = await instance;
                    text = data.text;
                } else if (instance && typeof instance.getText === 'function') {
                    const result = await instance.getText();
                    text = result.text;
                } else {
                    const instanceV2 = new PDFParseEntity({ data: dataBuffer });
                    if (instanceV2 && typeof instanceV2.getText === 'function') {
                         const result = await instanceV2.getText();
                         text = result.text;
                    } else {
                        throw new Error('Unrecognized PDF parser API');
                    }
                }
            } catch (instantiationError) {
                console.warn('PDF instantiation with buffer failed, trying object config:', instantiationError.message);
                const instanceV2 = new PDFParseEntity({ data: dataBuffer });
                text = (await instanceV2.getText()).text;
            }

        } else if (fileObj.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
            const extractor = await getPptxExtractor();
            text = await Promise.race([
                extractor.extractText({ input: filePath, type: 'file' }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('PPTX extraction timeout')), MAX_EXTRACTION_TIME)
                )
            ]);
        } else if (fileObj.mimetype === 'text/plain' || fileObj.mimetype === 'text/markdown') {
            text = fs.readFileSync(filePath, 'utf8');
        } else {
            throw new Error(`Unsupported file type: ${fileObj.mimetype}`);
        }
        
        if (!text || !text.trim()) {
            throw new Error('No text extracted from file');
        }
        
        return text;

    } finally {
        // We do NOT delete the file here because the caller might need it? 
        // Actually, for temporary uploads, we SHOULD delete it.
        // But let's check if the caller expects to reuse the path.
        // In this architecture, uploads are likely in a temp dir.
        // I'll leave the deletion to the caller or add a flag. 
        // For safety/consistency with previous code, I'll delete it if it's a temp upload.
        // But strictly speaking, a utility should probably just extract. 
        // The previous code had `finally { fs.unlinkSync(filePath) }`.
        
        // I will NOT delete it here to keep the utility pure. The caller should cleanup.
    }
};
