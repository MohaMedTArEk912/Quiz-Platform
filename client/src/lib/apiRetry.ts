/**
 * API Retry Wrapper with Fallback Support
 * Handles automatic retries with exponential backoff
 * and fallback to secondary API endpoint
 */

import { apiConfig, apiHealthStatus } from './apiConfig';

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retryAttempts?: number;
  skipFallback?: boolean;
}

interface FetchAttemptResult {
  response?: Response;
  error?: Error;
  url: string;
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
  options: RequestInit & { timeout?: number }
): Promise<Response> => {
  const timeout = options.timeout || apiConfig.timeout;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
};

/**
 * Attempt a single fetch request
 */
const attemptFetch = async (
  url: string,
  options: FetchOptions
): Promise<FetchAttemptResult> => {
  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      timeout: options.timeout,
    });
    return { response, url };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
      url,
    };
  }
};

/**
 * Retry a single URL with exponential backoff
 */
const retryWithBackoff = async (
  url: string,
  options: FetchOptions,
  isHealthy: boolean
): Promise<FetchAttemptResult> => {
  const maxAttempts = options.retryAttempts ?? apiConfig.retryAttempts;
  let lastError: Error | undefined;

  // Skip retries if endpoint is known to be unhealthy
  const attempts = isHealthy ? maxAttempts : 1;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = await attemptFetch(url, options);

    if (result.response) {
      return result;
    }

    lastError = result.error;

    // Don't sleep after the last attempt
    if (attempt < attempts - 1) {
      const delay =
        apiConfig.retryDelay *
        Math.pow(apiConfig.retryBackoffMultiplier, attempt);
      await sleep(delay);
    }
  }

  return {
    error: lastError || new Error('Unknown error'),
    url,
  };
};

/**
 * Fetch with automatic fallback to secondary API
 * Tries primary endpoint first, falls back to secondary on failure
 */
export const fetchWithFallback = async (
  urlPath: string,
  options: FetchOptions = {}
): Promise<Response> => {
  const primaryUrl = apiConfig.primary + urlPath;
  const fallbackUrl = apiConfig.fallback + urlPath;
  const skipFallback = options.skipFallback ?? false;

  // Try primary endpoint first
  const primaryResult = await retryWithBackoff(
    primaryUrl,
    options,
    apiHealthStatus.isPrimaryHealthy()
  );

  if (primaryResult.response) {
    apiHealthStatus.recordPrimarySuccess();
    return primaryResult.response;
  }

  apiHealthStatus.recordPrimaryFailure();

  // If we should skip fallback or primary and fallback are the same, return error
  if (skipFallback || primaryUrl === fallbackUrl) {
    throw primaryResult.error || new Error('Failed to fetch from primary API');
  }

  // Try fallback endpoint
  const fallbackResult = await retryWithBackoff(
    fallbackUrl,
    options,
    apiHealthStatus.isFallbackHealthy()
  );

  if (fallbackResult.response) {
    apiHealthStatus.recordFallbackSuccess();
    
    // Log that we're using fallback API (helpful for debugging)
    console.warn('Using fallback API endpoint due to primary failure:', {
      path: urlPath,
      primaryUrl,
      fallbackUrl,
    });

    return fallbackResult.response;
  }

  apiHealthStatus.recordFallbackFailure();

  // Both endpoints failed
  throw new Error(
    `Failed to fetch from both primary (${primaryUrl}) and fallback (${fallbackUrl}) APIs. ` +
    `Primary error: ${primaryResult.error?.message || 'Unknown'}. ` +
    `Fallback error: ${fallbackResult.error?.message || 'Unknown'}`
  );
};

/**
 * Get current API status
 */
export const getApiStatus = () => {
  return {
    config: apiConfig,
    health: apiHealthStatus.getStatus(),
    currentPrimary: apiConfig.primary,
    currentFallback: apiConfig.fallback,
  };
};
