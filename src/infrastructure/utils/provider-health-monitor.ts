/**
 * Provider Health Monitor
 * 
 * Part of the infrastructure layer in hexagonal architecture
 * Monitors the health of blockchain providers and provides metrics for provider selection
 */

import { ProviderAdapterPort, ProviderStats } from '@domain/ports/secondary/provider-adapter.port';
import { ProviderFactory } from '@adapters/secondary/providers/provider-factory';
import { ProviderType } from '@domain/enums/provider-type.enum';
import { logger, LogCategory, LogLevel } from './structured-logger';
import { metrics, ProviderMetric } from './metrics-collector';

/**
 * Provider health status
 */
export enum ProviderHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

/**
 * Provider health check result
 */
export interface ProviderHealthCheckResult {
  /**
   * Provider name
   */
  provider: string;
  
  /**
   * Provider type
   */
  providerType: string;
  
  /**
   * Network name
   */
  network: string;
  
  /**
   * Health status
   */
  status: ProviderHealthStatus;
  
  /**
   * Health score (0-100)
   */
  score: number;
  
  /**
   * Last check timestamp
   */
  timestamp: number;
  
  /**
   * Block number
   */
  blockNumber?: number;
  
  /**
   * Response time in milliseconds
   */
  responseTime?: number;
  
  /**
   * Rate limit status
   */
  rateLimit?: {
    remaining: number;
    limit: number;
    resetTimestamp: number;
  };
  
  /**
   * Error message (if any)
   */
  error?: string;
}

/**
 * Provider health threshold configuration
 */
export interface ProviderHealthThresholds {
  /**
   * Maximum acceptable response time in milliseconds
   * Default: 500ms
   */
  maxResponseTime: number;
  
  /**
   * Maximum acceptable failure rate (0-1)
   * Default: 0.05 (5%)
   */
  maxFailureRate: number;
  
  /**
   * Minimum acceptable rate limit remaining ratio (0-1)
   * Default: 0.1 (10%)
   */
  minRateLimitRatio: number;
  
  /**
   * Health check interval in milliseconds
   * Default: 60000ms (1 minute)
   */
  healthCheckIntervalMs: number;
}

/**
 * Provider health monitor class
 */
export class ProviderHealthMonitor {
  private static instance: ProviderHealthMonitor;
  private healthCheckResults: Map<string, ProviderHealthCheckResult> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly defaultThresholds: ProviderHealthThresholds = {
    maxResponseTime: 500,
    maxFailureRate: 0.05,
    minRateLimitRatio: 0.1,
    healthCheckIntervalMs: 60000
  };
  private thresholds: ProviderHealthThresholds;
  
  /**
   * Constructor
   * @param thresholds Provider health thresholds
   */
  private constructor(thresholds?: Partial<ProviderHealthThresholds>) {
    this.thresholds = {
      ...this.defaultThresholds,
      ...thresholds
    };
    
    logger.info('Provider health monitor initialized', LogCategory.PROVIDER, {
      thresholds: this.thresholds
    });
  }
  
  /**
   * Get provider health monitor instance (singleton)
   * @param thresholds Provider health thresholds
   */
  public static getInstance(thresholds?: Partial<ProviderHealthThresholds>): ProviderHealthMonitor {
    if (!ProviderHealthMonitor.instance) {
      ProviderHealthMonitor.instance = new ProviderHealthMonitor(thresholds);
    }
    return ProviderHealthMonitor.instance;
  }
  
