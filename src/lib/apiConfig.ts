/**
 * API Configuration for Docker Deployment
 * Uses relative path to connect to backend on same host
 */

export interface ApiConfig {
  primary: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  retryBackoffMultiplier: number;
}

export const apiConfig: ApiConfig = {
  primary: '/api', // Relative path - works for Docker, Hugging Face, and any same-origin deployment
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  retryBackoffMultiplier: 2,
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
