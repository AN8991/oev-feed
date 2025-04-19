import { Provider, Contract } from 'ethers';
import { ProviderAdapterPort, ProviderStats, RateLimitStatus } from '@domain/ports/secondary/provider-adapter.port';
import { logger, LogCategory, LogContext } from '@infrastructure/utils/structured-logger';
import { metrics, ProviderMetric } from '@infrastructure/utils/metrics-collector';
import { CircuitBreaker } from '@infrastructure/utils/circuit-breaker';
import { withExponentialBackoff } from '@shared/utils/exponential-backoff';
import { isRateLimitError, isTransientError } from '@shared/utils/errors';

/**
 * Enhanced provider adapter options
 */
export interface EnhancedProviderOptions {
  /**
   * Maximum number of retry attempts for rate-limited requests
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
}

/**
 * Default enhanced provider options
 */
const DEFAULT_ENHANCED_OPTIONS: EnhancedProviderOptions = {
  maxRetryAttempts: 3,
  initialBackoffMs: 200,
  maxBackoffMs: 10000,
  circuitBreakerFailureThreshold: 5,
  circuitBreakerResetMs: 30000
};

/**
 * Enhanced provider adapter that adds advanced rate limiting features
 * to an existing provider adapter
 */
export class EnhancedProviderAdapter implements ProviderAdapterPort {
  /**
   * Wrapped provider adapter
   */
  private readonly baseProvider: ProviderAdapterPort;
  
  /**
   * Enhanced provider options
   */
  private readonly options: EnhancedProviderOptions;
  
  /**
   * Circuit breaker for this provider
   */
  private readonly circuitBreaker: CircuitBreaker;
  
  /**
   * Constructor
   * 
   * @param baseProvider Provider adapter to enhance
   * @param options Enhanced provider options
   */
  constructor(
    baseProvider: ProviderAdapterPort,
    options: Partial<EnhancedProviderOptions> = {}
  ) {
    this.baseProvider = baseProvider;
    this.options = {
      ...DEFAULT_ENHANCED_OPTIONS,
      ...options
    };
    
    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      `${baseProvider.name}-${baseProvider.network}`,
      {
        failureThreshold: this.options.circuitBreakerFailureThreshold,
        resetTimeoutMs: this.options.circuitBreakerResetMs
      },
      {
        provider: baseProvider.name,
        providerType: baseProvider.type,
        network: baseProvider.network
      }
    );
    
    logger.info(
      `Enhanced provider adapter created for ${baseProvider.name} (${baseProvider.type}) on ${baseProvider.network}`,
      LogCategory.PROVIDER,
      {
        provider: baseProvider.name,
        providerType: baseProvider.type,
        network: baseProvider.network,
        options: this.options
      }
    );
  }
  
  /**
   * Get provider name
   */
  public getName(): string {
    return this.baseProvider.getName();
  }
  
  /**
   * Get provider type
   */
  public getType(): string {
    return this.baseProvider.getType();
  }
  
  /**
   * Get provider name property
   */
  public get name(): string {
    return this.getName();
  }
  
  /**
   * Get provider type property
   */
  public get type(): string {
    return this.getType();
  }
  
  /**
   * Get provider network
   */
  public get network(): string {
    return this.baseProvider.network;
  }
  
  /**
   * Get underlying ethers provider
   */
  public get provider(): Provider {
    return this.baseProvider.provider;
  }
  