  /**
   * Start health check interval
   */
  public startMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      await this.checkAllProviders();
    }, this.thresholds.healthCheckIntervalMs);
    
    logger.info(
      `Started provider health monitoring (interval: ${this.thresholds.healthCheckIntervalMs}ms)`,
      LogCategory.PROVIDER
    );
  }
  
  /**
   * Stop health check interval
   */
  public stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      
      logger.info('Stopped provider health monitoring', LogCategory.PROVIDER);
    }
  }
  
  /**
   * Check health of all providers
   */
  public async checkAllProviders(): Promise<void> {
    try {
      // Get all available networks
      const networks = ProviderFactory.getAvailableNetworks();
      
      // Check health for each network and provider
      for (const network of networks) {
        // Get provider instances for this network
        const providers = ProviderFactory.getProvidersForNetwork(network);
        
        // Check health for each provider
        for (const [providerType, provider] of Object.entries(providers)) {
          try {
            // Skip if provider is not available
            if (!provider) {
              continue;
            }
            
            // Check provider health
            const result = await this.checkProviderHealth(
              provider,
              providerType as ProviderType,
              network
            );
            
            // Record result
            this.recordHealthCheckResult(result);
            
            // Record metrics
            this.recordHealthMetrics(result);
          } catch (error) {
            logger.error(
              `Failed to check health for provider ${providerType} on ${network}`,
              LogCategory.PROVIDER,
              {},
              error instanceof Error ? error : new Error(String(error))
            );
          }
        }
      }
    } catch (error) {
      logger.error(
        'Failed to check provider health',
        LogCategory.PROVIDER,
        {},
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  
  /**
   * Check health of a specific provider
   * @param provider Provider instance
   * @param providerType Provider type
   * @param network Network name
   */
  public async checkProviderHealth(
    provider: ProviderAdapterPort,
    providerType: ProviderType,
    network: string
  ): Promise<ProviderHealthCheckResult> {
    const startTime = Date.now();
    let blockNumber: number | undefined;
    let responseTime: number | undefined;
    let error: string | undefined;
    let status: ProviderHealthStatus = ProviderHealthStatus.UNKNOWN;
    let score = 0;
    
    try {
      // Get provider stats
      const stats = await provider.getStats();
      
      // Get current block number
      blockNumber = await provider.getBlockNumber();
      
      // Calculate response time
      responseTime = Date.now() - startTime;
      
      // Calculate health score
      score = this.calculateHealthScore(stats, responseTime);
      
      // Determine health status based on score
      if (score >= 80) {
        status = ProviderHealthStatus.HEALTHY;
      } else if (score >= 50) {
        status = ProviderHealthStatus.DEGRADED;
      } else {
        status = ProviderHealthStatus.UNHEALTHY;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      status = ProviderHealthStatus.UNHEALTHY;
      score = 0;
    }
    
    // Create health check result
    const result: ProviderHealthCheckResult = {
      provider: provider.getName(),
      providerType,
      network,
      status,
      score,
      timestamp: Date.now(),
      blockNumber,
      responseTime,
      error
    };
    
    // Add rate limit information if available
    const rateLimit = provider.getStats().rateLimitStatus;
    if (rateLimit) {
      result.rateLimit = {
        remaining: rateLimit.remaining,
        limit: rateLimit.limit,
        resetTimestamp: rateLimit.resetTimestamp
      };
    }
    
    return result;
  }
  
  /**
   * Calculate health score based on provider stats
   * @param stats Provider statistics
   * @param currentResponseTime Current response time
   * @returns Health score (0-100)
   */
  private calculateHealthScore(stats: ProviderStats, currentResponseTime: number): number {
    let score = 100;
    
    // Penalize for high response time
    if (currentResponseTime > this.thresholds.maxResponseTime) {
      const responseTimePenalty = Math.min(
        30,
        ((currentResponseTime - this.thresholds.maxResponseTime) / this.thresholds.maxResponseTime) * 30
      );
      score -= responseTimePenalty;
    }
    
    // Penalize for high failure rate
    if (stats.requestCount > 0) {
      const failureRate = stats.failureCount / stats.requestCount;
      if (failureRate > this.thresholds.maxFailureRate) {
        const failurePenalty = Math.min(
          50,
          ((failureRate - this.thresholds.maxFailureRate) / (1 - this.thresholds.maxFailureRate)) * 50
        );
        score -= failurePenalty;
      }
    }
    
    // Penalize for low rate limit
    if (stats.rateLimitStatus && stats.rateLimitStatus.limit > 0) {
      const remainingRatio = stats.rateLimitStatus.remaining / stats.rateLimitStatus.limit;
      if (remainingRatio < this.thresholds.minRateLimitRatio) {
        const rateLimitPenalty = Math.min(
          20,
          ((this.thresholds.minRateLimitRatio - remainingRatio) / this.thresholds.minRateLimitRatio) * 20
        );
        score -= rateLimitPenalty;
      }
    }
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Record health check result
   * @param result Health check result
   */
  private recordHealthCheckResult(result: ProviderHealthCheckResult): void {
    // Generate key for the result
    const key = `${result.network}:${result.providerType}:${result.provider}`;
    
    // Store result
    this.healthCheckResults.set(key, result);
    
    // Log result
    const logLevel = this.getLogLevelForHealthStatus(result.status);
    logger.log(
      logLevel,
      `Provider health check: ${result.provider} (${result.providerType}) on ${result.network} - ${result.status} (score: ${result.score})`,
      LogCategory.PROVIDER,
      {
        provider: result.provider,
        providerType: result.providerType,
        network: result.network,
        status: result.status,
        score: result.score,
        responseTime: result.responseTime,
        blockNumber: result.blockNumber,
        rateLimit: result.rateLimit,
        error: result.error
      }
    );
  }
  
  /**
   * Record health metrics
   * @param result Health check result
   */
  private recordHealthMetrics(result: ProviderHealthCheckResult): void {
    const tags = {
      provider: result.provider,
      provider_type: result.providerType,
      network: result.network,
      status: result.status
    };
    
    // Record health status
    metrics.recordGauge(ProviderMetric.PROVIDER_HEALTH, result.score, tags);
    
    // Record block height if available
    if (result.blockNumber !== undefined) {
      metrics.recordGauge(ProviderMetric.BLOCK_HEIGHT, result.blockNumber, tags);
    }
    
    // Record rate limit if available
    if (result.rateLimit) {
      metrics.recordGauge(
        ProviderMetric.RATE_LIMIT_REMAINING,
        result.rateLimit.remaining,
        tags
      );
      
      metrics.recordGauge(
        ProviderMetric.RATE_LIMIT_RESET,
        result.rateLimit.resetTimestamp,
        tags
      );
    }
  }
  
  /**
   * Get log level for health status
   * @param status Health status
   * @returns Log level
   */
  private getLogLevelForHealthStatus(status: ProviderHealthStatus): LogLevel {
    switch (status) {
      case ProviderHealthStatus.HEALTHY:
        return LogLevel.DEBUG;
      case ProviderHealthStatus.DEGRADED:
        return LogLevel.WARN;
      case ProviderHealthStatus.UNHEALTHY:
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }
  
  /**
   * Get health check result for a specific provider
   * @param network Network name
   * @param providerType Provider type
   * @param providerName Provider name
   * @returns Health check result or undefined if not found
   */
  public getHealthCheckResult(
    network: string,
    providerType: string,
    providerName: string
  ): ProviderHealthCheckResult | undefined {
    const key = `${network}:${providerType}:${providerName}`;
    return this.healthCheckResults.get(key);
  }
  
  /**
   * Get all health check results
   * @returns Map of health check results
   */
  public getAllHealthCheckResults(): Map<string, ProviderHealthCheckResult> {
    return new Map(this.healthCheckResults);
  }
  
  /**
   * Get health check results for a specific network
   * @param network Network name
   * @returns Array of health check results
   */
  public getNetworkHealthCheckResults(network: string): ProviderHealthCheckResult[] {
    const results: ProviderHealthCheckResult[] = [];
    
    for (const [key, result] of this.healthCheckResults.entries()) {
      if (key.startsWith(`${network}:`)) {
        results.push(result);
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const providerHealthMonitor = ProviderHealthMonitor.getInstance();
