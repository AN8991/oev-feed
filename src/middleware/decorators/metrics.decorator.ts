/**
 * Metrics Decorator
 * Method-level decorator for metrics collection
 */

import { SetMetadata } from '@nestjs/common';

export const METRICS_KEY = 'metrics';

export interface MetricsOptions {
  enabled?: boolean;
  track?: ('duration' | 'success_rate' | 'error_rate' | 'throughput')[];
  customLabels?: Record<string, string>;
  buckets?: number[];
}

/**
 * Enable metrics collection for a method
 * @param options Metrics configuration options
 */
export const Metrics = (options: MetricsOptions = {}) =>
  SetMetadata(METRICS_KEY, { 
    enabled: true, 
    track: ['duration', 'success_rate'], 
    ...options 
  });

/**
 * Disable metrics for a specific method
 */
export const NoMetrics = () =>
  SetMetadata(METRICS_KEY, { enabled: false });
