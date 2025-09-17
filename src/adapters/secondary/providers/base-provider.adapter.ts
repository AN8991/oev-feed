import { Provider, Contract } from 'ethers';
import { ProviderAdapterPort, ProviderStats, RateLimitStatus } from '@domain/ports/secondary/provider-adapter.port';
import { Logger } from '@nestjs/common';
import { normalizeAddress } from '@domain/utils/address-utils';

/**
 * Base class for provider adapters
 */
export abstract class BaseProviderAdapter implements ProviderAdapterPort {
  protected readonly logger = new Logger(BaseProviderAdapter.name);

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
      
      this.logger.log(`Provider ${this.name} initialized on ${this.network}, current block: ${blockNumber} (${responseTime}ms)`);
      this._initialized = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to test provider ${this.name}: ${errorMsg}`);
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
      this.logger.debug(`Provider ${this.name} health check successful, block: ${blockNumber} (${responseTime}ms)`);
      
      return true;
    } catch (error) {
      this.updateStats(0, false);
      this.logger.error(`Provider ${this.name} health check failed: ${error instanceof Error ? error.message : String(error)}`);
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
    this.logger.debug(`Creating contract instance for ${normalizedAddress}`);
    
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
      this.logger.debug(`Got block number ${blockNumber} from ${this.name} (${responseTime}ms)`);
      
      return blockNumber;
    } catch (error) {
      this.updateStats(0, false);
      this.logger.error(`Failed to get block number from ${this.name}: ${error instanceof Error ? error.message : String(error)}`);
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
      this.logger.debug(`Got balance for ${normalizedAddress} from ${this.name} (${responseTime}ms)`);
      
      return balance;
    } catch (error) {
      this.updateStats(0, false);
      this.logger.error(`Failed to get balance from ${this.name}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    // Most providers don't need explicit cleanup
    this._initialized = false;
    this.logger.log(`Provider ${this.name} cleaned up`);
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
  }
  
  /**
   * Update rate limit status
   * @param rateLimitStatus Rate limit status
   */
  protected updateRateLimitStatus(rateLimitStatus: RateLimitStatus): void {
    this.stats.rateLimitStatus = { ...rateLimitStatus };
    this.logger.debug(`Provider ${this.name} rate limit: ${rateLimitStatus.remaining}/${rateLimitStatus.limit}`);
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
