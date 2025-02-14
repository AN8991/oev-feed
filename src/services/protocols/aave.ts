import { 
  ProtocolDataService, 
  Protocol, 
  UserProtocolPosition, 
  DataSourceType, 
  ProtocolQueryParams
} from '../../types/protocols';
import { Network } from '../../types/networks';
import { AlchemyProvider } from '../../config/providers/alchemy';
import { ENV } from '../../config/env';
import { log } from '../../utils/logger';
import { BaseProtocolService, ProtocolConfig } from './base';
import { NETWORK_CONFIGS } from '../../types/networks';
import { ethers } from 'ethers';

export class AaveService extends BaseProtocolService implements ProtocolDataService {
  private readonly protocol = Protocol.AAVE;

  constructor() {
    // Use network configuration for RPC URL
    const networkConfig = NETWORK_CONFIGS[Network.ETHEREUM];
    const config: ProtocolConfig = {
      network: Network.ETHEREUM,
      rpcUrl: networkConfig.rpcUrl,
      wsUrl: networkConfig.wsUrl
    };

    super(config);

    // Validate Alchemy API key during service initialization
    try {
      ENV.validateAlchemyApiKey();
    } catch (error) {
      log.error('Alchemy API key validation failed', { error });
      throw error;
    }
  }

  getDataSourceType(): DataSourceType {
    return DataSourceType.ON_CHAIN;
  }

  // Implement the method from base service
  async fetchUserPositions(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    const { userAddress, fromTimestamp, toTimestamp, protocolSpecificFilters } = params;

    if (!userAddress) {
      throw new Error('User address is required for fetching Aave positions');
    }

    try {
      // Use Alchemy provider with API key from ENV
      const httpUrl = AlchemyProvider.getHttpUrl(Network.ETHEREUM, ENV.ALCHEMY_API_KEY);
      
      // Log the fetch attempt
      log.info('Fetching Aave positions', { 
        userAddress, 
        fromTimestamp, 
        toTimestamp, 
        protocolSpecificFilters,
        providerUrl: httpUrl 
      });

      // Use the base service's fallback mechanism
      return await super.fetchUserPositions(params);

    } catch (error) {
      log.error('Failed to fetch Aave positions', { 
        userAddress, 
        error 
      });
      throw error;
    }
  }

  protected async fetchFromSubgraph(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    // Implement subgraph fetching logic
    log.info('Attempting to fetch positions from subgraph');
    throw new Error('Subgraph fetching not implemented');
  }

  protected async fetchFromOnChain(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    const { userAddress } = params;

    // Validate userAddress is provided
    if (!userAddress) {
      throw new Error('User address is required for fetching on-chain positions');
    }

    try {
      // Get managed provider instance
      const provider = await this.getProvider();
      
      // TODO: Replace with actual Aave contract interaction
      // This is a placeholder implementation
      log.info('Fetching on-chain Aave positions', { userAddress });

      return [{
        protocol: this.protocol,
        network: this.network,
        userAddress,
        collateral: null,
        debt: null,
        healthFactor: 'N/A',
        liquidationRisk: undefined,
        borrowedAssets: [],
        timestamp: Date.now(),
        periodStart: params.fromTimestamp,
        periodEnd: params.toTimestamp
      }];
    } catch (error) {
      log.error('Error fetching on-chain positions', { error, userAddress });
      throw error;
    }
  }

  // Public method to expose protected fetchFromOnChain
  public async testFetchFromOnChain(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    return this.fetchFromOnChain(params);
  }

  // Implement method from base service
  async getHealthFactor(params: {
    protocol: Protocol;
    network: Network;
    fromTimestamp: number;
    toTimestamp: number;
    userAddress: string;
  }): Promise<string> {
    // Placeholder implementation
    return '0.0';
  }

  // Implement method from base service
  async getPositions(params: {
    protocol: Protocol;
    network: Network;
    fromTimestamp: number;
    toTimestamp: number;
    userAddress: string;
  }): Promise<UserProtocolPosition[]> {
    return this.fetchUserPositions({
      userAddress: params.userAddress,
      protocol: params.protocol,
      network: params.network,
      fromTimestamp: params.fromTimestamp,
      toTimestamp: params.toTimestamp
    });
  }

  // Override cleanup to handle Aave-specific resources
  protected async cleanup(): Promise<void> {
    try {
      // Clean up any Aave-specific resources here
      
      // Call base class cleanup
      await super.cleanup();
    } catch (error) {
      log.error('Error during Aave service cleanup', { error });
      throw error;
    }
  }
}
