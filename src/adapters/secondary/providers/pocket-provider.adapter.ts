import { JsonRpcProvider } from 'ethers';
import { BaseProviderAdapter } from './base-provider.adapter';
import { ProviderAdapterPort, ProviderStats } from '@domain/ports/secondary/provider-adapter.port';

/**
 * Pocket Network provider adapter configuration
 */
export interface PocketProviderConfig {
  /**
   * API key (Portal ID) for Pocket Network
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
 * Pocket Network provider adapter
 * Implements the provider adapter port for Pocket Network
 * 
 * Pocket Network is a decentralized RPC infrastructure.
 * URL format: https://{network}.gateway.pokt.network/v1/lb/{portalId}
 */
export class PocketProviderAdapter extends BaseProviderAdapter implements ProviderAdapterPort {

  /**
   * Provider name
   */
  public readonly name: string = 'Pocket';
  
  /**
   * Provider type
   */
  public readonly type: string = 'pocket';
  
  /**
   * Network name
   */
  private readonly _network: string;
  
  /**
   * Pocket Portal ID
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
  constructor(config: PocketProviderConfig) {
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
      // Map network name to Pocket network identifier
      const pocketNetwork = this.mapNetworkName(this._network);
      
      // Build URL
      const url = `https://${pocketNetwork}.gateway.pokt.network/v1/lb/${this.apiKey}`;
      
      // Create provider
      this._provider = new JsonRpcProvider(url);
      
      // Test provider
      await this.testProvider();
      
      this.logger.log(`Initialized Pocket provider for ${this._network}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to initialize Pocket provider for ${this._network}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new Error(
        `Failed to initialize Pocket provider: ${error instanceof Error ? error.message : String(error)}`
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
   * Map network name to Pocket network identifier
   * @param network Network name
   * @returns Pocket network identifier
   */
  private mapNetworkName(network: string): string {
    const networkMap: Record<string, string> = {
      'ethereum': 'eth-mainnet',
      'mainnet': 'eth-mainnet',
      'polygon': 'poly-mainnet',
      'arbitrum': 'arbitrum-one',
      'optimism': 'optimism-mainnet',
      'blast': 'blast-mainnet',
      'avalanche': 'avax-mainnet',
      'bsc': 'bsc-mainnet',
      'fantom': 'fantom-mainnet',
      'gnosis': 'gnosis-mainnet',
      'harmony': 'harmony-0'
    };
    
    const pocketNetwork = networkMap[network.toLowerCase()];
    if (!pocketNetwork) {
      throw new Error(`Unsupported network for Pocket: ${network}`);
    }
    
    return pocketNetwork;
  }
}
