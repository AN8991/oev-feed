/**
 * Data Source Fallback
 * 
 * Part of the infrastructure layer in hexagonal architecture
 * Provides fallback mechanisms between different data sources with retry, circuit breaking,
 * and metrics tracking capabilities
 */

import { ProviderAdapterPort } from '@domain/ports/secondary/providers/provider-adapter.port';
import { logger, LogCategoryger, LogCategory } from './structured-logger';
import { metrics, ProviderMetric } from './metrics-collector';
import { CircuitBreaker, CircuitBreakerOptions, CircuitBreakerStats } from './circuit-breaker';
import { DataSourceType } from '../../domain/types/data-source-type';
import { isRateLimitError as checkRateLimit, isTransientError as checkTransientError } from '@shared/utils/errors';

/**
 * Data source fallback options
 */
export interface DataSourceFallbackOptions {
  /**
   * Maximum number of retry attempts for each data source
   * Default: 3
   */
  maxRetryAttempts: number;
  
  /**
   * Initial backoff delay in milliseconds
   * Default: 200ms
   */
  initialBackoffMs: number;
  
  /**
   * Maximum backoff delay in milliseconds
   * Default: 10000ms (10 seconds)
   */
  maxBackoffMs: number;
  
  /**
   * Circuit breaker failure threshold
   * Default: 5
   */
  circuitBreakerFailureThreshold: number;
  
  /**
   * Circuit breaker reset timeout in milliseconds
   * Default: 30000ms (30 seconds)
   */
  circuitBreakerResetMs: number;
  
  /**
   * Whether to use circuit breaker for data sources
   * Default: true
   */
  useCircuitBreaker: boolean;
  
  /**
   * Context for logging and metrics
   */
  context: {
    protocol?: string;
    network?: string;
    operation?: string;
  };
}

/**
 * Default options for data source fallback
 */
const DEFAULT_OPTIONS: DataSourceFallbackOptions = {
  maxRetryAttempts: 3,
  initialBackoffMs: 200,
  maxBackoffMs: 10000,
  circuitBreakerFailureThreshold: 5,
  circuitBreakerResetMs: 30000,
  useCircuitBreaker: true,
  context: {}
};

/**
 * Data source fallback service
 * Handles fallback between different data sources (on-chain, subgraph, API)
 * with retry, circuit breaker, and metrics tracking
 */
export class DataSourceFallback {
  /**
   * Options for data source fallback
   */
  private options: DataSourceFallbackOptions;
  
  /**
   * Circuit breakers for each data source
   */
  private circuitBreakers: Map<DataSourceType, CircuitBreaker> = new Map();
  
  /**
   * Constructor
   * 
   * @param options Data source fallback options
   */
  constructor(options: Partial<DataSourceFallbackOptions> = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      context: {
        ...DEFAULT_OPTIONS.context,
        ...options.context
      }
    };
    
