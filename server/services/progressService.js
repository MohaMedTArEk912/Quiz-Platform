import { SkillTrackProgress } from '../models/SkillTrackProgress.js';
import { User } from '../models/User.js';
import { SkillTrack } from '../models/SkillTrack.js';

/**
 * Centrally manages skill track progress updates.
 * Updates both SkillTrackProgress (detailed tracking) and User (summary/cache) schemas.
 * Also handles unlocking logic.
 * 
 * @param {string} userId - The ID of the user
 * @param {string} trackId - The ID of the skill track
 * @param {string[]} completedModules - Array of completed module IDs
 * @param {string[]} unlockedModules - Array of unlocked module IDs
 * @returns {Promise<Object>} - The updated progress document
 */
export const updateSkillTrackProgress = async (userId, trackId, completedModules = null, unlockedModules = null) => {
    try {
        // 1. Fetch or Create specific progress doc
        let progress = await SkillTrackProgress.findOne({ userId, trackId });
        if (!progress) {
            progress = new SkillTrackProgress({ 
                userId, 
                trackId, 
                completedModules: completedModules || [], 
                unlockedModules: unlockedModules || [] 
            });
        }

        // 2. Apply updates if provided (merge or overwrite? -> Overwrite is safer for admin resets, specific checks for append)
        // For this helper, we assume the caller has determined the final state or we are appending.
        // Let's assume we want to SET state if provided, but if inputs are null, we leave them.
        
        let modulesChanged = false;

        if (completedModules !== null) {
            progress.completedModules = completedModules;
            modulesChanged = true;
        }

        if (unlockedModules !== null) {
            progress.unlockedModules = unlockedModules;
            modulesChanged = true;
        }

        // 3. Auto-unlock logic (Only if modules changed)
        if (modulesChanged) {
            const track = await SkillTrack.findOne({ trackId }).lean();
            if (track && track.modules) {
                 // Check if any newly completed modules trigger unlocks
                 // (Simplified sequential logic: if mod[i] complete, unlock mod[i+1])
                 track.modules.forEach((mod, index) => {
                     if (progress.completedModules.includes(mod.moduleId)) {
                         // Check next in sequence
                         if (index < track.modules.length - 1) {
                             const nextMod = track.modules[index + 1];
                             if (!progress.unlockedModules.includes(nextMod.moduleId)) {
                                 progress.unlockedModules.push(nextMod.moduleId);
                             }
                         }
                     }
                 });
                 // Deduplicate
                 progress.unlockedModules = [...new Set(progress.unlockedModules)];
            }
        }

        await progress.save();

        // 4. Sync to User Document
        const user = await User.findOne({ userId });
        if (user) {
            if (!user.skillTracks) user.skillTracks = [];
            
            const trackIndex = user.skillTracks.findIndex(t => t.trackId === trackId);
            
            const trackSummary = {
                trackId,
                completedModules: progress.completedModules,
                unlockedModules: progress.unlockedModules
            };

            if (trackIndex >= 0) {
                user.skillTracks[trackIndex] = trackSummary;
            } else {
                user.skillTracks.push(trackSummary);
            }
            
            user.markModified('skillTracks');
            await user.save();
        }

        return progress;
    } catch (error) {
        console.error('Error in updateSkillTrackProgress service:', error);
        throw error;
    }
};

/**
 * Mark a single module as complete and handle downstream unlocks.
 */
export const completeSpecificModule = async (userId, trackId, moduleId) => {
    const progress = await SkillTrackProgress.findOne({ userId, trackId });
    const currentCompleted = progress ? [...progress.completedModules] : [];
    const currentUnlocked = progress ? [...progress.unlockedModules] : ['mod_1']; // Default start

    if (!currentCompleted.includes(moduleId)) {
        currentCompleted.push(moduleId);
        // unlock logic handled in main update
        return await updateSkillTrackProgress(userId, trackId, currentCompleted, currentUnlocked);
    }
    return progress;
};

/**
 * Mark a sub-module as complete.
 * Optionally auto-marks the parent module as complete if all sub-modules are done.
 * 
 * @param {string} userId - User ID
 * @param {string} trackId - Track ID
 * @param {string} moduleId - Parent module ID
 * @param {string} subModuleId - Sub-module ID to mark complete
 * @returns {Promise<Object>} - Updated progress
 */
export const completeSubModule = async (userId, trackId, moduleId, subModuleId) => {
    try {
        // 1. Fetch or create progress doc
        let progress = await SkillTrackProgress.findOne({ userId, trackId });
        if (!progress) {
            progress = new SkillTrackProgress({
                userId,
                trackId,
                completedModules: [],
                unlockedModules: [moduleId], // Auto-unlock the module they are working on
                completedSubModules: []
            });
        }

        // 2. Create unique key for this submodule
        const subModuleKey = `${moduleId}:${subModuleId}`;

        // 3. Add to completedSubModules if not already present
        if (!progress.completedSubModules) {
            progress.completedSubModules = [];
        }
        
        if (!progress.completedSubModules.includes(subModuleKey)) {
            progress.completedSubModules.push(subModuleKey);
        }

        // 4. Check if ALL submodules for this module are now complete
        const track = await SkillTrack.findOne({ trackId }).lean();
        if (track) {
            const targetModule = track.modules?.find(m => m.moduleId === moduleId);
            if (targetModule && targetModule.subModules && targetModule.subModules.length > 0) {
                const allSubModuleIds = targetModule.subModules.map(s => s.id);
                const completedForThisModule = progress.completedSubModules
                    .filter(key => key.startsWith(`${moduleId}:`))
                    .map(key => key.split(':')[1]);

                const allSubsComplete = allSubModuleIds.every(id => completedForThisModule.includes(id));

                if (allSubsComplete && !progress.completedModules.includes(moduleId)) {
                    console.log(`🎉 All sub-modules complete for ${moduleId}, auto-completing module.`);
                    progress.completedModules.push(moduleId);

                    // Trigger unlock of next module
                    const moduleIndex = track.modules.findIndex(m => m.moduleId === moduleId);
                    if (moduleIndex !== -1 && moduleIndex < track.modules.length - 1) {
                        const nextModule = track.modules[moduleIndex + 1];
                        if (!progress.unlockedModules.includes(nextModule.moduleId)) {
                            progress.unlockedModules.push(nextModule.moduleId);
                        }
                    }
                }
            }
        }

        progress.lastAccessed = new Date();
        await progress.save();

        // 5. Sync to User Document
        const user = await User.findOne({ userId });
        if (user) {
            if (!user.skillTracks) user.skillTracks = [];
            
            const trackIndex = user.skillTracks.findIndex(t => t.trackId === trackId);
            
            const trackSummary = {
                trackId,
                completedModules: progress.completedModules,
                unlockedModules: progress.unlockedModules,
                completedSubModules: progress.completedSubModules
            };

            if (trackIndex >= 0) {
                user.skillTracks[trackIndex] = trackSummary;
            } else {
                user.skillTracks.push(trackSummary);
            }
            
            user.markModified('skillTracks');
            await user.save();
        }

        return progress;
    } catch (error) {
        console.error('Error in completeSubModule service:', error);
        throw error;
    }
};
