import { Provider, Contract } from 'ethers';
import { ProviderAdapterPort, ProviderStats, RateLimitStatus } from '@domain/ports/secondary/provider-adapter.port';
import { logger, LogCategory, LogContext } from '@infrastructure/utils/structured-logger';
import { metrics, ProviderMetric } from '@infrastructure/utils/metrics-collector';
import { normalizeAddress } from '@domain/utils/address-utils';

/**
 * Base class for provider adapters
 */
export abstract class BaseProviderAdapter implements ProviderAdapterPort {
  /**
   * Provider name
   */
  public abstract readonly name: string;
  
  /**
   * Provider type
   */
  public abstract readonly type: string;
  
  /**
   * Provider instance
   */
  protected _provider: Provider | null = null;
  
  /**
   * Provider statistics
   */
  protected stats: ProviderStats = {
    requestCount: 0,
    failureCount: 0,
    averageResponseTime: 0,
    lastRequestTimestamp: 0
  };
  
  /**
   * Initialization state
   */
  protected _initialized = false;
  
  /**
   * Constructor
   */
  constructor() {
    // Base constructor
  }
  
  /**
   * Get the network
   */
  public abstract get network(): string;
  
  /**
   * Get the underlying ethers provider
   */
  public get provider(): Provider {
    if (!this._provider) {
      throw new Error(`Provider not initialized for ${this.name}`);
    }
    return this._provider;
  }
  
  /**
   * Initialize the provider
   */
  public abstract initialize(): Promise<void>;
  
  /**
   * Test the provider connection
   */
  protected async testProvider(): Promise<void> {
    if (!this._provider) {
      throw new Error(`Provider not initialized for ${this.name}`);
    }
    
    try {
      const startTime = Date.now();
      const blockNumber = await this._provider.getBlockNumber();
      const responseTime = Date.now() - startTime;
      
      // Log provider initialization
      const context: LogContext = {
        provider: this.name,
        providerType: this.type,
        network: this.network,
        operation: 'initialize',
        durationMs: responseTime,
        blockNumber
      };
      
      logger.info(`Provider ${this.name} initialized on ${this.network}, current block: ${blockNumber}`, LogCategory.PROVIDER, context);
      
      // Record metrics
      metrics.recordProviderBlockHeight(this.name, this.type, this.network, blockNumber);
      metrics.recordProviderRequest(this.name, this.type, this.network, 'initialize', responseTime, true);
      
      this._initialized = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Log error
      const context: LogContext = {
        provider: this.name,
        providerType: this.type,
        network: this.network,
        operation: 'initialize'
      };
      
      logger.error(`Failed to test provider ${this.name}:`, LogCategory.PROVIDER, context, 
        error instanceof Error ? error : new Error(errorMsg));
      
      // Record metrics
      metrics.recordProviderRequest(this.name, this.type, this.network, 'initialize', 0, false);
      
      throw new Error(`Failed to test provider ${this.name}: ${errorMsg}`);
    }
  }
  
  /**
   * Check if the provider is healthy
   * @returns True if the provider is healthy, false otherwise
   */
  public async isHealthy(): Promise<boolean> {
    if (!this._provider) {
      return false;
    }
    
    try {
      const startTime = Date.now();
      const blockNumber = await this._provider.getBlockNumber();
      const responseTime = Date.now() - startTime;
      
      this.updateStats(responseTime, true);
      
      // Log health check
      const context: LogContext = {
        provider: this.name,
        providerType: this.type,
        network: this.network,
        operation: 'healthCheck',
        durationMs: responseTime,
        blockNumber
      };
      
      logger.debug(`Provider ${this.name} health check successful`, LogCategory.PROVIDER, context);
      
      // Record metrics
      metrics.recordProviderHealth(this.name, this.type, this.network, true);
      metrics.recordProviderBlockHeight(this.name, this.type, this.network, blockNumber);
      metrics.recordProviderRequest(this.name, this.type, this.network, 'healthCheck', responseTime, true);
      
      return true;
    } catch (error) {
      this.updateStats(0, false);
      
      // Log error
      const context: LogContext = {
        provider: this.name,
        providerType: this.type,
        network: this.network,
        operation: 'healthCheck'
      };
      
      logger.error(`Provider ${this.name} health check failed:`, LogCategory.PROVIDER, context,
        error instanceof Error ? error : new Error(String(error)));
      
      // Record metrics
      metrics.recordProviderHealth(this.name, this.type, this.network, false);
      metrics.recordProviderRequest(this.name, this.type, this.network, 'healthCheck', 0, false);
      
      return false;
    }
  }
  
  /**
   * Get provider statistics
   * @returns Provider statistics
   */
  public getBaseStats(): ProviderStats {
    return { ...this.stats };
  }
  
  /**
   * Get provider statistics
   * @returns Provider statistics
   */
  public abstract getStats(): ProviderStats;
  
  /**
   * Create a contract instance
   * @param address Contract address
   * @param abi Contract ABI
   * @returns Contract instance
   */
  public getContract(address: string, abi: any[]): Contract {
    if (!this._provider) {
      throw new Error(`Provider not initialized for ${this.name}`);
    }
    
    const normalizedAddress = normalizeAddress(address);
    
    // Log contract creation
    const context: LogContext = {
      provider: this.name,
      providerType: this.type,
      network: this.network,
      operation: 'getContract',
      contractAddress: normalizedAddress
    };
    
    logger.debug(`Creating contract instance for ${normalizedAddress}`, LogCategory.PROVIDER, context);
    
    return new Contract(normalizedAddress, abi, this._provider);
  }
  
