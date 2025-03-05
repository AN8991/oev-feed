import { ethers } from 'ethers';
import { Network } from '../../../types/networks';
import { 
  Protocol, 
  UserProtocolPosition, 
  ProtocolQueryParams, 
  DataSourceType 
} from '../../../types/protocols';
import { log } from '../../../utils/logger';
import { 
  BaseProtocolService, 
  ProtocolConfig 
} from '../common/base-protocol';
import { PROTOCOL_ABI } from './abi';
import { PROTOCOL_QUERIES } from './queries';
import { ProtocolConfig } from './protocol-config';

/**
 * Service for interacting with Protocol
 */
export class ProtocolService extends BaseProtocolService {
  private contractAddress: string;
  private contract: ethers.Contract | null = null;
  
  constructor(config: ProtocolConfig) {
    super(config);
    this.contractAddress = config.contractAddress;
  }
  
  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      await super.initialize();
      
      const provider = await this.getProvider();
      
      // Initialize contracts
      this.contract = new ethers.Contract(
        this.contractAddress,
        PROTOCOL_ABI,
        provider
      );
      
      log.info('ProtocolService initialized successfully', {
        network: this.network,
        contractAddress: this.contractAddress
      });
    } catch (error) {
      log.error('Failed to initialize ProtocolService', { error });
      throw error;
    }
  }
  
  /**
   * Get the protocol this service handles
   */
  getProtocol(): Protocol {
    return Protocol.PROTOCOL; // Replace with actual protocol enum value
  }
  
  /**
   * Get the data source type for this service
   */
  getDataSourceType(): DataSourceType {
    return DataSourceType.ON_CHAIN;
  }
  
  /**
   * Fetch user positions from on-chain data
   */
  protected async fetchFromOnChain(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    if (!this.initialized || !this.contract) {
      throw new Error('ProtocolService not initialized');
    }
    
    const { userAddress } = params;
    
    try {
      log.info('Fetching Protocol positions from on-chain data', { 
        userAddress, 
        network: this.network 
      });
      
      // Implement protocol-specific logic to fetch positions
      // Example:
      // const userData = await this.contract.getUserData(userAddress);
      
      // Process the data
      const positions: UserProtocolPosition[] = [];
      
      log.info('Successfully fetched Protocol positions from on-chain data', { 
        userAddress, 
        network: this.network,
        positionsCount: positions.length
      });
      
      return positions;
    } catch (error) {
      log.error('Error fetching Protocol positions from on-chain data', { 
        error, 
        userAddress, 
        network: this.network 
      });
      throw error;
    }
  }
  
  /**
   * Fetch user positions from subgraph
   */
  protected async fetchFromSubgraph(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    if (!this.subgraphUrl) {
      throw new Error('Subgraph URL not configured for ProtocolService');
    }
    
    const { userAddress } = params;
    
    try {
      log.info('Fetching Protocol positions from subgraph', { 
        userAddress, 
        network: this.network 
      });
      
      // Fetch user data from subgraph
      const response = await fetch(this.subgraphUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: PROTOCOL_QUERIES.USER_DATA,
          variables: {
            userAddress: userAddress.toLowerCase()
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Subgraph request failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`Subgraph errors: ${JSON.stringify(data.errors)}`);
      }
      
      // Process the subgraph data
      const positions: UserProtocolPosition[] = [];
      
      log.info('Successfully fetched Protocol positions from subgraph', { 
        userAddress, 
        network: this.network,
        positionsCount: positions.length
      });
      
      return positions;
    } catch (error) {
      log.error('Error fetching Protocol positions from subgraph', { 
        error, 
        userAddress, 
        network: this.network 
      });
      throw error;
    }
  }
  
  /**
   * Get health factor for a user
   */
  async getHealthFactor(params: ProtocolQueryParams): Promise<string> {
    if (!this.initialized || !this.contract) {
      throw new Error('ProtocolService not initialized');
    }
    
    const { userAddress } = params;
    
    try {
      log.info('Fetching Protocol health factor', { 
        userAddress, 
        network: this.network 
      });
      
      // Implement protocol-specific logic to fetch health factor
      // Example:
      // const healthFactor = await this.contract.getHealthFactor(userAddress);
      
      // Default to a safe value if not applicable
      const healthFactor = '999';
      
      log.info('Successfully fetched Protocol health factor', { 
        userAddress, 
        network: this.network,
        healthFactor
      });
      
      return healthFactor;
    } catch (error) {
      log.error('Error fetching Protocol health factor', { 
        error, 
        userAddress, 
        network: this.network 
      });
      throw error;
    }
  }
  
  /**
   * Clean up resources
   */
  protected async cleanup(): Promise<void> {
    // Reset contract instances
    this.contract = null;
    
    // Call parent cleanup
    await super.cleanup();
  }
}
