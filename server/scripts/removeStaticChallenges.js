import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { DailyChallenge } from '../models/DailyChallenge.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function removeStaticChallenges() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');

    // Find all daily challenges
    const challenges = await DailyChallenge.find({});
    console.log(`\nFound ${challenges.length} daily challenges in database:`);
    
    challenges.forEach(challenge => {
      console.log(`- ${new Date(challenge.date).toDateString()}: ${challenge.title}`);
    });

    // Remove all static challenges
    if (challenges.length > 0) {
      console.log('\nRemoving all static daily challenges...');
      const result = await DailyChallenge.deleteMany({});
      console.log(`✓ Removed ${result.deletedCount} daily challenges`);
    } else {
      console.log('\nNo challenges to remove.');
    }

    console.log('\nDone! Daily challenges will now be generated dynamically from available quizzes.');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

removeStaticChallenges();
