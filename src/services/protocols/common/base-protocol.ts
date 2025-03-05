// Base class for protocol services providing common functionality and interfaces
import { UserPosition } from '../../../types/protocols';
import { Network } from '../../../types/networks';
import { 
  ProtocolDataService, 
  Protocol, 
  UserProtocolPosition, 
  ProtocolQueryParams, 
  DataSourceType,
  EnhancedProtocolQueryParams,
  UserPositionSummary
} from '../../../types/protocols';
import { log } from '../../../utils/logger';
import { getEnabledDataSources } from '../../../config/data-sources';
import { ProviderManager } from '../../providers/provider-manager';
import { ProviderFallbackService } from '../../providers/provider-fallback';
import { DataSourceFallbackService } from './data-source-fallback';
import { ethers } from 'ethers';

export interface QueryParams {
  protocol: Protocol;
  network: Network;
  fromTimestamp: number;
  toTimestamp: number;
  limit?: number;
}

export interface TransactionQueryParams extends QueryParams {
  address?: string;
}

export interface ProtocolConfig {
  network: Network;
  rpcUrl: string;
  wsUrl?: string;
  subgraphUrl?: string;
  maxConnections?: number;
  connectionTimeout?: number;
  keepAliveTimeout?: number;
  fallbackProviders?: {
    name: string;
    rpcUrl: string;
    wsUrl?: string;
  }[];
  retryAttempts?: number;
}

export abstract class BaseProtocolService implements ProtocolDataService {
  protected network: Network;
  protected rpcUrl: string;
  protected wsUrl?: string;
  protected subgraphUrl?: string;
  protected providerKey: string;
  protected eventSubscriptions: ethers.Contract[] = [];
  private providerManager: ProviderManager;
  protected providerFallbackService: ProviderFallbackService;
  protected dataSourceFallbackService: DataSourceFallbackService;
  protected initialized: boolean = false;

  constructor(config: ProtocolConfig) {
    this.network = config.network;
    this.rpcUrl = config.rpcUrl;
    this.wsUrl = config.wsUrl;
    this.subgraphUrl = config.subgraphUrl;
    this.providerManager = ProviderManager.getInstance();
    this.providerFallbackService = ProviderFallbackService.getInstance();
    this.dataSourceFallbackService = DataSourceFallbackService.getInstance();
    this.providerKey = `${this.constructor.name}-${this.network}`;
    
    // Initialize provider configuration
    this.providerManager.initializeProvider(this.providerKey, {
      network: this.network,
      rpcUrl: this.rpcUrl,
      wsUrl: this.wsUrl,
      maxConnections: config.maxConnections,
      connectionTimeout: config.connectionTimeout,
      keepAliveTimeout: config.keepAliveTimeout
    });
    
    // Configure provider fallback if fallback providers are specified
    if (config.fallbackProviders && config.fallbackProviders.length > 0) {
      this.providerFallbackService.configureFallback(this.network, {
        primaryProviderKey: this.providerKey,
        fallbackProviderKeys: config.fallbackProviders.map(p => `${this.constructor.name}-fallback-${p.name}-${this.network}`),
        maxRetries: config.retryAttempts || 3
      });
      
      // Initialize fallback providers
      config.fallbackProviders.forEach(provider => {
        const fallbackKey = `${this.constructor.name}-fallback-${provider.name}-${this.network}`;
        this.providerManager.initializeProvider(fallbackKey, {
          network: this.network,
          rpcUrl: provider.rpcUrl,
          wsUrl: provider.wsUrl
        });
      });
    }
    
    // Configure data source fallback
    const protocolKey = `${this.constructor.name}-${this.network}`;
    this.dataSourceFallbackService.configureFallback(protocolKey, {
      primarySource: DataSourceType.ON_CHAIN,
      fallbackSources: [DataSourceType.SUBGRAPH],
      maxRetries: config.retryAttempts || 3
    });
  }

  /**
   * Initialize the service. This should be called before using the service.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize provider
      const provider = await this.getProvider();
      
      // Test provider connection
      await provider.getNetwork();

      this.initialized = true;
      log.info(`${this.constructor.name} initialized successfully`);
    } catch (error) {
      log.error(`Failed to initialize ${this.constructor.name}`, { error });
      throw error;
    }
  }

  /**
   * Get the primary data source type for this service
   */
  abstract getDataSourceType(): DataSourceType;

  /**
   * Get the protocol this service handles
   */
  abstract getProtocol(): Protocol;

  /**
   * Get the provider for this service
   */
  protected async getProvider(): Promise<ethers.JsonRpcProvider> {
    return this.providerManager.getProvider(this.providerKey);
  }

  /**
   * Get the WebSocket provider for this service
   */
  protected async getWebSocketProvider(): Promise<ethers.WebSocketProvider | null> {
    return this.providerManager.getWebSocketProvider(this.providerKey);
  }

  /**
   * Subscribe to events from a contract
   */
  protected async subscribeToEvents(contract: ethers.Contract): Promise<void> {
    this.eventSubscriptions.push(contract);
  }

