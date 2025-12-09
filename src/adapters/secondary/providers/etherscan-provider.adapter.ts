import { JsonRpcProvider, EtherscanProvider as EthersEtherscanProvider } from 'ethers';
import { BaseProviderAdapter } from './base-provider.adapter';
import { ProviderAdapterPort, ProviderStats } from '@domain/ports/secondary/provider-adapter.port';

/**
 * Etherscan provider adapter configuration
 */
export interface EtherscanProviderConfig {
  /**
   * API key for Etherscan
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
 * Etherscan provider adapter
 * Implements the provider adapter port for Etherscan
 * 
 * Note: Etherscan is primarily an API service, not a full RPC provider.
 * It has limited RPC functionality but is useful for specific queries.
 * Rate limits: 5 calls/second (free), higher for paid plans.
 */
export class EtherscanProviderAdapter extends BaseProviderAdapter implements ProviderAdapterPort {

  /**
   * Provider name
   */
  public readonly name: string = 'Etherscan';
  
  /**
   * Provider type
   */
  public readonly type: string = 'etherscan';
  
  /**
   * Network name
   */
  private readonly _network: string;
  
  /**
   * Etherscan API key
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
  private rateLimitRemaining: number = 5; // Etherscan free tier: 5 calls/second
  private rateLimitTotal: number = 5;
  private rateLimitReset: number = 0;
  
  /**
   * Constructor
   * @param config Provider configuration
   */
  constructor(config: EtherscanProviderConfig) {
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
      // Map network name to Etherscan network identifier
      const etherscanNetwork = this.mapNetworkName(this._network);
      
      // Use ethers built-in EtherscanProvider for better compatibility
      // Note: EtherscanProvider has limited RPC functionality
      // For full RPC, we use a JsonRpcProvider with Etherscan's RPC endpoint
      const rpcUrl = this.getRpcUrl(etherscanNetwork);
      
      if (rpcUrl) {
        // Use RPC endpoint if available
        this._provider = new JsonRpcProvider(rpcUrl);
      } else {
        // Fall back to ethers EtherscanProvider
        this._provider = new EthersEtherscanProvider(etherscanNetwork, this.apiKey);
      }
      
      // Test provider
      await this.testProvider();
      
      this.logger.log(`Initialized Etherscan provider for ${this._network}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to initialize Etherscan provider for ${this._network}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new Error(
        `Failed to initialize Etherscan provider: ${error instanceof Error ? error.message : String(error)}`
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
   * Get RPC URL for Etherscan (if available)
   * @param network Network identifier
   * @returns RPC URL or undefined
   */
  private getRpcUrl(network: string): string | undefined {
    // Etherscan doesn't provide traditional RPC endpoints
    // Return undefined to use EtherscanProvider
    return undefined;
  }
  
  /**
   * Map network name to Etherscan network identifier
   * @param network Network name
   * @returns Etherscan network identifier (for ethers EtherscanProvider)
   */
  private mapNetworkName(network: string): string {
    const networkMap: Record<string, string> = {
      'ethereum': 'mainnet',
      'mainnet': 'mainnet',
      'goerli': 'goerli',
      'sepolia': 'sepolia',
      'polygon': 'matic',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'base': 'base'
    };
    
    const etherscanNetwork = networkMap[network.toLowerCase()];
    if (!etherscanNetwork) {
      throw new Error(`Unsupported network for Etherscan: ${network}`);
    }
    
    return etherscanNetwork;
  }
}
