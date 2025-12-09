import { JsonRpcProvider } from 'ethers';
import { BaseProviderAdapter } from './base-provider.adapter';
import { ProviderAdapterPort, ProviderStats } from '@domain/ports/secondary/provider-adapter.port';

/**
 * BlockDaemon provider adapter configuration
 */
export interface BlockDaemonProviderConfig {
  /**
   * API key for BlockDaemon
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
 * BlockDaemon provider adapter
 * Implements the provider adapter port for BlockDaemon
 * 
 * BlockDaemon provides enterprise-grade blockchain infrastructure.
 * URL format: https://svc.blockdaemon.com/{network}/mainnet/native?apikey={apiKey}
 */
export class BlockDaemonProviderAdapter extends BaseProviderAdapter implements ProviderAdapterPort {

  /**
   * Provider name
   */
  public readonly name: string = 'BlockDaemon';
  
  /**
   * Provider type
   */
  public readonly type: string = 'blockdaemon';
  
  /**
   * Network name
   */
  private readonly _network: string;
  
  /**
   * BlockDaemon API key
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
  constructor(config: BlockDaemonProviderConfig) {
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
      // Map network name to BlockDaemon network identifier
      const blockdaemonNetwork = this.mapNetworkName(this._network);
      
      // Build URL
      const url = `https://svc.blockdaemon.com/${blockdaemonNetwork}/mainnet/native?apikey=${this.apiKey}`;
      
      // Create provider
      this._provider = new JsonRpcProvider(url);
      
      // Test provider
      await this.testProvider();
      
      this.logger.log(`Initialized BlockDaemon provider for ${this._network}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to initialize BlockDaemon provider for ${this._network}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new Error(
        `Failed to initialize BlockDaemon provider: ${error instanceof Error ? error.message : String(error)}`
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
   * Map network name to BlockDaemon network identifier
   * @param network Network name
   * @returns BlockDaemon network identifier
   */
  private mapNetworkName(network: string): string {
    const networkMap: Record<string, string> = {
      'ethereum': 'ethereum',
      'mainnet': 'ethereum',
      'polygon': 'polygon',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'blast': 'blast',
      'avalanche': 'avalanche',
      'bsc': 'bsc',
      'fantom': 'fantom',
      'solana': 'solana'
    };
    
    const blockdaemonNetwork = networkMap[network.toLowerCase()];
    if (!blockdaemonNetwork) {
      throw new Error(`Unsupported network for BlockDaemon: ${network}`);
    }
    
    return blockdaemonNetwork;
  }
}
