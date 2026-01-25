/**
 * API Configuration with Fallback Support
 * Provides primary (Koyeb) and fallback (Vercel) API URLs
 * with configurable retry behavior and health monitoring
 */

export interface ApiConfig {
  primary: string;
  fallback: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  retryBackoffMultiplier: number;
  healthCheckInterval: number;
}

const stripTrailingSlash = (value: string) =>
  value.endsWith('/') ? value.slice(0, -1) : value;

const resolvePrimaryUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (envUrl) {
    const normalized = stripTrailingSlash(envUrl);
    // Prevent shipping a localhost URL to production builds
    if (!isLocalhost && normalized.includes('localhost')) {
      return 'https://profitable-starr-mohamedtarek-27df73a5.koyeb.app/api';
    }
    return normalized;
  }

  const localDefault = 'http://localhost:5000/api';
  const hostedDefault = 'https://profitable-starr-mohamedtarek-27df73a5.koyeb.app/api';

  // If on production but hostname matches the backend (Koyeb), use relative path
  if (!isLocalhost && hostname.includes('koyeb.app')) {
    return '/api';
  }

  return isLocalhost ? localDefault : hostedDefault;
};

const resolveFallbackUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_FALLBACK_URL;
  
  if (envUrl) {
    return stripTrailingSlash(envUrl);
  }

  // Default fallback to Vercel deployment
  return 'https://thequizplatform.vercel.app/api';
};

export const apiConfig: ApiConfig = {
  primary: resolvePrimaryUrl(),
  fallback: resolveFallbackUrl(),
  timeout: import.meta.env.VITE_API_TIMEOUT ? parseInt(import.meta.env.VITE_API_TIMEOUT) : 10000, // 10s
  retryAttempts: import.meta.env.VITE_API_RETRY_ATTEMPTS ? parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS) : 3,
  retryDelay: import.meta.env.VITE_API_RETRY_DELAY ? parseInt(import.meta.env.VITE_API_RETRY_DELAY) : 1000, // 1s
  retryBackoffMultiplier: import.meta.env.VITE_API_RETRY_BACKOFF ? parseFloat(import.meta.env.VITE_API_RETRY_BACKOFF) : 2,
  healthCheckInterval: import.meta.env.VITE_API_HEALTH_CHECK_INTERVAL ? parseInt(import.meta.env.VITE_API_HEALTH_CHECK_INTERVAL) : 30000, // 30s
};

/**
 * API Health Status Tracker
 * Tracks which endpoints are currently healthy
 */
export class ApiHealthStatus {
  private primaryHealthy = true;
  private fallbackHealthy = true;
  private lastPrimaryCheck = Date.now();
  private lastFallbackCheck = Date.now();
  private primaryFailureCount = 0;
  private fallbackFailureCount = 0;
  private readonly failureThreshold = 3; // Require 3 consecutive failures before marking unhealthy

  isPrimaryHealthy(): boolean {
    return this.primaryHealthy;
  }

  isFallbackHealthy(): boolean {
    return this.fallbackHealthy;
  }

  recordPrimarySuccess(): void {
    this.primaryHealthy = true;
    this.primaryFailureCount = 0;
    this.lastPrimaryCheck = Date.now();
  }

  recordPrimaryFailure(): void {
    this.primaryFailureCount++;
    if (this.primaryFailureCount >= this.failureThreshold) {
      this.primaryHealthy = false;
    }
    this.lastPrimaryCheck = Date.now();
  }

  recordFallbackSuccess(): void {
    this.fallbackHealthy = true;
    this.fallbackFailureCount = 0;
    this.lastFallbackCheck = Date.now();
  }

  recordFallbackFailure(): void {
    this.fallbackFailureCount++;
    if (this.fallbackFailureCount >= this.failureThreshold) {
      this.fallbackHealthy = false;
    }
    this.lastFallbackCheck = Date.now();
  }

  reset(): void {
    this.primaryHealthy = true;
    this.fallbackHealthy = true;
    this.primaryFailureCount = 0;
    this.fallbackFailureCount = 0;
  }

  getStatus() {
    return {
      primary: {
        healthy: this.primaryHealthy,
        failureCount: this.primaryFailureCount,
        lastCheck: this.lastPrimaryCheck,
      },
      fallback: {
        healthy: this.fallbackHealthy,
        failureCount: this.fallbackFailureCount,
        lastCheck: this.lastFallbackCheck,
      },
    };
  }
}

export const apiHealthStatus = new ApiHealthStatus();
