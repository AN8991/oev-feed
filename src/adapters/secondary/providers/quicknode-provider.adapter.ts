import { JsonRpcProvider } from 'ethers';
import { BaseProviderAdapter } from './base-provider.adapter';
import { ProviderAdapterPort, ProviderStats } from '@domain/ports/secondary/provider-adapter.port';

/**
 * QuickNode provider adapter configuration
 */
export interface QuickNodeProviderConfig {
  /**
   * API key/endpoint URL for QuickNode
   * QuickNode provides unique endpoint URLs per project
   */
  apiKey: string;
  
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
 * QuickNode provider adapter
 * Implements the provider adapter port for QuickNode
 * 
 * QuickNode provides dedicated RPC endpoints with high performance.
 * Each endpoint has a unique URL format: https://{endpoint-name}.quiknode.pro/{token}
 */
export class QuickNodeProviderAdapter extends BaseProviderAdapter implements ProviderAdapterPort {

  /**
   * Provider name
   */
  public readonly name: string = 'QuickNode';
  
  /**
   * Provider type
   */
  public readonly type: string = 'quicknode';
  
  /**
   * Network name
   */
  private readonly _network: string;
  
  /**
   * QuickNode endpoint URL or API key
   */
  private readonly apiKey: string;
  
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
  constructor(config: QuickNodeProviderConfig) {
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
      // QuickNode can use either a full URL or construct one
      let url: string;
      
      if (this.apiKey.startsWith('http')) {
        // Full URL provided
        url = this.apiKey;
      } else {
        // Construct URL using Chainstack format (as configured in NetworkConfigService)
        const networkPath = this.mapNetworkName(this._network);
        url = `https://${networkPath}.core.chainstack.com/${this.apiKey}`;
      }
      
      // Create provider
      this._provider = new JsonRpcProvider(url);
      
      // Test provider
      await this.testProvider();
      
      this.logger.log(`Initialized QuickNode provider for ${this._network}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to initialize QuickNode provider for ${this._network}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new Error(
        `Failed to initialize QuickNode provider: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Get provider statistics
   * @returns Provider statistics
   */
  public getStats(): ProviderStats {
    const baseStats = this.getBaseStats();
    
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
   * Map network name to QuickNode/Chainstack network path
   * @param network Network name
   * @returns Network path for URL
   */
  private mapNetworkName(network: string): string {
    const networkMap: Record<string, string> = {
      'ethereum': 'ethereum-mainnet',
      'mainnet': 'ethereum-mainnet',
      'polygon': 'polygon-mainnet',
      'arbitrum': 'arbitrum-mainnet',
      'optimism': 'optimism-mainnet',
      'blast': 'blast-mainnet',
      'base': 'base-mainnet',
      'avalanche': 'avalanche-mainnet',
      'bsc': 'bsc-mainnet'
    };
    
    const networkPath = networkMap[network.toLowerCase()];
    if (!networkPath) {
      throw new Error(`Unsupported network for QuickNode: ${network}`);
    }
    
    return networkPath;
  }
}
