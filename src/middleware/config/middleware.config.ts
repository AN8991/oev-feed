/**
 * Middleware Configuration
 * Centralized configuration for all middleware components
 */

import { HttpMethods } from '../../domain/enums/httpMethods';

export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  excludePaths: string[];
  includeRequestBody: boolean;
  includeResponseBody: boolean;
  includeStackTrace: boolean;
  redactFields: string[];
  correlationIdHeader: string;
  methodSpecificLogging?: Partial<Record<HttpMethods, boolean>>;
}

export interface MetricsConfig {
  enabled: boolean;
  defaultLabels: Record<string, string>;
  excludePaths: string[];
  buckets: number[];
  methodSpecificMetrics?: Partial<Record<HttpMethods, boolean>>;
}

export interface CircuitBreakerConfig {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  rollingCountTimeout: number;
  rollingCountBuckets: number;
  name: string;
  group: string;
}

export interface ThrottlerConfig {
  ttl: number;
  limit: number;
  ignoreUserAgents: string[];
}

export const defaultMiddlewareConfig = {
  logging: {
    enabled: true,
    level: 'info' as const,
    includeRequestBody: false,
    includeResponseBody: false,
    includeStackTrace: true,
    excludePaths: ['/health', '/metrics'],
    redactFields: ['password', 'token', 'apiKey', 'secret'],
    correlationIdHeader: 'x-correlation-id',
  },
  metrics: {
    enabled: true,
    defaultLabels: {
      app: 'oev-feed',
      version: '1.0.0',
    },
    excludePaths: ['/health', '/metrics'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  },
  circuitBreaker: {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    rollingCountTimeout: 10000,
    rollingCountBuckets: 10,
    name: 'default',
    group: 'oev-feed',
  },
  throttler: {
    ttl: 60,
    limit: 10,
    ignoreUserAgents: [],
  },
};
