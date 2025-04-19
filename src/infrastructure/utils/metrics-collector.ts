/**
 * Metrics Collector
 * 
 * Part of the infrastructure layer in hexagonal architecture
 * Provides metrics collection and reporting capabilities across the application
 */

// Import fs and path modules conditionally to avoid errors in browser environments
let fs: any = null;
let path: any = null;
let process: any = null;

// Check if we're in a Node.js environment
const isNodeEnvironment = typeof window === 'undefined';

if (isNodeEnvironment) {
  try {
    // Use dynamic imports to avoid TypeScript errors
    fs = eval('require')('fs');
    path = eval('require')('path');
    process = eval('require')('process');
  } catch (error) {
    // Running in an environment where Node.js modules are not available
    console.warn('Node.js modules not available in this environment');
  }
}

import { logger, LogCategory } from './structured-logger';

// Type definition for setTimeout return type to avoid NodeJS.Timeout dependency
type TimeoutId = ReturnType<typeof setTimeout>;

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram'
}

/**
 * Metric value types
 */
export type MetricValue = number | bigint;

/**
 * Metric tags
 */
export interface MetricTags {
  [key: string]: string;
}

/**
 * Metric data point
 */
export interface MetricDataPoint {
  /**
   * Timestamp in milliseconds
   */
  timestamp: number;
  
  /**
   * Metric name
   */
  name: string;
  
  /**
   * Metric value
   */
  value: MetricValue;
  
  /**
   * Metric type
   */
  type: MetricType;
  
  /**
   * Metric tags
   */
  tags: MetricTags;
}

/**
 * Provider metrics
 */
export enum ProviderMetric {
  REQUEST_COUNT = 'provider.request.count',
  REQUEST_DURATION = 'provider.request.duration',
  REQUEST_FAILURE = 'provider.request.failure',
  RATE_LIMIT_REMAINING = 'provider.ratelimit.remaining',
  RATE_LIMIT_RESET = 'provider.ratelimit.reset',
  BLOCK_HEIGHT = 'provider.block.height',
  BLOCK_LAG = 'provider.block.lag',
  PROVIDER_HEALTH = 'provider.health',
  
  // Provider fallback metrics
  FALLBACK_COUNT = 'provider.fallback.count',
  
  // Backoff metrics
  BACKOFF_ATTEMPTS = 'provider.backoff.attempts',
  BACKOFF_SUCCESS = 'provider.backoff.success',
  BACKOFF_FAILURE = 'provider.backoff.failure',
  
  // Circuit breaker metrics
  CIRCUIT_BREAKER_REJECTION = 'provider.circuit_breaker.rejection',
  CIRCUIT_BREAKER_SUCCESS = 'provider.circuit_breaker.success',
  CIRCUIT_BREAKER_FAILURE = 'provider.circuit_breaker.failure',
  CIRCUIT_BREAKER_STATE_CHANGE = 'provider.circuit_breaker.state_change',
  CIRCUIT_BREAKER_RESET = 'provider.circuit_breaker.reset',
  
  // Request distributor metrics
  PROVIDER_SELECTION = 'provider.selection',
  
  // Enhanced provider metrics
  RETRY_FAILURE = 'provider.retry.failure',
  LATENCY = 'provider.latency',
  SUCCESS_COUNT = 'provider.success_count',
  ERROR_COUNT = 'provider.error_count',
  RATE_LIMIT_COUNT = 'provider.rate_limit_count',
  
  // Data source metrics
  DATA_SOURCE_USAGE = 'provider.data_source.usage',
  DATA_SOURCE_ERROR = 'provider.data_source.error',
  
  // Provider request metrics for enhanced provider adapter
  PROVIDER_REQUEST_SUCCESS = 'provider.request.success',
  PROVIDER_REQUEST_FAILURE = 'provider.request.failure',
  PROVIDER_REQUEST_DURATION = 'provider.request.duration'
}