  /**
   * Clean up resources when service is no longer needed
   */
  protected async cleanup(): Promise<void> {
    try {
      if (!this.initialized) {
        return;
      }

      log.info('Cleaning up resources', { 
        service: this.constructor.name,
        network: this.network
      });
      
      // Dispose the provider
      await this.providerManager.disposeProvider(this.providerKey);
      
      // Reset initialization flag
      this.initialized = false;

      log.info('Resources cleaned up successfully', { 
        service: this.constructor.name,
        network: this.network
      });
    } catch (error) {
      log.error('Error cleaning up resources', { 
        error,
        service: this.constructor.name,
        network: this.network
      });
      throw error;
    }
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    try {
      log.info('Disposing protocol service resources', { 
        service: this.constructor.name,
        network: this.network
      });
      
      // Unsubscribe from all event subscriptions
      for (const subscription of this.eventSubscriptions) {
        try {
          // Remove all listeners
          subscription.removeAllListeners();
          log.info('Removed event listeners', { 
            contract: subscription.target
          });
        } catch (error) {
          log.warn('Error removing event listeners', { error });
        }
      }
      
      // Clear the subscriptions array
      this.eventSubscriptions = [];
      
      // Clean up other resources
      await this.cleanup();
      
      log.info('Protocol service resources disposed', { 
        service: this.constructor.name,
        network: this.network
      });
    } catch (error) {
      log.error('Error disposing protocol service resources', { 
        error,
        service: this.constructor.name,
        network: this.network
      });
      throw error;
    }
  }

  /**
   * Fetch user positions from the protocol
   */
  async fetchUserPositions(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    if (!this.initialized) {
      throw new Error(`${this.constructor.name} not initialized`);
    }

    const { userAddress, protocol } = params;

    if (!userAddress || !protocol) {
      throw new Error('User address and protocol are required for fetching positions');
    }

    const protocolKey = `${this.constructor.name}-${this.network}`;
    
    return this.dataSourceFallbackService.executeWithFallback(
      protocolKey,
      {
        [DataSourceType.ON_CHAIN]: () => this.fetchFromOnChain(params),
        [DataSourceType.SUBGRAPH]: () => this.fetchFromSubgraph(params)
      },
      `fetchUserPositions for ${userAddress}`
    );
  }

  /**
   * Fetch user positions from the subgraph
   */
  protected abstract fetchFromSubgraph(params: ProtocolQueryParams): Promise<UserProtocolPosition[]>;
  
  /**
   * Fetch user positions from on-chain data
   */
  protected abstract fetchFromOnChain(params: ProtocolQueryParams): Promise<UserProtocolPosition[]>;

  /**
   * Get positions for a user
   */
  async getPositions(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    if (!this.initialized) {
      throw new Error(`${this.constructor.name} not initialized`);
    }

    return this.fetchUserPositions(params);
  }

  /**
   * Get health factor for a user
   */
  abstract getHealthFactor(params: ProtocolQueryParams): Promise<string>;

  /**
   * Default implementation of enhanced position retrieval
   */
  async fetchUserPositionsInRange(params: EnhancedProtocolQueryParams): Promise<UserPositionSummary[]> {
    if (!this.initialized) {
      throw new Error(`${this.constructor.name} not initialized`);
    }

    try {
      // Fetch base positions
      const basePositions = await this.fetchUserPositions(params);

      // Transform to UserPositionSummary with additional metrics
      const summaryPositions: UserPositionSummary[] = basePositions.map(position => ({
        ...position,
        riskMetrics: {
          liquidationProbability: this.calculateLiquidationProbability(position),
          potentialLiquidationValue: this.calculatePotentialLiquidationValue(position),
          trendDirection: this.determineTrendDirection(position)
        },
        comparisonMetrics: {
          averageHealthFactor: this.calculateAverageHealthFactor(position),
          percentileRanking: this.calculatePercentileRanking(position)
        }
      }));

      // Apply sorting if specified
      if (params.sortBy) {
        return this.sortPositions(summaryPositions, params.sortBy, params.sortOrder);
      }

      // Apply max positions limit
      return params.maxPositions 
        ? summaryPositions.slice(0, params.maxPositions) 
        : summaryPositions;
    } catch (error) {
      log.error('Error in fetchUserPositionsInRange', { error, params });
      throw error;
    }
  }

  /**
   * Helper methods for enhanced position analysis
   */
  protected calculateLiquidationProbability(position: UserProtocolPosition): number {
    // Implement liquidation probability calculation
    const healthFactor = parseFloat(position.healthFactor);
    return healthFactor < 1.1 ? 0.9 : (healthFactor < 1.5 ? 0.5 : 0.1);
  }

  protected calculatePotentialLiquidationValue(position: UserProtocolPosition): string {
    // Implement potential liquidation value calculation
    return position.debt || '0';
  }

  protected determineTrendDirection(position: UserProtocolPosition): 'increasing' | 'decreasing' | 'stable' {
    // Placeholder implementation
    return 'stable';
  }

  protected calculateAverageHealthFactor(position: UserProtocolPosition): string {
    // Placeholder implementation
    return position.healthFactor;
  }

  protected calculatePercentileRanking(position: UserProtocolPosition): number {
    // Placeholder implementation
    return 50;
  }

  protected sortPositions(
    positions: UserPositionSummary[], 
    sortBy: string, 
    sortOrder: 'asc' | 'desc' = 'desc'
  ): UserPositionSummary[] {
    return positions.sort((a, b) => {
      let compareValue = 0;
      switch (sortBy) {
        case 'healthFactor':
          compareValue = parseFloat(a.healthFactor) - parseFloat(b.healthFactor);
          break;
        case 'liquidationRisk':
          compareValue = (a.riskMetrics?.liquidationProbability || 0) - 
                         (b.riskMetrics?.liquidationProbability || 0);
          break;
        case 'totalCollateral':
          compareValue = parseFloat(a.collateral || '0') - parseFloat(b.collateral || '0');
          break;
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  }
}
