import { JsonRpcProvider } from 'ethers';
import { BaseProviderAdapter } from './base-provider.adapter';
import { ProviderAdapterPort, ProviderStats } from '@domain/ports/secondary/provider-adapter.port';

/**
 * Ankr provider adapter configuration
 */
export interface AnkrProviderConfig {
  /**
   * API key for Ankr (optional - Ankr has free tier)
   */
  apiKey?: string;
  
  /**
   * Network name
   */
  network: string;
  
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
 * Ankr provider adapter
 * Implements the provider adapter port for Ankr
 * 
 * Ankr provides free and premium RPC endpoints with good rate limits.
 * Free tier: 30 requests/second
 * Premium tier: Higher limits based on plan
 */
export class AnkrProviderAdapter extends BaseProviderAdapter implements ProviderAdapterPort {

  /**
   * Provider name
   */
  public readonly name: string = 'Ankr';
  
  /**
   * Provider type
   */
  public readonly type: string = 'ankr';
  
  /**
   * Network name
   */
  private readonly _network: string;
  
  /**
   * Ankr API key (optional)
   */
  private readonly apiKey?: string;
  
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
  constructor(config: AnkrProviderConfig) {
    super();
    
    this._network = config.network.toLowerCase();
    this.apiKey = config.apiKey;
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
   * Initialize the provider
   */
  public async initialize(): Promise<void> {
    try {
      // Map network name to Ankr network identifier
      const ankrNetwork = this.mapNetworkName(this._network);
      
      // Build URL - Ankr uses format: https://rpc.ankr.com/{network}/{apiKey}
      let url = `https://rpc.ankr.com/${ankrNetwork}`;
      if (this.apiKey) {
        url += `/${this.apiKey}`;
      }
      
      // Create provider
      this._provider = new JsonRpcProvider(url);
      
      // Test provider
      await this.testProvider();
      
      this.logger.log(`Initialized Ankr provider for ${this._network}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to initialize Ankr provider for ${this._network}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new Error(
        `Failed to initialize Ankr provider: ${error instanceof Error ? error.message : String(error)}`
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
   * Map network name to Ankr network identifier
   * @param network Network name
   * @returns Ankr network identifier
   */
  private mapNetworkName(network: string): string {
    const networkMap: Record<string, string> = {
      'ethereum': 'eth',
      'mainnet': 'eth',
      'polygon': 'polygon',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'blast': 'blast',
      'base': 'base',
      'avalanche': 'avalanche',
      'bsc': 'bsc',
      'fantom': 'fantom',
      'gnosis': 'gnosis',
      'celo': 'celo',
      'moonbeam': 'moonbeam',
      'harmony': 'harmony'
    };
    
    const ankrNetwork = networkMap[network.toLowerCase()];
    if (!ankrNetwork) {
      throw new Error(`Unsupported network for Ankr: ${network}`);
    }
    
    return ankrNetwork;
  }
}