  /**
   * Get the current block number
   * @returns Current block number
   */
  public async getBlockNumber(): Promise<number> {
    if (!this._provider) {
      throw new Error(`Provider not initialized for ${this.name}`);
    }
    
    try {
      const startTime = Date.now();
      const blockNumber = await this._provider.getBlockNumber();
      const responseTime = Date.now() - startTime;
      
      this.updateStats(responseTime, true);
      
      // Log block number
      const context: LogContext = {
        provider: this.name,
        providerType: this.type,
        network: this.network,
        operation: 'getBlockNumber',
        durationMs: responseTime,
        blockNumber
      };
      
      logger.debug(`Got block number ${blockNumber} from ${this.name}`, LogCategory.PROVIDER, context);
      
      // Record metrics
      metrics.recordProviderBlockHeight(this.name, this.type, this.network, blockNumber);
      metrics.recordProviderRequest(this.name, this.type, this.network, 'getBlockNumber', responseTime, true);
      
      return blockNumber;
    } catch (error) {
      this.updateStats(0, false);
      
      // Log error
      const context: LogContext = {
        provider: this.name,
        providerType: this.type,
        network: this.network,
        operation: 'getBlockNumber'
      };
      
      logger.error(`Failed to get block number from ${this.name}:`, LogCategory.PROVIDER, context,
        error instanceof Error ? error : new Error(String(error)));
      
      // Record metrics
      metrics.recordProviderRequest(this.name, this.type, this.network, 'getBlockNumber', 0, false);
      
      throw error;
    }
  }
  
  /**
   * Get the balance of an address
   * @param address Address to get balance for
   * @returns Balance in wei
   */
  public async getBalance(address: string): Promise<bigint> {
    if (!this._provider) {
      throw new Error(`Provider not initialized for ${this.name}`);
    }
    
    try {
      const normalizedAddress = normalizeAddress(address);
      const startTime = Date.now();
      const balance = await this._provider.getBalance(normalizedAddress);
      const responseTime = Date.now() - startTime;
      
      this.updateStats(responseTime, true);
      
      // Log balance
      const context: LogContext = {
        provider: this.name,
        providerType: this.type,
        network: this.network,
        operation: 'getBalance',
        durationMs: responseTime,
        address: normalizedAddress
      };
      
      logger.debug(`Got balance for ${normalizedAddress} from ${this.name}`, LogCategory.PROVIDER, context);
      
      // Record metrics
      metrics.recordProviderRequest(this.name, this.type, this.network, 'getBalance', responseTime, true);
      
      return balance;
    } catch (error) {
      this.updateStats(0, false);
      
      // Log error
      const context: LogContext = {
        provider: this.name,
        providerType: this.type,
        network: this.network,
        operation: 'getBalance',
        address
      };
      
      logger.error(`Failed to get balance from ${this.name}:`, LogCategory.PROVIDER, context,
        error instanceof Error ? error : new Error(String(error)));
      
      // Record metrics
      metrics.recordProviderRequest(this.name, this.type, this.network, 'getBalance', 0, false);
      
      throw error;
    }
  }
  
  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    // Most providers don't need explicit cleanup
    this._initialized = false;
    
    // Log cleanup
    const context: LogContext = {
      provider: this.name,
      providerType: this.type,
      network: this.network,
      operation: 'cleanup'
    };
    
    logger.info(`Provider ${this.name} cleaned up`, LogCategory.PROVIDER, context);
  }
  
  /**
   * Update provider statistics
   * @param responseTime Response time in milliseconds
   * @param success Whether the request was successful
   */
  protected updateStats(responseTime: number, success: boolean): void {
    const now = Date.now();
    
    // Update request count
    this.stats.requestCount++;
    
    // Update failure count if request failed
    if (!success) {
      this.stats.failureCount++;
    }
    
    // Update average response time
    if (success && responseTime > 0) {
      const prevTotal = this.stats.averageResponseTime * (this.stats.requestCount - 1);
      this.stats.averageResponseTime = (prevTotal + responseTime) / this.stats.requestCount;
    }
    
    // Update last request timestamp
    this.stats.lastRequestTimestamp = now;
    
    // Record performance metrics
    logger.logProviderPerformance(
      'request',
      responseTime,
      success,
      {
        provider: this.name,
        providerType: this.type,
        network: this.network
      }
    );
    
    // Record rate limit if available
    if (this.stats.rateLimitStatus) {
      metrics.recordProviderRateLimit(
        this.name,
        this.type,
        this.network,
        this.stats.rateLimitStatus.remaining,
        this.stats.rateLimitStatus.resetTimestamp
      );
    }
  }
  
  /**
   * Update rate limit status
   * @param rateLimitStatus Rate limit status
   */
  protected updateRateLimitStatus(rateLimitStatus: RateLimitStatus): void {
    this.stats.rateLimitStatus = { ...rateLimitStatus };
    
    // Log rate limit update
    const context: LogContext = {
      provider: this.name,
      providerType: this.type,
      network: this.network,
      operation: 'updateRateLimit',
      remaining: rateLimitStatus.remaining,
      limit: rateLimitStatus.limit,
      resetTimestamp: rateLimitStatus.resetTimestamp
    };
    
    logger.debug(
      `Provider ${this.name} rate limit: ${rateLimitStatus.remaining}/${rateLimitStatus.limit}`,
      LogCategory.PROVIDER,
      context
    );
    
    // Record rate limit metrics
    metrics.recordProviderRateLimit(
      this.name,
      this.type,
      this.network,
      rateLimitStatus.remaining,
      rateLimitStatus.resetTimestamp
    );
  }

  /**
   * Get the provider name
   * @returns Provider name
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Get the provider type
   * @returns Provider type
   */
  public getType(): string {
    return this.type;
  }
}
