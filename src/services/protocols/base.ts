// Base class for protocol services providing common functionality and interfaces
import { UserPosition } from '../../types/protocols';
import { Network } from '../../types/networks';
import { 
  ProtocolDataService, 
  Protocol, 
  UserProtocolPosition, 
  ProtocolQueryParams, 
  DataSourceType 
} from '../../types/protocols';
import { log } from '../../utils/logger';
import { getEnabledDataSources } from '../../config/data-sources';
import { ProviderManager } from '../providers/provider-manager';
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
}

export abstract class BaseProtocolService implements ProtocolDataService {
  protected network: Network;
  protected rpcUrl: string;
  protected wsUrl?: string;
  protected subgraphUrl?: string;
  protected providerKey: string;
  protected eventSubscriptions: ethers.Contract[] = [];
  private providerManager: ProviderManager;

  constructor(config: ProtocolConfig) {
    this.network = config.network;
    this.rpcUrl = config.rpcUrl;
    this.wsUrl = config.wsUrl;
    this.subgraphUrl = config.subgraphUrl;
    this.providerManager = ProviderManager.getInstance();
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
  }

  abstract getDataSourceType(): DataSourceType;

  protected async getProvider(): Promise<ethers.JsonRpcProvider> {
    return this.providerManager.getProvider(this.providerKey);
  }

  protected async getWebSocketProvider(): Promise<ethers.WebSocketProvider | null> {
    return this.providerManager.getWebSocketProvider(this.providerKey);
  }

  protected async subscribeToEvents(contract: ethers.Contract): Promise<void> {
    this.eventSubscriptions.push(contract);
  }

  protected async cleanup(): Promise<void> {
    // Clean up event subscriptions
    for (const contract of this.eventSubscriptions) {
      contract.removeAllListeners();
    }
    this.eventSubscriptions = [];
    
    // Clean up provider
    await this.providerManager.disposeProvider(this.providerKey);
  }

  public async dispose(): Promise<void> {
    await this.cleanup();
  }

  async fetchUserPositions(params: ProtocolQueryParams): Promise<UserProtocolPosition[]> {
    const { userAddress, protocol } = params;

    if (!userAddress || !protocol) {
      throw new Error('User address and protocol are required for fetching positions');
    }

    const dataSources = getEnabledDataSources(protocol, this.network);

    for (const sourceType of dataSources) {
      try {
        switch (sourceType) {
          case DataSourceType.SUBGRAPH:
            return await this.fetchFromSubgraph(params);
          
          case DataSourceType.ON_CHAIN:
            return await this.fetchFromOnChain(params);
          
          default:
            log.warn(`Unsupported data source type: ${sourceType}`);
        }
      } catch (error) {
        log.warn(`Failed to fetch positions from ${sourceType}`, { error });
        continue;
      }
    }

    throw new Error('Failed to fetch positions from any available data source');
  }

  protected abstract fetchFromSubgraph(params: ProtocolQueryParams): Promise<UserProtocolPosition[]>;
  protected abstract fetchFromOnChain(params: ProtocolQueryParams): Promise<UserProtocolPosition[]>;

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

  abstract getHealthFactor(params: QueryParams): Promise<string>;
}
