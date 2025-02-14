import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { AAVE_POOL_ABI, AAVE_POOL_DATA_PROVIDER_ABI, AAVE_ORACLE_ABI } from './abi';
import { BaseProtocolService, QueryParams } from '../base';
import { UserProtocolPosition, Protocol, ProtocolDataService, ProtocolQueryParams, DataSourceType } from '@/types/protocols';
import { log } from '@/utils/logger';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { Network } from '@/types/networks';
import { NotificationService } from '@/services/notifications';
import { NETWORK_CONFIGS } from '@/types/networks';

// Interface representing a user's position in Aave protocol
interface AavePosition {
  userAddress?: string;
  collateral: string;
  debt: string;
  healthFactor: string;
  timestamp: Date;
  details: string | { 
    borrowedAssets?: string;
    liquidationRisk?: {
      threshold: string;
      currentLTV: string;
    };
  };
  borrowedAssets?: string;
}

// Interface defining the Aave smart contract instances required for interactions
interface AaveContracts {
  pool: ethers.Contract;        // Main Aave lending pool contract
  poolDataProvider: ethers.Contract; // Contract providing additional pool data
  oracle: ethers.Contract;      // Price oracle contract for asset valuations
}

// Service class for interacting with Aave protocol, extending base protocol service
export class AaveService extends BaseProtocolService implements ProtocolDataService {

  // Blockchain provider and connection management
  protected provider: ethers.Provider; 
  protected wsProvider?: ethers.WebSocketProvider;
  
  // Protocol-specific contracts and service dependencies
  protected contracts: AaveContracts;
  protected prisma: PrismaClient;
  protected notificationService: NotificationService;

  // Constructor initializes Aave service with network-specific configuration
  constructor(network: Network = Network.ETHEREUM) {
    // Use NETWORK_CONFIGS to get pre-configured network URLs
    const networkConfig = NETWORK_CONFIGS[network];

    // Initialize base protocol service with network configuration
    super({
      network,
      rpcUrl: networkConfig.rpcUrl,
      wsUrl: networkConfig.wsUrl,
    });

    // Set up blockchain providers for network interactions
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    
    // Optional WebSocket provider for real-time updates
    if (this.wsUrl) {
      this.wsProvider = new ethers.WebSocketProvider(this.wsUrl);
    }

    // Initialize service dependencies
    this.prisma = new PrismaClient();
    this.notificationService = NotificationService.getInstance();
    
    // Initialize Aave-specific smart contract instances
    this.contracts = this.initializeContracts(network);
  }

  // Initialize Aave smart contract instances for specific network
  protected initializeContracts(network: Network): AaveContracts {
    // Retrieve contract addresses for Aave V3 on Ethereum mainnet
    const networkAddresses = CONTRACT_ADDRESSES.AAVE.V3_ETH_MAINNET;
    if (!networkAddresses) {
      throw new Error(`Aave V3 contracts not found for Ethereum mainnet`);
    }

    // Create contract instances using network-specific addresses and ABIs
    return {
      pool: new ethers.Contract(
        networkAddresses.POOL,
        AAVE_POOL_ABI,
        this.provider
      ),
      poolDataProvider: new ethers.Contract(
        networkAddresses.POOL_DATA_PROVIDER,
        AAVE_POOL_DATA_PROVIDER_ABI,
        this.provider
      ),
      oracle: new ethers.Contract(
        networkAddresses.ORACLE,
        AAVE_ORACLE_ABI,
        this.provider
      ),
    };
  }

