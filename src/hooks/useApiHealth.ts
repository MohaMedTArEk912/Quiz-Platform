/**
 * API Health Check Hook
 * Monitors the health of primary and fallback APIs
 * and provides real-time status information
 */

import { useEffect, useState, useRef } from 'react';
import { apiConfig, apiHealthStatus } from '../lib/apiConfig';
import { getApiStatus } from '../lib/apiRetry';

export interface ApiHealthInfo {
  primary: {
    healthy: boolean;
    failureCount: number;
    lastCheck: number;
    responseTime?: number;
  };
  fallback: {
    healthy: boolean;
    failureCount: number;
    lastCheck: number;
    responseTime?: number;
  };
  isUsingFallback: boolean;
}

/**
 * Hook to monitor API health status
 * @param intervalMs - Interval between health checks in milliseconds (default: 30s)
 * @returns Current API health status and utilities
 */
export const useApiHealth = (intervalMs: number = apiConfig.healthCheckInterval) => {
  const [health, setHealth] = useState<ApiHealthInfo>(() => ({
    primary: {
      healthy: apiHealthStatus.isPrimaryHealthy(),
      failureCount: 0,
      lastCheck: Date.now(),
    },
    fallback: {
      healthy: apiHealthStatus.isFallbackHealthy(),
      failureCount: 0,
      lastCheck: Date.now(),
    },
    isUsingFallback: false,
  }));

  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Perform health check for an endpoint
  const checkEndpointHealth = async (
    url: string,
    isFallback: boolean
  ): Promise<{ healthy: boolean; responseTime: number }> => {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for health check

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const healthy = response.ok || response.status < 500;

      if (isFallback) {
        if (healthy) {
          apiHealthStatus.recordFallbackSuccess();
        } else {
          apiHealthStatus.recordFallbackFailure();
        }
      } else {
        if (healthy) {
          apiHealthStatus.recordPrimarySuccess();
        } else {
          apiHealthStatus.recordPrimaryFailure();
        }
      }

      return { healthy, responseTime };
    } catch (error) {
      if (isFallback) {
        apiHealthStatus.recordFallbackFailure();
      } else {
        apiHealthStatus.recordPrimaryFailure();
      }

      return {
        healthy: false,
        responseTime: Date.now() - startTime,
      };
    }
  };

  // Run health checks
  const runHealthChecks = async () => {
    const primaryUrl = apiConfig.primary + '/health-check';
    const fallbackUrl = apiConfig.fallback + '/health-check';

    const [primaryResult, fallbackResult] = await Promise.all([
      checkEndpointHealth(primaryUrl, false),
      apiConfig.primary !== apiConfig.fallback
        ? checkEndpointHealth(fallbackUrl, true)
        : Promise.resolve({ healthy: true, responseTime: 0 }),
    ]);

    setHealth({
      primary: {
        healthy: primaryResult.healthy,
        failureCount: apiHealthStatus.getStatus().primary.failureCount,
        lastCheck: Date.now(),
        responseTime: primaryResult.responseTime,
      },
      fallback: {
        healthy: fallbackResult.healthy,
        failureCount: apiHealthStatus.getStatus().fallback.failureCount,
        lastCheck: Date.now(),
        responseTime: fallbackResult.responseTime,
      },
      isUsingFallback: !primaryResult.healthy && fallbackResult.healthy,
    });
  };

  // Initialize health checks
  useEffect(() => {
    // Run initial health check
    runHealthChecks();

    // Set up periodic health checks
    intervalIdRef.current = setInterval(runHealthChecks, intervalMs);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [intervalMs]);

  return {
    health,
    runHealthChecks,
    getStatus: () => getApiStatus(),
  };
};

/**
 * Hook to get a simple API status indicator
 * Returns a string indicating the current API state
 */
export const useApiStatusIndicator = (): 'healthy' | 'degraded' | 'down' => {
  const { health } = useApiHealth();

  if (health.primary.healthy) {
    return 'healthy';
  }

  if (health.fallback.healthy) {
    return 'degraded';
  }

  return 'down';
};
