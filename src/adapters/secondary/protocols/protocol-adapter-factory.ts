import { Injectable, Logger } from '@nestjs/common';
import { ProtocolAdapterPort } from '../../../domain/ports/secondary/protocol-adapter.port';
import { AaveV2EthereumAdapter } from './aave/v2/ethereum/aave-v2-ethereum-adapter';
import { AaveV3EthereumAdapter } from './aave/v3/ethereum/aave-v3-ethereum-adapter';
import { AavePositionMapper } from '../../../application/mappers/aave-position.mapper';

/**
 * Injectable factory for creating protocol adapters
 * Follows NestJS dependency injection patterns
 */
@Injectable()
export class ProtocolAdapterFactory {
  private readonly logger = new Logger(ProtocolAdapterFactory.name);
  
  // Cache of created adapters
  private readonly adapters: Map<string, ProtocolAdapterPort> = new Map();
  
  constructor(private readonly aavePositionMapper: AavePositionMapper) {}
  
  /**
   * Create a protocol adapter for the specified protocol and network
   * @param protocol Protocol identifier (e.g., "aave-v2", "aave-v3", "silo")
   * @param network Network identifier (e.g., "ethereum", "optimism", "arbitrum", "base")
   * @param config Configuration for the adapter
   * @returns Protocol adapter instance
   */
  public createAdapter(
    protocol: string, 
    network: string,
    config: any
  ): ProtocolAdapterPort {
    // Create a unique key for caching
    const key = `${protocol}-${network}`;
    
    // Return cached adapter if available
    if (this.adapters.has(key)) {
      this.logger.debug(`Returning cached adapter for ${key}`);
      return this.adapters.get(key)!;
    }
    
    // Create new adapter based on protocol and network
    let adapter: ProtocolAdapterPort;
    
    try {
      switch (key) {
        case 'aave-v2-ethereum':
          adapter = new AaveV2EthereumAdapter(config, this.aavePositionMapper);
          break;
        case 'aave-v3-ethereum':
          adapter = new AaveV3EthereumAdapter(config, this.aavePositionMapper);
          break;
        // Add more cases for other protocols and networks
        // case 'aave-v3-base':
        //   adapter = new AaveV3BaseAdapter(config);
        //   break;
        // case 'silo-arbitrum':
        //   adapter = new SiloArbitrumAdapter(config);
        //   break;
        default:
          throw new Error(`Unsupported protocol and network combination: ${key}`);
      }
      
      // Cache the adapter
      this.adapters.set(key, adapter);
      
      this.logger.log(`Successfully created adapter for ${key}`);
      return adapter;
    } catch (error) {
      // Convert adapter creation failures to warnings to prevent app startup failures
      this.logger.warn(`Failed to create adapter for ${key}: ${error instanceof Error ? error.message : String(error)}`);
      throw error; // Re-throw so the service can catch and handle gracefully
    }
  }
  
  /**
   * Get all created adapters
   * @returns Array of created adapters
   */
  public getAllAdapters(): ProtocolAdapterPort[] {
    return Array.from(this.adapters.values());
  }
  
  /**
   * Get cached adapter by key
   * @param protocol Protocol identifier
   * @param network Network identifier
   * @returns Cached adapter or undefined
   */
  public getCachedAdapter(protocol: string, network: string): ProtocolAdapterPort | undefined {
    const key = `${protocol}-${network}`;
    return this.adapters.get(key);
  }
  
  /**
   * Check if adapter exists for protocol and network
   * @param protocol Protocol identifier
   * @param network Network identifier
   * @returns True if adapter exists
   */
  public hasAdapter(protocol: string, network: string): boolean {
    const key = `${protocol}-${network}`;
    return this.adapters.has(key);
  }
  
  /**
   * Clean up all adapters
   */
  public async cleanupAll(): Promise<void> {
    this.logger.log('Cleaning up all protocol adapters');
    
    const cleanupPromises = Array.from(this.adapters.values()).map(async (adapter) => {
      try {
        await adapter.cleanup();
      } catch (error) {
        this.logger.error(`Failed to cleanup adapter ${adapter.constructor.name}:`, error);
      }
    });
    
    await Promise.all(cleanupPromises);
    this.adapters.clear();
    
    this.logger.log('All protocol adapters cleaned up');
  }
  
  /**
   * Get supported protocol-network combinations
   * @returns Array of supported combinations
   */
  public getSupportedCombinations(): string[] {
    return [
      'aave-v2-ethereum',
      'aave-v3-ethereum'
      // Add more as they are implemented
    ];
  }
}