  // Retrieve user positions from persistent storage (database)
  async getPositions(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    try {
      // Query user positions from database with filtering
      const rawPositions = await this.prisma.userPosition.findMany({
        where: {
          protocol: Protocol.AAVE,
          network: this.network,
          userAddress: params.userAddress,
          timestamp: {
            gte: params.fromTimestamp || 0,
            lte: params.toTimestamp || Math.floor(Date.now() / 1000)
          }
        }
      });

      // Transform raw database positions to standardized protocol positions
      const positions: UserProtocolPosition[] = rawPositions.map(pos => {
        let details: any = pos.details || {};
        
        // Ensure details is a parsed object
        if (typeof details === 'string') {
          try {
            details = JSON.parse(details);
          } catch {
            details = {};
          }
        }

        return {
          protocol: Protocol.AAVE,
          network: this.network,
          userAddress: pos.userAddress || params.userAddress || '',
          collateral: pos.collateral ? parseFloat(pos.collateral) : null,
          debt: pos.debt ? parseFloat(pos.debt) : null,
          healthFactor: pos.healthFactor || 'N/A',
          timestamp: Math.floor(new Date(pos.timestamp).getTime() / 1000),
          borrowedAssets: Array.isArray(details.borrowedAssets) 
            ? details.borrowedAssets 
            : [],
          liquidationRisk: details.liquidationRisk ? {
            threshold: details.liquidationRisk.threshold || '0',
            currentLTV: details.liquidationRisk.currentLTV || '0'
          } : undefined
        };
      });

      return positions;
    } catch (error) {
      log.error('Error fetching Aave positions', error);
      throw error;
    }
  }

  // Fetch user positions, primarily delegating to getPositions method
  async fetchUserPositions(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    // Directly use the getPositions method for fetching positions
    return this.getPositions(params);
  }

  // Fetch user positions directly from on-chain data
  protected async fetchFromOnChain(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    // Validate network and user address constraints
    if (params.network !== Network.ETHEREUM) {
      log.warn(`Unsupported network for Aave on-chain fetching: ${params.network}`);
      return [];
    }

    if (!params.userAddress) {
      throw new Error('User address is required for on-chain fetching');
    }

    try {
      // Fetch user account data directly from Aave pool contract
      const userAccountData = await this.contracts.pool.getUserAccountData(params.userAddress);

      // Transform on-chain data to standardized protocol position
      return [{
        protocol: Protocol.AAVE,
        network: this.network,
        userAddress: params.userAddress,
        collateral: parseFloat(ethers.formatUnits(userAccountData.totalCollateralBase, 18)),
        debt: parseFloat(ethers.formatUnits(userAccountData.totalDebtBase, 18)),
        healthFactor: ethers.formatUnits(userAccountData.healthFactor, 18),
        timestamp: Math.floor(Date.now() / 1000),
        borrowedAssets: [], // TODO: Populate with actual borrowed assets
        liquidationRisk: {
          threshold: '0.8', // Example threshold, replace with actual logic
          currentLTV: ethers.formatUnits(userAccountData.currentLiquidationThreshold, 18)
        }
      }];
    } catch (error) {
      log.error('Error fetching on-chain Aave positions', { 
        error, 
        userAddress: params.userAddress,
        network: params.network 
      });
      throw error;
    }
  }

  // Placeholder method for subgraph data fetching (to be implemented)
  protected async fetchFromSubgraph(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    // TODO: Implement subgraph data fetching
    log.warn('Subgraph fetching for Aave is not implemented');
    return [];
  }

  // Determine the primary data source type for this protocol
  getDataSourceType(): DataSourceType {
    return DataSourceType.ON_CHAIN;
  }

  // Retrieve the health factor for a user's position
  async getHealthFactor(params: QueryParams): Promise<string> {
    try {
      // Attempt to fetch the most recent position within the given timestamp range
      const latestPosition = await this.prisma.userPosition.findFirst({
        where: {
          protocol: Protocol.AAVE,
          network: params.network,
          timestamp: {
            gte: params.fromTimestamp,
            lte: params.toTimestamp
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      // Return health factor if a position is found
      if (latestPosition) {
        return Promise.resolve(latestPosition.healthFactor || 'N/A');
      }

      // Default to 'N/A' if no position found
      return 'N/A';
    } catch (error) {
      log.error('Error fetching health factor', error);
      return 'N/A';
    }
  }
}
