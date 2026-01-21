import { User } from '../models/User.js';
import { SkillTrackProgress } from '../models/SkillTrackProgress.js';

/**
 * Fetches the user document and enriches it with:
 * 1. Fresh SkillTrackProgress data (source of truth for progress)
 * 2. Calculated Rank
 * 
 * @param {string} userId 
 * @returns {Promise<Object|null>} Enriched user object or null
 */
export const getEnrichedUser = async (userId) => {
    try {
        const user = await User.findOne({ userId }).lean();
        if (!user) return null;

        // Fetch latest skill tracks to ensure UI has the source of truth
        // User.skillTracks array is a cache that might be slightly stale or less detailed
        const skillTracks = await SkillTrackProgress.find({ userId }).lean();

        // Calculate rank efficiently
        // Note: For very large datasets, this count should be cached or approximated
        const rank = await User.countDocuments({ totalScore: { $gt: user.totalScore || 0 } }) + 1;

        return {
            ...user,
            skillTracks, // Override with fresh data
            rank
        };
    } catch (error) {
        console.error('Error in getEnrichedUser:', error);
        throw error;
    }
};
