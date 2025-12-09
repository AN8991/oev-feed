import { JsonRpcProvider } from 'ethers';
import { BaseProviderAdapter } from './base-provider.adapter';
import { ProviderAdapterPort, ProviderStats } from '@domain/ports/secondary/provider-adapter.port';

/**
 * BlockCypher provider adapter configuration
 */
export interface BlockCypherProviderConfig {
  /**
   * API token for BlockCypher
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
 * BlockCypher provider adapter
 * Implements the provider adapter port for BlockCypher
 * 
 * Note: BlockCypher is primarily a REST API service, not a full JSON-RPC provider.
 * It has limited Ethereum support compared to other providers.
 * Rate limits: 3 requests/second (free), 200/second (paid)
 */
export class BlockCypherProviderAdapter extends BaseProviderAdapter implements ProviderAdapterPort {

  /**
   * Provider name
   */
  public readonly name: string = 'BlockCypher';
  
  /**
   * Provider type
   */
  public readonly type: string = 'blockcypher';
  
  /**
   * Network name
   */
  private readonly _network: string;
  
  /**
   * BlockCypher API token
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
  private rateLimitRemaining: number = 3; // BlockCypher free tier: 3 calls/second
  private rateLimitTotal: number = 3;
  private rateLimitReset: number = 0;
  
  /**
   * Constructor
   * @param config Provider configuration
   */
  constructor(config: BlockCypherProviderConfig) {
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
      // Map network name to BlockCypher network identifier
      const blockcypherNetwork = this.mapNetworkName(this._network);
      
      // BlockCypher doesn't provide standard JSON-RPC endpoints
      // We'll use their API endpoint format, but note this has limited functionality
      // For full RPC support, consider using a different provider
      const url = `https://api.blockcypher.com/v1/${blockcypherNetwork}/main?token=${this.apiKey}`;
      
      // Create provider - Note: This may have limited functionality
      // BlockCypher is primarily a REST API, not JSON-RPC
      this._provider = new JsonRpcProvider(url);
      
      // Test provider
      await this.testProvider();
      
      this.logger.log(`Initialized BlockCypher provider for ${this._network}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to initialize BlockCypher provider for ${this._network}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new Error(
        `Failed to initialize BlockCypher provider: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Get provider statistics
   * @returns Provider statistics
   */
  public getStats(): ProviderStats {
    const baseStats = this.getBaseStats();
    
    return {
      ...baseStats,
      rateLimitStatus: {
        remaining: this.rateLimitRemaining,
        limit: this.rateLimitTotal,
        resetTimestamp: this.rateLimitReset
      }
    };
  }
  
  /**
   * Map network name to BlockCypher network identifier
   * @param network Network name
   * @returns BlockCypher network identifier
   */
  private mapNetworkName(network: string): string {
    const networkMap: Record<string, string> = {
      'ethereum': 'eth',
      'mainnet': 'eth',
      'bitcoin': 'btc',
      'litecoin': 'ltc',
      'dogecoin': 'doge',
      'dash': 'dash'
    };
    
    const blockcypherNetwork = networkMap[network.toLowerCase()];
    if (!blockcypherNetwork) {
      throw new Error(`Unsupported network for BlockCypher: ${network}. BlockCypher has limited Ethereum support.`);
    }
    
    return blockcypherNetwork;
  }
}
