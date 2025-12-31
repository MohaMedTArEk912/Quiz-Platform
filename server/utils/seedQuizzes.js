import fs from 'fs';
import path from 'path';
import { Quiz } from '../models/Quiz.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedQuizzes() {
  try {
    // Assuming this file is in server/utils/
    // public is at ../../public ??
    // Original index.js was in server/, so public was ../public
    // server/utils/../.. is server/.. -> root.
    // So root/public. Correct.
    const quizzesDir = path.join(__dirname, '../../public/quizzes');
    
    // Check if directory exists
    if (!fs.existsSync(quizzesDir)) {
        console.warn('Quizzes directory not found for seeding:', quizzesDir);
        return;
    }

    const files = fs.readdirSync(quizzesDir).filter(file => file !== 'index.json' && file.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(quizzesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      try {
        const quiz = JSON.parse(content);
        // Upsert: Update if exists, Insert if not
        await Quiz.findOneAndUpdate(
          { id: quiz.id },
          quiz,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (err) {
        console.error(`Error parsing or saving ${file}:`, err);
      }
    }
    console.log('Quizzes seeded/updated successfully.');
  } catch (error) {
    console.error('Seeding error:', error);
  }
}
