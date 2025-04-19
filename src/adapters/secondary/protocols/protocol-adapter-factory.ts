import { ProtocolAdapterPort } from '@domain/ports/secondary/protocol-adapter.port';
import { AaveV2EthereumAdapter } from './aave/v2/ethereum/aave-v2-ethereum-adapter';
import { AaveV3EthereumAdapter } from './aave/v3/ethereum/aave-v3-ethereum-adapter';

/**
 * Factory for creating protocol adapters
 */
export class ProtocolAdapterFactory {
  // Cache of created adapters
  private static adapters: Map<string, ProtocolAdapterPort> = new Map();
  
  /**
   * Create a protocol adapter for the specified protocol and network
   * @param protocol Protocol identifier (e.g., "aave-v2", "aave-v3", "silo")
   * @param network Network identifier (e.g., "ethereum", "optimism", "arbitrum", "base")
   * @param config Configuration for the adapter
   * @returns Protocol adapter instance
   */
  public static createAdapter(
    protocol: string, 
    network: string,
    config: any
  ): ProtocolAdapterPort {
    // Create a unique key for caching
    const key = `${protocol}-${network}`;
    
    // Return cached adapter if available
    if (this.adapters.has(key)) {
      return this.adapters.get(key)!;
    }
    
    // Create new adapter based on protocol and network
    let adapter: ProtocolAdapterPort;
    
    switch (key) {
      case 'aave-v2-ethereum':
        adapter = new AaveV2EthereumAdapter(config);
        break;
      case 'aave-v3-ethereum':
        adapter = new AaveV3EthereumAdapter(config);
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
    
    return adapter;
  }
  
  /**
   * Get all created adapters
   * @returns Array of created adapters
   */
  public static getAllAdapters(): ProtocolAdapterPort[] {
    return Array.from(this.adapters.values());
  }
  
  /**
   * Clean up all adapters
   */
  public static async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.adapters.values()).map(adapter => adapter.cleanup());
    await Promise.all(cleanupPromises);
    this.adapters.clear();
  }
}
