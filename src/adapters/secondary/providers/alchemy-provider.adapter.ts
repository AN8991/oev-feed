import { JsonRpcProvider } from 'ethers';
import { ProviderAdapterPort, ProviderStats, RateLimitStatus } from '@domain/ports/secondary/provider-adapter.port';
import { BaseProviderAdapter } from './base-provider.adapter';
import { Logger } from '@nestjs/common';

/**
 * Alchemy provider adapter configuration
 */
export interface AlchemyProviderConfig {
  /**
   * API key for Alchemy
   */
  apiKey: string;
  
  /**
   * Network name
   */
  network: string;
  
  /**
   * Base URL for Alchemy API (optional)
   */
  baseUrl?: string;
  
  /**
   * Timeout in milliseconds (optional)
   */
  timeout?: number;
  
  /**
   * Maximum number of retries (optional)
   */
  maxRetries?: number;
  
  /**
   * Additional options (optional)
   */
  options?: Record<string, any>;
}

/**
 * Alchemy provider adapter
 * Implements the provider adapter port for Alchemy
 */
export class AlchemyProviderAdapter extends BaseProviderAdapter implements ProviderAdapterPort {

  /**
   * Provider name
   */
  public readonly name: string = 'Alchemy';
  
  /**
   * Provider type
   */
  public readonly type: string = 'alchemy';
  
  /**
   * Network name
   */
  private readonly _network: string;
  
  /**
   * Alchemy API key
   */
  private readonly apiKey: string;
  
  /**
   * Base URL for Alchemy API
   */
  private readonly baseUrl: string;
  
  /**
   * Timeout in milliseconds
   */
  private readonly timeout: number;
  
  /**
   * Maximum number of retries
   */
  private readonly maxRetries: number;
  
  /**
   * Additional options
   */
  private readonly options: Record<string, any>;
  
  /**
   * Rate limit tracking
   */
  private rateLimitRemaining: number = 0;
  private rateLimitTotal: number = 0;
  private rateLimitReset: number = 0;
  
  /**
   * Constructor
   * @param config Provider configuration
   */
  constructor(config: AlchemyProviderConfig) {
    super();
    
    this._network = config.network.toLowerCase();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://{network}.g.alchemy.com/v2/';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.options = config.options || {};
  }
  
  /**
   * Get the network
   */
  public get network(): string {
    return this._network;
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
  
  /**
   * Initialize the provider
   */
  public async initialize(): Promise<void> {
    try {
      // Map network name to Alchemy network name
      const alchemyNetwork = this.mapNetworkName(this._network);
      
      // Create URL
      const url = this.baseUrl.replace('{network}', alchemyNetwork) + this.apiKey;
      
      // Create provider
      this._provider = new JsonRpcProvider(url);
      
      // Add custom headers if provided in options
      if (this.options?.headers) {
        (this._provider as any)._getConnection().headers = {
          ...(this._provider as any)._getConnection().headers,
          ...this.options.headers
        };
      }
      
      // Add response interceptor to track rate limits
      const originalFetch = (this._provider as any)._getConnection().fetch;
      (this._provider as any)._getConnection().fetch = async (url: string, options: any) => {
        const response = await originalFetch(url, options);
        
        // Extract rate limit headers if present
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        const rateLimitLimit = response.headers.get('x-ratelimit-limit');
        const rateLimitReset = response.headers.get('x-ratelimit-reset');
        
        if (rateLimitRemaining) this.rateLimitRemaining = parseInt(rateLimitRemaining, 10);
        if (rateLimitLimit) this.rateLimitTotal = parseInt(rateLimitLimit, 10);
        if (rateLimitReset) this.rateLimitReset = parseInt(rateLimitReset, 10) * 1000; // Convert to ms
        
        return response;
      };
      
      // Test provider
      await this.testProvider();
      
      this.logger.log(`Initialized Alchemy provider for ${this._network}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to initialize Alchemy provider for ${this._network}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new Error(
        `Failed to initialize Alchemy provider: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Get provider statistics
   * @returns Provider statistics
   */
  public getStats(): ProviderStats {
    const baseStats = this.getBaseStats();
    
    // Add rate limit information if available
    if (this.rateLimitTotal > 0) {
      return {
        ...baseStats,
        rateLimitStatus: {
          remaining: this.rateLimitRemaining,
          limit: this.rateLimitTotal,
          resetTimestamp: this.rateLimitReset
        }
      };
    }
    
    return baseStats;
  }
  
  /**
   * Map network name to Alchemy network name
   * @param network Network name
   * @returns Alchemy network name
   */
  private mapNetworkName(network: string): string {
    // Map network name to Alchemy network identifier
    const networkMap: Record<string, string> = {
      'ethereum': 'eth-mainnet',
      'mainnet': 'eth-mainnet',
      'goerli': 'eth-goerli',
      'sepolia': 'eth-sepolia',
      'optimism': 'opt-mainnet',
      'optimism-goerli': 'opt-goerli',
      'arbitrum': 'arb-mainnet',
      'arbitrum-goerli': 'arb-goerli',
      'polygon': 'polygon-mainnet',
      'polygon-mumbai': 'polygon-mumbai',
      'base': 'base-mainnet',
      'base-goerli': 'base-goerli'
    };
    
    const alchemyNetwork = networkMap[network.toLowerCase()];
    if (!alchemyNetwork) {
      throw new Error(`Unsupported network for Alchemy: ${network}`);
    }
    
    return alchemyNetwork;
  }
}
