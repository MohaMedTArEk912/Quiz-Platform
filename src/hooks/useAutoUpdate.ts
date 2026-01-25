/**
 * Auto Update Hook
 * Detects when a new version is deployed and automatically refreshes
 * or notifies the user about available updates
 */

import { useEffect, useState } from 'react';

interface UpdateState {
  updateAvailable: boolean;
  isChecking: boolean;
  lastChecked: number;
}

/**
 * Checks if a new version is available by comparing version hashes
 */
const checkForNewVersion = async (): Promise<boolean> => {
  try {
    // Get stored version - initialize if not set
    let storedVersion = localStorage.getItem('app-version');
    if (!storedVersion) {
      // First time - extract from current page and store
      const versionMatch = document.querySelector('meta[name="app-version"]')?.getAttribute('content');
      if (versionMatch) {
        localStorage.setItem('app-version', versionMatch);
        console.log('[AutoUpdate] Initialized version:', versionMatch);
      }
      return false; // Don't reload on first run
    }

    // Fetch index.html with cache busting to get latest version
    const response = await fetch('/index.html?_t=' + Date.now(), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

    if (!response.ok) return false;

    const html = await response.text();
    
    // Extract version hash from meta tag (added during build)
    const versionMatch = html.match(/<meta name="app-version" content="([^"]+)"/);
    const newVersion = versionMatch ? versionMatch[1] : '';

    // Only return true if versions are DIFFERENT
    if (newVersion && storedVersion && newVersion !== storedVersion) {
      console.log('[AutoUpdate] New version detected:', { current: storedVersion, new: newVersion });
      return true;
    }

    return false;
  } catch (error) {
    console.error('[AutoUpdate] Error checking for updates:', error);
    return false;
  }
};

/**
 * Clears all caches to ensure fresh content
 */
const clearAllCaches = async (): Promise<void> => {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('[AutoUpdate] Caches cleared');
    }
  } catch (error) {
    console.error('[AutoUpdate] Error clearing caches:', error);
  }
};

/**
 * Hook that monitors for new deployments and auto-refreshes
 * @param checkIntervalMs - How often to check for updates (default: 60s)
 * @param autoRefresh - Automatically refresh when update detected (default: true)
 * @returns Current update state
 */
export const useAutoUpdate = (
  checkIntervalMs: number = 60000,
  autoRefresh: boolean = true
) => {
  const [state, setState] = useState<UpdateState>({
    updateAvailable: false,
    isChecking: false,
    lastChecked: 0,
  });

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const checkUpdate = async () => {
      setState(prev => ({ ...prev, isChecking: true }));

      try {
        const updateAvailable = await checkForNewVersion();

        setState(prev => ({
          ...prev,
          updateAvailable,
          isChecking: false,
          lastChecked: Date.now(),
        }));

        if (updateAvailable && autoRefresh) {
          console.log('[AutoUpdate] Auto-refreshing to new version...');
          
          // Clear caches before refresh
          await clearAllCaches();

          // Unregister service workers to force reload
          if ('serviceWorker' in navigator) {
            try {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of registrations) {
                await registration.unregister();
              }
            } catch (error) {
              console.error('[AutoUpdate] Error unregistering service workers:', error);
            }
          }

          // Hard refresh to load new version
          window.location.reload();
        }
      } catch (error) {
        console.error('[AutoUpdate] Error during version check:', error);
        setState(prev => ({ ...prev, isChecking: false }));
      }
    };

    // Check on mount
    checkUpdate();

    // Then check periodically
    intervalId = setInterval(checkUpdate, checkIntervalMs);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [checkIntervalMs, autoRefresh]);

  return state;
};

/**
 * Hook for manual update control
 * Useful if you want to show a prompt instead of auto-refreshing
 */
export const useUpdateCheck = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkForUpdate = async () => {
    const available = await checkForNewVersion();
    setUpdateAvailable(available);
    return available;
  };

  const refreshApp = async () => {
    await clearAllCaches();

    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      } catch (error) {
        console.error('[AutoUpdate] Error unregistering service workers:', error);
      }
    }

    window.location.reload();
  };

  return {
    updateAvailable,
    checkForUpdate,
    refreshApp,
  };
};