  /**
   * Initialize the provider
   */
  public async initialize(): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        await this.baseProvider.initialize();
      });
    } catch (error: unknown) {
      logger.error(
        `Failed to initialize enhanced provider ${this.name}:`,
        LogCategory.PROVIDER,
        {
          provider: this.name,
          providerType: this.type,
          network: this.network
        },
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }
  
  /**
   * Check if the provider is healthy
   */
  public async isHealthy(): Promise<boolean> {
    try {
      return await this.circuitBreaker.execute(async () => {
        return await this.baseProvider.isHealthy();
      });
    } catch (error) {
      // If circuit breaker is open, provider is unhealthy
      return false;
    }
  }
  
  /**
   * Get provider statistics
   */
  public getStats(): ProviderStats {
    const baseStats = this.baseProvider.getStats();
    const circuitBreakerStats = this.circuitBreaker.getStats();
    
    // Enhance stats with circuit breaker info and retry metrics
    return {
      ...baseStats,
      circuitBreakerState: circuitBreakerStats.state,
      circuitBreakerFailures: circuitBreakerStats.consecutiveFailures,
      circuitBreakerResetAt: circuitBreakerStats.resetAt,
      retryAttempts: 0, // These will be updated by the exponential backoff utility
      retrySuccesses: 0,
      retryFailures: 0
    };
  }
  
  /**
   * Get a contract instance
   */
  public getContract(address: string, abi: any[]): Contract {
    return this.baseProvider.getContract(address, abi);
  }
  
  /**
   * Get the current block number with retry logic
   */
  public async getBlockNumber(): Promise<number> {
    const context: LogContext = {
      provider: this.name,
      providerType: this.type,
      network: this.network,
      operation: 'getBlockNumber'
    };
    
    try {
      return await this.circuitBreaker.execute(async () => {
        const result = await withExponentialBackoff(
          async () => await this.baseProvider.getBlockNumber(),
          (error) => isRateLimitError(error) || isTransientError(error),
          {
            initialDelayMs: this.options.initialBackoffMs,
            maxDelayMs: this.options.maxBackoffMs,
            maxAttempts: this.options.maxRetryAttempts
          },
          context
        );
        
        if (!result.success) {
          throw result.error;
        }
        
        return result.result as number;
      });
    } catch (error: unknown) {
      logger.error(
        `Failed to get block number from ${this.name} after retries:`,
        LogCategory.PROVIDER,
        context,
        error instanceof Error ? error : new Error(String(error))
      );
      
      // Record metrics
      metrics.recordCounter(
        ProviderMetric.RETRY_FAILURE,
        1,
        {
          provider: this.name,
          provider_type: this.type,
          network: this.network,
          operation: 'getBlockNumber'
        }
      );
      
      throw error;
    }
  }
  
  /**
   * Get the balance of an address with retry logic
   */
  public async getBalance(address: string): Promise<bigint> {
    const context: LogContext = {
      provider: this.name,
      providerType: this.type,
      network: this.network,
      operation: 'getBalance',
      address
    };
    
    try {
      return await this.circuitBreaker.execute(async () => {
        const result = await withExponentialBackoff(
          async () => await this.baseProvider.getBalance(address),
          (error) => isRateLimitError(error) || isTransientError(error),
          {
            initialDelayMs: this.options.initialBackoffMs,
            maxDelayMs: this.options.maxBackoffMs,
            maxAttempts: this.options.maxRetryAttempts
          },
          context
        );
        
        if (!result.success) {
          throw result.error;
        }
        
        return result.result as bigint;
      });
    } catch (error) {
      logger.error(
        `Failed to get balance from ${this.name} after retries:`,
        LogCategory.PROVIDER,
        context,
        error instanceof Error ? error : new Error(String(error))
      );
      
      // Record metrics
      metrics.recordCounter(
        ProviderMetric.RETRY_FAILURE,
        1,
        {
          provider: this.name,
          provider_type: this.type,
          network: this.network,
          operation: 'getBalance'
        }
      );
      
      throw error;
    }
  }
  
  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    await this.baseProvider.cleanup();
  }
  
  /**
   * Reset the circuit breaker
   */
  public resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
    
    logger.info(
      `Circuit breaker reset for ${this.name} (${this.type}) on ${this.network}`,
      LogCategory.PROVIDER,
      {
        provider: this.name,
        providerType: this.type,
        network: this.network
      }
    );
  }
}
