import { Network } from '../../../types/networks';
import { Protocol } from '../../../types/protocols';
import { log } from '../../../utils/logger';
import { BaseProtocolServiceFactory } from '../common/protocol-factory';
import { AaveService } from './aave-service';
import { AaveConfig, AaveConfigBuilder, AaveVersion } from './aave-config';
import { AaveAddressProvider } from './aave-address-provider';
import { ethers } from 'ethers';

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
        version: config.version,
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
      log.error('Failed to create Aave service', { 
        error: error instanceof Error ? error.message : String(error),
        network: config.network,
        version: config.version
      });
      throw error;
    }
  }
  
  /**
   * Get a service instance for a specific network
   * @param network The network to get a service for
   * @param version Optional Aave version, defaults to V3
   */
  async getServiceForNetwork(
    network: Network, 
    version: AaveVersion = AaveVersion.V3
  ): Promise<AaveService> {
    // Check if service already exists for this network and version
    const existingKey = Array.from(this.services.keys())
      .find(key => key.includes(network) && key.includes(`v${version}`));
    
    if (existingKey) {
      log.debug('Using existing Aave service', { network, version, key: existingKey });
      return this.services.get(existingKey)!;
    }
    
    // Create configuration for the network and version
    const config = await this.createConfigForNetwork(network, version);
    
    // Create and return service
    return this.createService(config);
  }
  
  /**
   * Create configuration for a specific network and version
   * @param network The network to create configuration for
   * @param version The Aave version to use
   */
  private async createConfigForNetwork(
    network: Network, 
    version: AaveVersion = AaveVersion.V3
  ): Promise<AaveConfig> {
    const builder = new AaveConfigBuilder();
    
    // Get RPC URL for the network
    const rpcUrl = process.env[`${network.toUpperCase()}_RPC_URL`];
    if (!rpcUrl) {
      throw new Error(`Missing RPC URL for network: ${network}`);
    }
    
    // Create provider for address resolution if needed
    let addresses;
    
    if (version === AaveVersion.V2) {
      // For V2, we need to resolve addresses dynamically
      log.info('Resolving Aave V2 addresses dynamically', { network });
      
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      addresses = await AaveAddressProvider.resolveV2Addresses(provider, network);
    } else {
      // For V3, we can use static addresses
      addresses = AaveAddressProvider.getAddresses(network, version);
    }
    
    // Verify addresses
    if (!AaveAddressProvider.verifyAddresses(addresses)) {
      throw new Error(`Invalid Aave addresses for network: ${network}, version: ${version}`);
    }
    
    log.info('Using Aave addresses', { 
      network, 
      version,
      addresses 
    });
    
    // Get WS URL and other config values
    const wsUrl = process.env[`${network.toUpperCase()}_WS_URL`];
    const subgraphUrl = process.env.AAVE_SUBGRAPH_URL;
    const apiKey = process.env.ALCHEMY_API_KEY;
    
    return builder
      .withNetwork(network)
      .withRpcUrl(rpcUrl)
      .withWsUrl(wsUrl)
      .withSubgraphUrl(subgraphUrl)
      .withPoolAddress(addresses.poolAddress)
      .withDataProviderAddress(addresses.dataProviderAddress)
      .withOracleAddress(addresses.oracleAddress)
      .withApiKey(apiKey)
      .withRetryAttempts(3)
      .withVersion(version)
      .build();
  }
  
  /**
   * Get a unique key for a service configuration
   * @param config The service configuration
   */
  protected getServiceKey(config: AaveConfig): string {
    return `${config.network}-v${config.version}`;
  }
}
