import { JsonRpcProvider } from 'ethers';
import { BaseProviderAdapter } from './base-provider.adapter';
import { ProviderAdapterPort, ProviderStats } from '@domain/ports/secondary/provider-adapter.port';
import { logger, LogCategory, LogContext } from '@infrastructure/utils/structured-logger';

/**
 * Infura provider adapter configuration
 */
export interface InfuraProviderConfig {
  /**
   * API key for Infura (can be project ID or project ID:secret)
   */
  apiKey: string;
  
  /**
   * Network name
   */
  network: string;
  
  /**
   * Base URL for Infura API (optional)
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
 * Infura provider adapter
 * Implements the provider adapter port for Infura
 */
export class InfuraProviderAdapter extends BaseProviderAdapter implements ProviderAdapterPort {
  /**
   * Provider name
   */
  public readonly name: string = 'Infura';
  
  /**
   * Provider type
   */
  public readonly type: string = 'infura';
  
  /**
   * Network name
   */
  private readonly _network: string;
  
  /**
   * Project ID and secret
   */
  private projectId: string;
  private projectSecret?: string;
  
  /**
   * Base URL for Infura API
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
  constructor(config: InfuraProviderConfig) {
    super();
    
    this._network = config.network.toLowerCase();
    this.baseUrl = config.baseUrl || 'https://{network}.infura.io/v3/';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.options = config.options || {};
    
    // Extract project ID and secret from API key
    if (config.apiKey.includes(':')) {
      const [id, secret] = config.apiKey.split(':');
      this.projectId = id;
      this.projectSecret = secret;
    } else {
      this.projectId = config.apiKey;
    }
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
      // Map network name to Infura network
      const infuraNetwork = this.mapNetworkName(this._network);
      
      // Create Infura provider URL
      let url = this.baseUrl.replace('{network}', infuraNetwork) + this.projectId;
      
      // Add project secret if available
      if (this.projectSecret) {
        url = `https://${this.projectId}:${this.projectSecret}@${infuraNetwork}.infura.io/v3/${this.projectId}`;
      }
      
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
        const rateLimitRemaining = response.headers.get('infura-ratelimit-remaining');
        const rateLimitLimit = response.headers.get('infura-ratelimit-limit');
        const rateLimitReset = response.headers.get('infura-ratelimit-reset');
        
        if (rateLimitRemaining) this.rateLimitRemaining = parseInt(rateLimitRemaining, 10);
        if (rateLimitLimit) this.rateLimitTotal = parseInt(rateLimitLimit, 10);
        if (rateLimitReset) this.rateLimitReset = parseInt(rateLimitReset, 10) * 1000; // Convert to ms
        
        return response;
      };
      
      // Test provider
      await this.testProvider();
      
      logger.info(`Initialized Infura provider for ${this._network}`);
    } catch (error: unknown) {
      logger.error(
        `Failed to initialize Infura provider for ${this._network}:`,
        LogCategory.PROVIDER,
        { error: error instanceof Error ? error.message : String(error) }
      );
      throw new Error(
        `Failed to initialize Infura provider: ${error instanceof Error ? error.message : String(error)}`
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
   * Map network name to Infura network identifier
   * @param network Network name
   * @returns Infura network identifier
   */
  private mapNetworkName(network: string): string {
    // Map network name to Infura network identifier
    const networkMap: Record<string, string> = {
      'ethereum': 'mainnet',
      'mainnet': 'mainnet',
      'goerli': 'goerli',
      'sepolia': 'sepolia',
      'optimism': 'optimism-mainnet',
      'optimism-goerli': 'optimism-goerli',
      'arbitrum': 'arbitrum-mainnet',
      'arbitrum-goerli': 'arbitrum-goerli',
      'polygon': 'polygon-mainnet',
      'polygon-mumbai': 'polygon-mumbai',
      'base': 'base-mainnet',
      'base-goerli': 'base-goerli'
    };
    
    const infuraNetwork = networkMap[network.toLowerCase()];
    if (!infuraNetwork) {
      throw new Error(`Unsupported network for Infura: ${network}`);
    }
    
    return infuraNetwork;
  }
}
