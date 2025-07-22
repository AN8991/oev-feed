/*
 * File: query-orchestrator.service.ts
 * Description: Service responsible for orchestrating complex query workflows and integrating multiple data sources.
 * Layer: Application
 */

import { ProtocolAdapterPort } from '@domain/ports/secondary';
import { PositionModel } from '@domain/models/position.model';
import { PositionFilterCriteria } from '@domain/types/position-filter.type';
import { ProtocolQueryParameters, QueryOrchestratorPort, QueryResult, QueryMetadata, PositionQueryResult } from '@domain/ports/primary/query-orchestrator.port';
import { ProtocolAdapterFactory } from '../../adapters/secondary/protocols/protocol-adapter-factory';
import { logger } from '@infrastructure/utils/structured-logger';
import { TimeRangeUtils } from '@infrastructure/utils/time-range.utils';
import { TimeRange } from '@domain/types/query-parameters';

/**
 * Service for orchestrating queries across multiple protocols
 * Implements the QueryOrchestratorPort primary port
 */
export class QueryOrchestratorService implements QueryOrchestratorPort {
  // Map of protocol+network to adapter
  private adapters: Map<string, ProtocolAdapterPort> = new Map();
  
  // Default protocols and networks if none specified
  private readonly DEFAULT_PROTOCOLS = ['aave-v2', 'aave-v3'];
  private readonly DEFAULT_NETWORKS = ['ethereum'];
  
  /**
   * Constructor
   * @param adapterFactory Factory for creating protocol adapters
   */
  constructor(
    private readonly adapterFactory: typeof ProtocolAdapterFactory = ProtocolAdapterFactory
  ) {}
  
