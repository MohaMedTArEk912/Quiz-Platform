/**
 * API Retry Wrapper for Docker Deployment
 * Handles automatic retries with exponential backoff
 */

import { apiConfig } from './apiConfig';

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retryAttempts?: number;
}

/**
 * Sleep for a given number of milliseconds
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with timeout
 */
const fetchWithTimeout = (
  url: string,
  options: FetchOptions = {}
): Promise<Response> => {
  const timeout = options.timeout ?? apiConfig.timeout;

  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    fetch(url, {
      ...options,
      signal: controller.signal,
    })
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

/**
 * Retry a fetch with exponential backoff
 */
const retryWithBackoff = async (
  url: string,
  options: FetchOptions = {}
): Promise<Response> => {
  const maxAttempts = options.retryAttempts ?? apiConfig.retryAttempts;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      // Return successful responses (including 4xx/5xx to let caller handle)
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if it's the last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Calculate backoff delay
      const delay = apiConfig.retryDelay * Math.pow(apiConfig.retryBackoffMultiplier, attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError || new Error('Max retries exceeded');
};

/**
 * Fetch with automatic retry
 */
export const fetchWithRetry = async (
  urlPath: string,
  options: FetchOptions = {}
): Promise<Response> => {
  const primaryUrl = apiConfig.primary + urlPath;

  try {
    return await retryWithBackoff(primaryUrl, options);
  } catch (error) {
    throw new Error(`API request failed: ${(error as Error).message}`);
  }
};

/**
 * Get current API status
 */
export const getApiStatus = () => ({
  primary: {
    url: apiConfig.primary,
    healthy: true,
  },
});
