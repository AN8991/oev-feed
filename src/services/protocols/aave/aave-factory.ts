import { Network } from '../../../types/networks';
import { Protocol } from '../../../types/protocols';
import { log } from '../../../utils/logger';
import { BaseProtocolServiceFactory } from '../common/protocol-factory';
import { AaveService } from './aave-service';
import { AaveConfig, AaveConfigBuilder } from './aave-config';
import { CONTRACT_ADDRESSES } from '../../../config/contracts';

/**
 * Factory for creating Aave service instances
 */
export class AaveServiceFactory extends BaseProtocolServiceFactory<AaveService, AaveConfig> {
  private static instance: AaveServiceFactory;
  
  private constructor() {
    super(Protocol.AAVE);
  }
  
  /**
   * Get the singleton instance of the factory
   */
  static getInstance(): AaveServiceFactory {
    if (!AaveServiceFactory.instance) {
      AaveServiceFactory.instance = new AaveServiceFactory();
    }
    return AaveServiceFactory.instance;
  }
  
  /**
   * Create a new Aave service instance
   * @param config Service configuration
   */
  async createService(config: AaveConfig): Promise<AaveService> {
    const key = this.getServiceKey(config);
    
    // Return existing service if available
    if (this.services.has(key)) {
      return this.services.get(key)!;
    }
    
    try {
      log.info('Creating Aave service', { 
        network: config.network,
        rpcUrl: config.rpcUrl
      });
      
      // Create new service
      const service = new AaveService(config);
      
      // Initialize service
      await service.initialize();
      
      // Store service
      this.services.set(key, service);
      
      log.info('Aave service created successfully', { key });
      
      return service;
    } catch (error) {
      log.error('Failed to create Aave service', { error, config });
      throw error;
    }
  }
  
  /**
   * Get a service instance for a specific network
   * @param network The network to get a service for
   */
  async getServiceForNetwork(network: Network): Promise<AaveService> {
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
  private createConfigForNetwork(network: Network): AaveConfig {
    const builder = new AaveConfigBuilder();
    
    switch (network) {
      case Network.ETHEREUM:
        const contracts = CONTRACT_ADDRESSES.AAVE.V3_ETH_MAINNET;
        return builder
          .withNetwork(Network.ETHEREUM)
          .withRpcUrl(process.env.ETHEREUM_RPC_URL)
          .withWsUrl(process.env.ETHEREUM_WS_URL)
          .withSubgraphUrl(process.env.AAVE_SUBGRAPH_URL)
          .withPoolAddress(contracts.POOL)
          .withDataProviderAddress(contracts.POOL_DATA_PROVIDER)
          .withOracleAddress(contracts.ORACLE)
          .withApiKey(process.env.ALCHEMY_API_KEY)
          .withRetryAttempts(3)
          .build();
          
      default:
        throw new Error(`Unsupported network for Aave service: ${network}`);
    }
  }
}
