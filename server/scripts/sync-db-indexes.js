import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import all models to register their schemas
import '../models/User.js';
import '../models/Quiz.js';
import '../models/Attempt.js';
import '../models/Badge.js';
import '../models/BadgeNode.js';
import '../models/BadgeTree.js';
import '../models/Challenge.js';
import '../models/Clan.js';
import '../models/DailyChallenge.js';
import '../models/ShopItem.js';
import '../models/SkillTrack.js';
import '../models/SkillTrackProgress.js';
import '../models/StudyCard.js';
import '../models/Tournament.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('ERROR: MONGODB_URI is missing in .env');
  process.exit(1);
}

async function syncIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected.');

    const models = mongoose.modelNames();
    console.log(`Found ${models.length} models to sync:`, models);

    for (const modelName of models) {
      console.log(`Syncing indexes for ${modelName}...`);
      const Model = mongoose.model(modelName);
      await Model.syncIndexes();
      console.log(`✓ ${modelName} synced.`);
    }

    console.log('All indexes synced successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing indexes:', error);
    process.exit(1);
  }
}

syncIndexes();
