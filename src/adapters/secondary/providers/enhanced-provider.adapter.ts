import { Logger } from '@nestjs/common';
import { Provider, Contract } from 'ethers';
import { ProviderAdapterPort, ProviderStats, RateLimitStatus } from '@domain/ports/secondary/provider-adapter.port';

/**
 * Enhanced provider adapter options
 */
export interface EnhancedProviderOptions {
  /**
   * Maximum number of retry attempts for rate-limited requests
   * Default: 3
   */
  maxRetryAttempts: number;
}

/**
 * Default enhanced provider options
 */
const DEFAULT_ENHANCED_OPTIONS: EnhancedProviderOptions = {
  maxRetryAttempts: 3
};

/**
 * Enhanced provider adapter that adds retry functionality
 * to an existing provider adapter
 */
export class EnhancedProviderAdapter implements ProviderAdapterPort {
  private readonly logger = new Logger(EnhancedProviderAdapter.name);
  
  /**
   * Wrapped provider adapter
   */
  private readonly baseProvider: ProviderAdapterPort;
  
  /**
   * Enhanced provider options
   */
  private readonly options: EnhancedProviderOptions;
  
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
    
    this.logger.log(`Enhanced provider adapter created for ${baseProvider.getName()} (${baseProvider.getType()}) on ${baseProvider.network}`);
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
      await this.baseProvider.initialize();
    } catch (error: unknown) {
      this.logger.error(`Failed to initialize enhanced provider ${this.name}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Check if the provider is healthy
   */
  public async isHealthy(): Promise<boolean> {
    try {
      return await this.baseProvider.isHealthy();
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get provider statistics
   */
  public getStats(): ProviderStats {
    return this.baseProvider.getStats();
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
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.options.maxRetryAttempts; attempt++) {
      try {
        return await this.baseProvider.getBlockNumber();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.options.maxRetryAttempts - 1) {
          const delay = Math.min(200 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    this.logger.error(`Failed to get block number from ${this.name} after ${this.options.maxRetryAttempts} attempts: ${lastError!.message}`);
    throw lastError!;
  }
  
  /**
   * Get the balance of an address with retry logic
   */
  public async getBalance(address: string): Promise<bigint> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.options.maxRetryAttempts; attempt++) {
      try {
        return await this.baseProvider.getBalance(address);
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.options.maxRetryAttempts - 1) {
          const delay = Math.min(200 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    this.logger.error(`Failed to get balance from ${this.name} after ${this.options.maxRetryAttempts} attempts: ${lastError!.message}`);
    throw lastError!;
  }
  
  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    await this.baseProvider.cleanup();
  }
  
}
