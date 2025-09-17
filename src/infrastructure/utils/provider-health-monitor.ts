 /**
 * Provider Health Monitor
 * 
 * Monitors the health of provider adapters by performing periodic health checks
 * and maintaining health status information.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ProviderAdapterPort, ProviderStats } from '../../domain/ports/secondary/provider-adapter.port';
import { ProviderFactory } from '@adapters/secondary/providers/provider-factory';
import { ProviderType } from '@domain/enums/provider-type.enum';

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
   * Minimum acceptable success rate (0-1)
   * Default: 0.95 (95%)
   */
  minSuccessRate: number;
  
  /**
   * Maximum acceptable error rate (0-1)
   * Default: 0.05 (5%)
   */
  maxErrorRate: number;
  
  /**
   * Maximum acceptable failure rate (0-1)
   * Default: 0.05 (5%)
   */
  maxFailureRate: number;
  
  /**
   * Minimum acceptable rate limit ratio (0-1)
   * Default: 0.1 (10%)
   */
  minRateLimitRatio: number;
  
  /**
   * Health check interval in milliseconds
   * Default: 30000ms (30 seconds)
   */
  healthCheckIntervalMs: number;
}

@Injectable()
export class ProviderHealthMonitor {
  private readonly logger = new Logger(ProviderHealthMonitor.name);
  private healthCheckResults: Map<string, ProviderHealthCheckResult> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly defaultThresholds: ProviderHealthThresholds = {
    maxResponseTime: 500,
    minSuccessRate: 0.95,
    maxErrorRate: 0.05,
    maxFailureRate: 0.05,
    minRateLimitRatio: 0.1,
    healthCheckIntervalMs: 30000 // 30 seconds
  };
  
  private readonly thresholds: ProviderHealthThresholds;
  private readonly providers: Map<string, Map<string, ProviderAdapterPort>> = new Map();
  
  /**
   * Constructor
   */
  constructor(private readonly providerFactory: ProviderFactory) {
    this.thresholds = { ...this.defaultThresholds };
    
    this.logger.log(`Provider health monitor initialized with thresholds: ${JSON.stringify(this.thresholds)}`);
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
    
    this.logger.log(`Started provider health monitoring (interval: ${this.thresholds.healthCheckIntervalMs}ms)`);
  }
  
  /**
   * Stop health check interval
   */
  public stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      
      this.logger.log('Stopped provider health monitoring');
    }
  }
  
  /**
   * Check health of all providers
   */
  public async checkAllProviders(): Promise<void> {
    try {
      // Get all available networks
      const networks = this.providerFactory.getAvailableNetworks();
      
      // Check health for each network and provider
      for (const network of networks) {
        // Get provider instances for this network
        const providers = this.providerFactory.getProvidersForNetwork(network);
        
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
            
            // Health check completed successfully
          } catch (error) {
            this.logger.error(`Failed to check health for provider ${providerType} on ${network}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to check provider health: ${error instanceof Error ? error.message : String(error)}`);
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
    
    // Log result based on health status
    const message = `Provider health check: ${result.provider} (${result.providerType}) on ${result.network} - ${result.status} (score: ${result.score})`;
    const details = {
      provider: result.provider,
      providerType: result.providerType,
      network: result.network,
      status: result.status,
      score: result.score,
      responseTime: result.responseTime,
      blockNumber: result.blockNumber,
      rateLimit: result.rateLimit,
      error: result.error
    };
    
    switch (result.status) {
      case ProviderHealthStatus.HEALTHY:
        this.logger.debug(`${message} - ${JSON.stringify(details)}`);
        break;
      case ProviderHealthStatus.DEGRADED:
        this.logger.warn(`${message} - ${JSON.stringify(details)}`);
        break;
      case ProviderHealthStatus.UNHEALTHY:
        this.logger.error(`${message} - ${JSON.stringify(details)}`);
        break;
      default:
        this.logger.log(`${message} - ${JSON.stringify(details)}`);
        break;
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

// Note: ProviderHealthMonitor is now an injectable service
// Use dependency injection to get an instance instead of this static export
// This export is removed to enforce proper DI usage
