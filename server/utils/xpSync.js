import { Clan } from '../models/Clan.js';

export const syncClanXp = async (userId, xpAmount, clanId) => {
    if (!clanId || xpAmount <= 0) return;
    
    try {
        // OPTIMIZED: Use atomic update to prevent race conditions and improve performance.
        // 1. $inc totalXP: Atomic increment, safe for concurrent updates.
        // 2. $inc members.$.contribution: Updates specifically the matching member's contribution.
        // 3. updateOne: avoids fetching the entire document (memory efficient).
        
        await Clan.updateOne(
            { clanId: clanId, "members.userId": userId },
            { 
                $inc: { 
                    totalXP: xpAmount,
                    "members.$.contribution": xpAmount
                } 
            }
        );
        
    } catch (err) {
        console.error("Failed to sync clan XP:", err);
    }
};