/**
 * Metrics collector class
 */
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: MetricDataPoint[] = [];
  private metricsDir: string = '';
  private flushInterval: TimeoutId | null = null;
  private readonly maxBufferSize: number = 1000;
  private readonly flushIntervalMs: number = 60000; // 1 minute
  
  /**
   * Constructor
   */
  private constructor() {
    if (isNodeEnvironment && fs && path && process) {
      // Create metrics directory if it doesn't exist
      this.metricsDir = path.join(process.cwd(), 'metrics');
      if (!fs.existsSync(this.metricsDir)) {
        fs.mkdirSync(this.metricsDir, { recursive: true });
      }
      
      // Handle process exit
      process.on('exit', () => this.flush());
      process.on('SIGINT', () => {
        this.flush();
        process.exit(0);
      });
    }
    
    // Start flush interval
    this.startFlushInterval();
    
    logger.info('Metrics collector initialized', LogCategory.GENERAL);
  }
  
  /**
   * Get metrics collector instance (singleton)
   */
  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }
  
  /**
   * Record a metric
   * @param name Metric name
   * @param value Metric value
   * @param type Metric type
   * @param tags Metric tags
   */
  public recordMetric(name: string, value: MetricValue, type: MetricType, tags: MetricTags = {}): void {
    // Convert bigint to number if needed
    const normalizedValue = typeof value === 'bigint' ? Number(value) : value;
    
    // Create metric data point
    const dataPoint: MetricDataPoint = {
      timestamp: Date.now(),
      name,
      value: normalizedValue,
      type,
      tags
    };
    
    // Add to metrics buffer
    this.metrics.push(dataPoint);
    
    // Flush if buffer is full
    if (this.metrics.length >= this.maxBufferSize) {
      this.flush();
    }
  }
  
  /**
   * Record a counter metric
   * @param name Metric name
   * @param value Metric value
   * @param tags Metric tags
   */
  public recordCounter(name: string, value: MetricValue = 1, tags: MetricTags = {}): void {
    this.recordMetric(name, value, MetricType.COUNTER, tags);
  }
  
  /**
   * Record a gauge metric
   * @param name Metric name
   * @param value Metric value
   * @param tags Metric tags
   */
  public recordGauge(name: string, value: MetricValue, tags: MetricTags = {}): void {
    this.recordMetric(name, value, MetricType.GAUGE, tags);
  }
  
  /**
   * Record a histogram metric
   * @param name Metric name
   * @param value Metric value
   * @param tags Metric tags
   */
  public recordHistogram(name: string, value: MetricValue, tags: MetricTags = {}): void {
    this.recordMetric(name, value, MetricType.HISTOGRAM, tags);
  }
  
  /**
   * Record provider request
   * @param provider Provider name
   * @param providerType Provider type
   * @param network Network name
   * @param operation Operation name
   * @param durationMs Duration in milliseconds
   * @param success Whether the request was successful
   */
  public recordProviderRequest(
    provider: string,
    providerType: string,
    network: string,
    operation: string,
    durationMs: number,
    success: boolean
  ): void {
    const tags: MetricTags = {
      provider,
      provider_type: providerType,
      network,
      operation
    };
    
    // Record request count
    this.recordCounter(ProviderMetric.REQUEST_COUNT, 1, tags);
    
    // Record request duration
    this.recordHistogram(ProviderMetric.REQUEST_DURATION, durationMs, tags);
    
    // Record failure if applicable
    if (!success) {
      this.recordCounter(ProviderMetric.REQUEST_FAILURE, 1, tags);
    }
  }
  
  /**
   * Record provider rate limit
   * @param provider Provider name
   * @param providerType Provider type
   * @param network Network name
   * @param remaining Remaining requests
   * @param resetTimestamp Reset timestamp
   */
  public recordProviderRateLimit(
    provider: string,
    providerType: string,
    network: string,
    remaining: number,
    resetTimestamp: number
  ): void {
    const tags: MetricTags = {
      provider,
      provider_type: providerType,
      network
    };
    
    // Record remaining requests
    this.recordGauge(ProviderMetric.RATE_LIMIT_REMAINING, remaining, tags);
    
    // Record reset timestamp
    this.recordGauge(ProviderMetric.RATE_LIMIT_RESET, resetTimestamp, tags);
  }
  
  /**
   * Record provider block height
   * @param provider Provider name
   * @param providerType Provider type
   * @param network Network name
   * @param blockNumber Block number
   */
  public recordProviderBlockHeight(
    provider: string,
    providerType: string,
    network: string,
    blockNumber: number
  ): void {
    const tags: MetricTags = {
      provider,
      provider_type: providerType,
      network
    };
    
    this.recordGauge(ProviderMetric.BLOCK_HEIGHT, blockNumber, tags);
  }
  
  /**
   * Record provider health
   * @param provider Provider name
   * @param providerType Provider type
   * @param network Network name
   * @param isHealthy Whether the provider is healthy
   */
  public recordProviderHealth(
    provider: string,
    providerType: string,
    network: string,
    isHealthy: boolean
  ): void {
    const tags: MetricTags = {
      provider,
      provider_type: providerType,
      network
    };
    
    this.recordGauge(ProviderMetric.PROVIDER_HEALTH, isHealthy ? 1 : 0, tags);
  }
  
  /**
   * Record provider fallback
   * @param fromProvider Original provider name
   * @param fromType Original provider type
   * @param toProvider Fallback provider name
   * @param toType Fallback provider type
   * @param network Network name
   * @param reason Fallback reason
   */
  public recordProviderFallback(
    fromProvider: string,
    fromType: string,
    toProvider: string,
    toType: string,
    network: string,
    reason: string
  ): void {
    const tags: MetricTags = {
      from_provider: fromProvider,
      from_type: fromType,
      to_provider: toProvider,
      to_type: toType,
      network,
      reason
    };
    
    this.recordCounter(ProviderMetric.FALLBACK_COUNT, 1, tags);
  }
  
  /**
   * Start flush interval
   */
  private startFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }
  
  /**
   * Flush metrics to disk
   */
  public flush(): void {
    if (this.metrics.length === 0) {
      return;
    }
    
    try {
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = path.join(this.metricsDir, `metrics-${timestamp}.json`);
      
      // Write metrics to file
      fs.writeFileSync(filename, JSON.stringify(this.metrics, null, 2));
      
      // Clear metrics buffer
      const count = this.metrics.length;
      this.metrics = [];
      
      logger.info(`Flushed ${count} metrics to ${filename}`, LogCategory.GENERAL);
    } catch (error) {
      logger.error(
        'Failed to flush metrics',
        LogCategory.GENERAL,
        {},
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  
  /**
   * Get current metrics
   */
  public getMetrics(): MetricDataPoint[] {
    return [...this.metrics];
  }
}

// Export singleton instance
export const metrics = MetricsCollector.getInstance();
