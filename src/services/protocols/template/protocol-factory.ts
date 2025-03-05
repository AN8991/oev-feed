import { Network } from '../../../types/networks';
import { Protocol } from '../../../types/protocols';
import { log } from '../../../utils/logger';
import { BaseProtocolServiceFactory } from '../common/protocol-factory';
import { ProtocolService } from './protocol-service';
import { ProtocolConfig, ProtocolConfigBuilder } from './protocol-config';

/**
 * Factory for creating Protocol service instances
 */
export class ProtocolServiceFactory extends BaseProtocolServiceFactory<ProtocolService, ProtocolConfig> {
  private static instance: ProtocolServiceFactory;
  
  private constructor() {
    super(Protocol.PROTOCOL); // Replace with actual protocol enum value
  }
  
  /**
   * Get the singleton instance of the factory
   */
  static getInstance(): ProtocolServiceFactory {
    if (!ProtocolServiceFactory.instance) {
      ProtocolServiceFactory.instance = new ProtocolServiceFactory();
    }
    return ProtocolServiceFactory.instance;
  }
  
  /**
   * Create a new Protocol service instance
   * @param config Service configuration
   */
  async createService(config: ProtocolConfig): Promise<ProtocolService> {
    const key = this.getServiceKey(config);
    
    // Return existing service if available
    if (this.services.has(key)) {
      return this.services.get(key)!;
    }
    
    try {
      log.info('Creating Protocol service', { 
        network: config.network,
        rpcUrl: config.rpcUrl
      });
      
      // Create new service
      const service = new ProtocolService(config);
      
      // Initialize service
      await service.initialize();
      
      // Store service
      this.services.set(key, service);
      
      log.info('Protocol service created successfully', { key });
      
      return service;
    } catch (error) {
      log.error('Failed to create Protocol service', { error, config });
      throw error;
    }
  }
  
  /**
   * Get a service instance for a specific network
   * @param network The network to get a service for
   */
  async getServiceForNetwork(network: Network): Promise<ProtocolService> {
    // Check if service already exists
    const existingKey = Array.from(this.services.keys()).find(key => key.includes(network));
    if (existingKey) {
      return this.services.get(existingKey)!;
    }
    
    // Create configuration for the network
    const config = this.createConfigForNetwork(network);
    
    // Create and return service
    return this.createService(config);
  }
  
  /**
   * Create configuration for a specific network
   * @param network The network to create configuration for
   */
  private createConfigForNetwork(network: Network): ProtocolConfig {
    const builder = new ProtocolConfigBuilder();
    
    switch (network) {
      case Network.ETHEREUM:
        return builder
          .withNetwork(Network.ETHEREUM)
          .withRpcUrl(process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/your-api-key')
          .withWsUrl(process.env.ETHEREUM_WS_URL)
          .withSubgraphUrl(process.env.PROTOCOL_SUBGRAPH_URL || 'https://api.thegraph.com/subgraphs/name/protocol/subgraph')
          .withContractAddress('0x1234567890123456789012345678901234567890') // Replace with actual contract address
          .withApiKey(process.env.ALCHEMY_API_KEY || '')
          .withRetryAttempts(3)
          .build();
          
      case Network.POLYGON:
        return builder
          .withNetwork(Network.POLYGON)
          .withRpcUrl(process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/your-api-key')
          .withWsUrl(process.env.POLYGON_WS_URL)
          .withSubgraphUrl(process.env.PROTOCOL_POLYGON_SUBGRAPH_URL || 'https://api.thegraph.com/subgraphs/name/protocol/polygon-subgraph')
          .withContractAddress('0x1234567890123456789012345678901234567890') // Replace with actual contract address
          .withApiKey(process.env.ALCHEMY_API_KEY || '')
          .withRetryAttempts(3)
          .build();
          
      // Add other networks as needed
          
      default:
        throw new Error(`Unsupported network for Protocol service: ${network}`);
    }
  }
}