    // Initialize circuit breakers for each data source
    if (this.options.useCircuitBreaker) {
      this.initializeCircuitBreakers();
    }
  }
  
  /**
   * Initialize circuit breakers for each data source
   */
  private initializeCircuitBreakers(): void {
    // Create circuit breaker for ON_CHAIN data source
    this.circuitBreakers.set(
      DataSourceType.ON_CHAIN,
      new CircuitBreaker(
        'onchain-data-source',
        {
          failureThreshold: this.options.circuitBreakerFailureThreshold,
          successThreshold: 2,
          resetTimeoutMs: this.options.circuitBreakerResetMs
        },
        {
          provider: 'onchain',
          providerType: 'onchain',
          network: this.options.context.network || 'unknown',
          protocol: this.options.context.protocol || 'unknown',
          operation: this.options.context.operation || 'unknown'
        }
      )
    );
    
    // Create circuit breaker for SUBGRAPH data source
    this.circuitBreakers.set(
      DataSourceType.SUBGRAPH,
      new CircuitBreaker(
        'subgraph-data-source',
        {
          failureThreshold: this.options.circuitBreakerFailureThreshold,
          successThreshold: 2,
          resetTimeoutMs: this.options.circuitBreakerResetMs
        },
        {
          provider: 'subgraph',
          providerType: 'subgraph',
          network: this.options.context.network || 'unknown',
          protocol: this.options.context.protocol || 'unknown',
          operation: this.options.context.operation || 'unknown'
        }
      )
    );
  }
  
  /**
   * Execute an operation with data source fallback
   * 
   * @param sources Data source operations to try in order
   * @returns Result of the first successful operation
   * @throws Error if all data sources fail
   */
  public async execute<T>(
    sources: Record<DataSourceType, () => Promise<T>>
  ): Promise<{ result: T; source: DataSourceType }> {
    // Get ordered list of data source types
    const sourceTypes = Object.keys(sources) as DataSourceType[];
    
    // Try each data source in order
    for (const sourceType of sourceTypes) {
      // Skip if circuit breaker is open
      if (
        this.options.useCircuitBreaker &&
        this.circuitBreakers.has(sourceType) &&
        this.circuitBreakers.get(sourceType)!.isOpen()
      ) {
        logger.info(
          `Skipping data source ${sourceType} due to open circuit breaker`,
          LogCategory.PROVIDER,
          {
            ...this.options.context,
            dataSource: sourceType
          }
        );
        continue;
      }
      
      // Get the operation for this data source
      const operation = sources[sourceType];
      
      // Try the operation with retries
      try {
        // Execute through circuit breaker if enabled
        let result: T;
        
        if (this.options.useCircuitBreaker && this.circuitBreakers.has(sourceType)) {
          result = await this.circuitBreakers.get(sourceType)!.execute(operation);
        } else {
          result = await operation();
        }
        
        // Record successful usage
        this.recordDataSourceUsage(sourceType, true);
        
        return { result, source: sourceType };
      } catch (error) {
        // Record failed usage
        this.recordDataSourceUsage(sourceType, false, error);
        
        // Log the error
        logger.error(
          `Data source ${sourceType} failed: ${error instanceof Error ? error.message : String(error)}`,
          LogCategory.PROVIDER,
          {
            ...this.options.context,
            dataSource: sourceType,
            error: error instanceof Error ? error.message : String(error),
            errorType: this.getErrorType(error)
          }
        );
      }
    }
    
    // If we get here, all data sources failed
    throw new Error('All data sources failed');
  }
  
  /**
   * Record data source usage metrics
   * 
   * @param sourceType Data source type
   * @param success Whether the operation was successful
   * @param error Error if operation failed
   */
  private recordDataSourceUsage(
    sourceType: DataSourceType,
    success: boolean,
    error?: unknown
  ): void {
    // Record request count
    metrics.recordCounter(
      ProviderMetric.DATA_SOURCE_REQUEST_COUNT,
      1,
      {
        data_source: sourceType,
        network: this.options.context.network || 'unknown',
        protocol: this.options.context.protocol || 'unknown',
        operation: this.options.context.operation || 'unknown',
        success: success ? 'true' : 'false',
        error_type: success ? 'none' : this.getErrorType(error)
      }
    );
    
    // Record latency if successful
    if (success) {
      metrics.recordCounter(
        ProviderMetric.DATA_SOURCE_SUCCESS_COUNT,
        1,
        {
          data_source: sourceType,
          network: this.options.context.network || 'unknown',
          protocol: this.options.context.protocol || 'unknown',
          operation: this.options.context.operation || 'unknown'
        }
      );
    } else {
      // Record failure
      metrics.recordCounter(
        ProviderMetric.DATA_SOURCE_FAILURE_COUNT,
        1,
        {
          data_source: sourceType,
          network: this.options.context.network || 'unknown',
          protocol: this.options.context.protocol || 'unknown',
          operation: this.options.context.operation || 'unknown',
          error_type: this.getErrorType(error)
        }
      );
    }
    
    // If this was a fallback to subgraph, record it
    if (sourceType === DataSourceType.SUBGRAPH && this.options.context.protocol) {
      metrics.recordCounter(
        ProviderMetric.FALLBACK_COUNT,
        1,
        {
          provider: 'onchain',
          provider_type: 'onchain',
          to_provider: 'subgraph',
          to_provider_type: 'subgraph',
          network: this.options.context.network || 'unknown',
          protocol: this.options.context.protocol,
          reason: 'onchain_failure'
        }
      );
    }
  }
  
  /**
   * Get the error type
   * 
   * @param error Error to get type for
   * @returns Error type string
   */
  private getErrorType(error: unknown): string {
    // Use centralized error detection functions from shared/utils/errors
    if (checkRateLimit(error)) {
      return 'rate_limit';
    }
    
    if (checkTransientError(error)) {
      return 'transient';
    }
    
    if (error instanceof Error) {
      return error.name;
    }
    
    return 'unknown';
  }
  
  /**
   * Reset circuit breakers for all data sources
   */
  public resetCircuitBreakers(): void {
    if (!this.options.useCircuitBreaker) {
      return;
    }
    
    for (const [sourceType, circuitBreaker] of this.circuitBreakers.entries()) {
      circuitBreaker.reset();
      
      logger.info(
        `Reset circuit breaker for data source ${sourceType}`,
        LogCategory.PROVIDER,
        {
          ...this.options.context,
          dataSource: sourceType
        }
      );
    }
  }
  
  /**
   * Get circuit breaker state for a data source
   * 
   * @param sourceType Data source type
   * @returns Circuit breaker state or undefined if not using circuit breakers
   */
  public getCircuitBreakerState(sourceType: DataSourceType): string | undefined {
    if (!this.options.useCircuitBreaker || !this.circuitBreakers.has(sourceType)) {
      return undefined;
    }
    
    return this.circuitBreakers.get(sourceType)!.getStats().state;
  }
}

// Export a singleton instance for convenience
export const dataSourceFallback = new DataSourceFallback();
