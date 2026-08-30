import { api } from './api';
import type { AttemptData } from '../types';

const OFFLINE_ATTEMPTS_KEY = 'pending_offline_attempts';

/**
 * Get list of pending offline attempts from localStorage.
 */
export const getPendingAttempts = (): AttemptData[] => {
    try {
        const raw = localStorage.getItem(OFFLINE_ATTEMPTS_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        console.warn('Failed to parse offline attempts:', e);
        return [];
    }
};

/**
 * Save a new pending attempt into offline storage.
 */
export const savePendingAttempt = (attempt: AttemptData): void => {
    try {
        const existing = getPendingAttempts();
        // Prevent duplicates
        const filtered = existing.filter(a => a.attemptId !== attempt.attemptId);
        filtered.push(attempt);
        localStorage.setItem(OFFLINE_ATTEMPTS_KEY, JSON.stringify(filtered));
        console.log(`📦 Attempt saved locally to offline queue (Total pending: ${filtered.length})`);
    } catch (e) {
        console.error('Failed to save attempt to offline storage:', e);
    }
};

/**
 * Remove a successfully synced attempt from offline storage.
 */
export const removePendingAttempt = (attemptId: string): void => {
    try {
        const existing = getPendingAttempts();
        const updated = existing.filter(a => a.attemptId !== attemptId);
        localStorage.setItem(OFFLINE_ATTEMPTS_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to remove pending attempt:', e);
    }
};

/**
 * Flush and sync all pending offline attempts with the server.
 */
export const syncPendingAttempts = async (): Promise<number> => {
    if (!navigator.onLine) return 0;

    const pending = getPendingAttempts();
    if (pending.length === 0) return 0;

    console.log(`🔄 Attempting to sync ${pending.length} offline quiz attempt(s)...`);
    let syncedCount = 0;

    for (const attempt of pending) {
        try {
            await api.saveAttempt(attempt);
            removePendingAttempt(attempt.attemptId);
            syncedCount++;
            console.log(`✅ Successfully synced offline attempt: ${attempt.attemptId}`);
        } catch (err) {
            console.warn(`⚠️ Could not sync attempt ${attempt.attemptId}, will retry later:`, err);
        }
    }

    return syncedCount;
};

/**
 * Try saving attempt to server; if offline or network drops, queue it locally.
 */
export const saveAttemptWithOfflineFallback = async (attempt: AttemptData) => {
    if (!navigator.onLine) {
        savePendingAttempt(attempt);
        return {
            success: true,
            isOfflineQueued: true,
            message: 'Saved locally in offline mode'
        };
    }

    try {
        const res = await api.saveAttempt(attempt);
        // Also trigger sync for any other pending attempts in background
        syncPendingAttempts().catch(console.warn);
        return res;
    } catch (err: unknown) {
        const error = err as { message?: string };
        const isNetworkError = !navigator.onLine ||
            (typeof error?.message === 'string' && (
                error.message.toLowerCase().includes('network') ||
                error.message.toLowerCase().includes('failed to fetch') ||
                error.message.toLowerCase().includes('timeout')
            ));

        if (isNetworkError) {
            savePendingAttempt(attempt);
            return {
                success: true,
                isOfflineQueued: true,
                message: 'Connection dropped. Attempt saved locally and will auto-sync.'
            };
        }
        throw err;
    }
};

/**
 * Initialize automatic background sync when browser comes online.
 */
export const initOfflineSyncListener = (onSyncComplete?: (count: number) => void) => {
    if (typeof window === 'undefined') return;

    const handleOnline = async () => {
        console.log('🌐 Internet connection restored. Triggering offline sync...');
        const count = await syncPendingAttempts();
        if (count > 0 && onSyncComplete) {
            onSyncComplete(count);
        }
    };

    window.addEventListener('online', handleOnline);

    // Initial check on load
    if (navigator.onLine) {
        syncPendingAttempts().catch(console.warn);
    }

    return () => {
        window.removeEventListener('online', handleOnline);
    };
};