  /**
   * Query user positions across multiple protocols
   * @param params Query parameters
   * @returns Query result with positions and metadata
   */
  public async queryUserPositions(params: ProtocolQueryParameters): Promise<QueryResult> {
    const startTime = Date.now();
    
    // Validate user addresses
    if (!params.userAddresses || params.userAddresses.length === 0) {
      throw new Error('At least one user address is required for querying positions');
    }
    
    // Calculate time range if specified
    let startTimestamp: number | undefined;
    let endTimestamp: number | undefined;
    
    if (params.timeRange) {
      try {
        const timeRange = TimeRangeUtils.calculateTimeRange(
          params.timeRange, 
          params.fromTimestamp, 
          params.toTimestamp
        );
        startTimestamp = timeRange.startTimestamp;
        endTimestamp = timeRange.endTimestamp;
      } catch (error) {
        throw new Error(`Invalid time range: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Normalize parameters
    const protocols = params.protocols?.length ? params.protocols : this.DEFAULT_PROTOCOLS;
    const networks = params.networks?.length ? params.networks : this.DEFAULT_NETWORKS;
    
    // Prepare query promises
    const queryPromises: Promise<PositionQueryResult>[] = [];
    const allPositions: PositionModel[] = [];
    
    const metadata: QueryMetadata = {
      startTime,
      totalCount: 0,
      protocols: [],
      partialResult: false,
      startTimestamp,
      endTimestamp
    };
    
    // Query each protocol and network
    for (const protocol of protocols) {
      for (const network of networks) {
        const queryPromise = this.queryProtocolPositions(
          protocol, 
          network, 
          params.userAddresses, 
          params.filterCriteria,
          startTimestamp,
          endTimestamp
        ).then(result => {
          if (result.success && result.positions) {
            allPositions.push(...result.positions);
          }
          return result;
        }).catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Error querying ${protocol}/${network}:`, error);
          
          metadata.protocols.push({
            protocol,
            network,
            success: false,
            error: errorMessage
          });
          
          metadata.partialResult = true;
          
          return { success: false, protocol, network, error: errorMessage };
        });
        
        queryPromises.push(queryPromise);
      }
    }
    
    // Wait for all queries to complete
    await Promise.all(queryPromises);
    
    // Update total count
    metadata.totalCount = allPositions.length;
    
    // Return result
    return {
      positions: allPositions,
      metadata
    };
  }

  /**
   * Query positions for a specific protocol and network
   * @param protocol Protocol to query
   * @param network Network to query
   * @param userAddresses User addresses to query
   * @param filterCriteria Optional filtering criteria
   * @param startTimestamp Optional start timestamp for time-based filtering
   * @param endTimestamp Optional end timestamp for time-based filtering
   * @returns Positions for the specified protocol and network
   */
  private async queryProtocolPositions(
    protocol: string, 
    network: string, 
    userAddresses: string[], 
    filterCriteria?: PositionFilterCriteria,
    startTimestamp?: number,
    endTimestamp?: number
  ): Promise<PositionQueryResult> {
    // Get or create adapter for this protocol and network
    const adapterKey = `${protocol}-${network}`;
    let adapter = this.adapters.get(adapterKey);
    
    if (!adapter) {
      adapter = this.adapterFactory.createAdapter(protocol, network);
      this.adapters.set(adapterKey, adapter);
    }
    
    // Fetch positions
    const positions = await adapter.fetchUserPositions({
      userAddresses,
      filterCriteria,
      startTimestamp,
      endTimestamp
    });
    
    return {
      success: true,
      protocol,
      network,
      positions
    };
  }
  
  /**
   * Get health factors for a user across multiple protocols
   * @param userAddress User address to query health factors for
   * @param protocols Optional list of protocols to query
   * @param networks Optional list of networks to query
   * @returns Map of protocol+network to health factor
   */
  public async getHealthFactors(
    userAddress: string,
    protocols?: string[],
    networks?: string[]
  ): Promise<Map<string, string>> {
    // Validate user address
    if (!userAddress) {
      throw new Error('User address is required for querying health factors');
    }
    
    // Normalize parameters
    const protocolList = protocols?.length ? protocols : this.DEFAULT_PROTOCOLS;
    const networkList = networks?.length ? networks : this.DEFAULT_NETWORKS;
    
    // Generate combinations of protocol+network
    const combinations = this.generateProtocolNetworkCombinations(protocolList, networkList);
    
    // Map to store health factors
    const healthFactors = new Map<string, string>();
    
    // Query each protocol+network combination in parallel
    const queryPromises = combinations.map(async ({ protocol, network }) => {
      const adapterKey = `${protocol}-${network}`;
      
      try {
        // Get or create adapter
        const adapter = await this.getAdapter(protocol, network);
        
        // Initialize adapter if needed
        if (!adapter.initialized) {
          await adapter.initialize();
        }
        
        // Fetch health factor
        logger.info(`Querying health factor for ${userAddress} on ${protocol}/${network}`);
        const healthFactor = await adapter.getHealthFactor(userAddress);
        
        // Add to result map
        healthFactors.set(adapterKey, healthFactor);
        
        logger.info(`Health factor on ${protocol}/${network}: ${healthFactor}`);
        
        return { success: true, protocol, network };
      } catch (error) {
        // Log error
        logger.error(`Error querying health factor for ${protocol}/${network}:`, error);
        
        // Set default value for failed queries
        healthFactors.set(adapterKey, '0');
        
        return { success: false, protocol, network };
      }
    });
    
    // Wait for all queries to complete
    await Promise.all(queryPromises);
    
    return healthFactors;
  }
  
  /**
   * Get or create an adapter for a specific protocol and network
   * @param protocol Protocol identifier
   * @param network Network identifier
   * @returns Protocol adapter instance
   */
  private async getAdapter(protocol: string, network: string): Promise<ProtocolAdapterPort> {
    const adapterKey = `${protocol}-${network}`;
    
    // Return cached adapter if available
    if (this.adapters.has(adapterKey)) {
      return this.adapters.get(adapterKey)!;
    }
    
    try {
      // Create configuration for the adapter
      // In a real implementation, this would be loaded from environment variables or configuration service
      const config = this.getAdapterConfig(protocol, network);
      
      // Create adapter using factory
      const adapter = this.adapterFactory.createAdapter(protocol, network, config);
      
      // Cache adapter
      this.adapters.set(adapterKey, adapter);
      
      return adapter;
    } catch (error) {
      logger.error(`Error creating adapter for ${protocol}/${network}:`, error);
      throw new Error(`Failed to create adapter for ${protocol}/${network}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Generate all combinations of protocols and networks
   * @param protocols List of protocols
   * @param networks List of networks
   * @returns Array of protocol+network combinations
   */
  private generateProtocolNetworkCombinations(
    protocols: string[],
    networks: string[]
  ): Array<{ protocol: string; network: string }> {
    const combinations: Array<{ protocol: string; network: string }> = [];
    
    for (const protocol of protocols) {
      for (const network of networks) {
        // Check if this combination is supported
        if (this.isSupportedCombination(protocol, network)) {
          combinations.push({ protocol, network });
        }
      }
    }
    
    return combinations;
  }
  
  /**
   * Check if a protocol+network combination is supported
   * @param protocol Protocol identifier
   * @param network Network identifier
   * @returns Whether the combination is supported
   */
  private isSupportedCombination(protocol: string, network: string): boolean {
    // This is a simplified implementation
    // In a real implementation, this would check against a list of supported combinations
    
    // Currently supported combinations
    const supportedCombinations = [
      { protocol: 'aave-v2', network: 'ethereum' },
      { protocol: 'aave-v3', network: 'ethereum' }
      // Add more as they are implemented
    ];
    
    return supportedCombinations.some(
      combo => combo.protocol === protocol && combo.network === network
    );
  }
  
  /**
   * Get configuration for a specific adapter
   * @param protocol Protocol identifier
   * @param network Network identifier
   * @returns Adapter configuration
   */
  private getAdapterConfig(protocol: string, network: string): any {
    // This is a simplified implementation
    // In a real implementation, this would load configuration from environment variables or a configuration service
    
    // Default RPC URL - in production, this would be loaded from environment variables
    const defaultRpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key';
    
    // Configuration map
    const configMap: Record<string, any> = {
      'aave-v2-ethereum': {
        poolAddress: process.env.AAVE_V2_ETHEREUM_POOL || '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
        dataProviderAddress: process.env.AAVE_V2_ETHEREUM_DATA_PROVIDER || '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d',
        oracleAddress: process.env.AAVE_V2_ETHEREUM_ORACLE || '0xA50ba011c48153De246E5192C8f9258A2ba79Ca9',
        providerUrl: defaultRpcUrl
      },
      'aave-v3-ethereum': {
        poolAddress: process.env.AAVE_V3_ETHEREUM_POOL || '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
        dataProviderAddress: process.env.AAVE_V3_ETHEREUM_DATA_PROVIDER || '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
        oracleAddress: process.env.AAVE_V3_ETHEREUM_ORACLE || '0x54586bE62E3c3580375aE3723C145253060Ca0C2',
        providerUrl: defaultRpcUrl
      }
      // Add more configurations as needed
    };
    
    const key = `${protocol}-${network}`;
    const config = configMap[key];
    
    if (!config) {
      throw new Error(`No configuration found for ${protocol}/${network}`);
    }
    
    return config;
  }
  
  /**
   * Filter positions based on provided criteria
   * @param positions Array of positions to filter
   * @param filterCriteria Filtering criteria
   * @returns Filtered array of positions
   */
  private filterPositions(positions: PositionModel[], filterCriteria?: PositionFilterCriteria): PositionModel[] {
    if (!filterCriteria || Object.keys(filterCriteria).length === 0) {
      return positions;
    }

    return positions.filter(position => {
      // Health factor filtering
      if (filterCriteria.minHealthFactor !== undefined && 
          parseFloat(position.healthFactor) < filterCriteria.minHealthFactor) {
        return false;
      }
      if (filterCriteria.maxHealthFactor !== undefined && 
          parseFloat(position.healthFactor) > filterCriteria.maxHealthFactor) {
        return false;
      }

      // Collateral amount filtering (in USD)
      if (filterCriteria.minCollateralAmountETH !== undefined && 
          parseFloat(position.collateralAmountUSD) < filterCriteria.minCollateralAmountETH) {
        return false;
      }
      if (filterCriteria.maxCollateralAmountETH !== undefined && 
          parseFloat(position.collateralAmountUSD) > filterCriteria.maxCollateralAmountETH) {
        return false;
      }

      // Debt amount filtering (in USD)
      if (filterCriteria.minDebtAmountETH !== undefined && 
          parseFloat(position.debtAmountUSD) < filterCriteria.minDebtAmountETH) {
        return false;
      }
      if (filterCriteria.maxDebtAmountETH !== undefined && 
          parseFloat(position.debtAmountUSD) > filterCriteria.maxDebtAmountETH) {
        return false;
      }

      // Protocol filtering
      if (filterCriteria.includedProtocols && 
          filterCriteria.includedProtocols.length > 0 && 
          !filterCriteria.includedProtocols.includes(position.protocol)) {
        return false;
      }

      // Network filtering
      if (filterCriteria.includedNetworks && 
          filterCriteria.includedNetworks.length > 0 && 
          !filterCriteria.includedNetworks.includes(position.network)) {
        return false;
      }

      return true;
    });
  }
}
