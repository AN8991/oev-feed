import { ethers } from 'ethers';
import { Protocol } from 'types/protocols';
import { Network } from 'types/networks';
import { ServiceFactory } from 'services';
import { CONTRACT_ADDRESSES } from 'config/contracts';
import { AAVE_POOL_ABI } from 'services/protocols/aave/abi';
import { log } from 'utils/logger';

// Structured representation of blockchain event data
interface EventData {
  name: string;               // Name of the blockchain event
  args: Record<string, unknown>;  // Event arguments
  timestamp: number;          // Timestamp of the event
}

// Representation of block-level updates
interface BlockUpdateData {
  blockNumber: number;        // Blockchain block number
  timestamp: number;          // Block timestamp
  events?: Array<{            // Optional list of events in the block
    name: string;
    args: Record<string, unknown>;
  }>;
}

// Comprehensive update data structure for real-time tracking
interface UpdateData {
  positions: Record<string, unknown>;  // Updated positions
  event: EventData | BlockUpdateData;  // Triggering event or block update
}

// Callback type for processing real-time updates
export type UpdateCallback = (data: UpdateData) => Promise<void> | void;

// Configuration for blockchain protocol event tracking
interface ProtocolConfig {
  address: string;            // Contract address
  abi: ethers.InterfaceAbi;   // Contract ABI
  events: readonly string[];  // Events to track
}

// Supported connection modes for blockchain data retrieval
type ConnectionMode = 'websocket' | 'http' | 'polling';

// Centralized configuration for protocol-specific event tracking
const PROTOCOL_CONFIGS: Record<Protocol, Partial<Record<Network, ProtocolConfig>>> = {
  [Protocol.AAVE]: {
    [Network.ETHEREUM]: {
      address: CONTRACT_ADDRESSES.AAVE.V3_ETH_MAINNET.POOL,
      abi: AAVE_POOL_ABI,
      events: ['UserAccountDataUpdated', 'Supply', 'Withdraw', 'Borrow', 'Repay']
    }
  }
} as const;

// Real-time blockchain data tracking and event processing service
export class RealtimeService {
  // Singleton instance management
  private static instance: RealtimeService;
  
  // Blockchain provider for data retrieval
  private provider: ethers.Provider | null;
  
  // Map of subscribers for real-time updates
  private subscribers: Map<string, Set<UpdateCallback>>;
  
  // Map of contracts for protocol-specific event tracking
  private contracts: Map<string, ethers.Contract>;
  
  // Health check interval for provider connection monitoring
  private healthCheckInterval: NodeJS.Timeout | null;
  
  // Event filters for efficient event retrieval
  private eventFilters: Map<string, ethers.EventFilter[]>;
  
  // Flag to track initialization status
  private isInitialized: boolean = false;
  
  // Current connection mode
  private connectionMode: ConnectionMode = 'websocket';
  
  // Polling interval for periodic data retrieval
  private pollingInterval: NodeJS.Timeout | null = null;
  
  // Last block number processed
  private lastBlockNumber: number = 0;
  
  // Timeout for provider connection establishment
  private readonly TIMEOUT_MS = 5000;
  
  // Interval for health check and connection monitoring
  private readonly HEALTH_CHECK_INTERVAL_MS = 30000;
  
  // Interval for periodic polling
  private readonly POLLING_INTERVAL_MS = 12000;

  // Private constructor to enforce singleton pattern
  private constructor() {
    this.provider = null;
    this.subscribers = new Map();
    this.contracts = new Map();
    this.eventFilters = new Map();
    this.healthCheckInterval = null;
    
    if (typeof window === 'undefined') {
      this.initialize().catch(error => {
        log.error('Failed to initialize RealtimeService', error);
      });
    }
  }

  // Singleton access method
  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  // Initialize blockchain provider based on connection mode
  private async initialize() {
    if (this.isInitialized) return;
    
    // In Next.js environment, prefer HTTP
    if (typeof window === 'undefined') {
      try {
        await this.initializeHttp();
      } catch (error) {
        log.error('HTTP initialization failed:', error);
        this.provider = null;
        throw error;
      }
    } else {
      try {
        // Try WebSocket first in browser environment
        await this.initializeWebSocket();
      } catch (error) {
        log.warn('WebSocket initialization failed, falling back to HTTP:', error);
        try {
          await this.initializeHttp();
        } catch (httpError) {
          log.error('HTTP initialization failed:', httpError);
          this.provider = null;
          throw httpError;
        }
      }
    }
  }

  // Initialize WebSocket provider for real-time data retrieval
  private async initializeWebSocket() {
    const wsUrl = process.env.ETHEREUM_WS_URL;
    if (!wsUrl) {
      throw new Error('ETHEREUM_WS_URL environment variable is not set');
    }

    try {
      const wsProvider = new ethers.WebSocketProvider(wsUrl);
      await Promise.race([
        wsProvider.ready,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('WebSocket connection timeout')), this.TIMEOUT_MS)
        )
      ]);

      this.provider = wsProvider;
      this.connectionMode = 'websocket';
      this.setupHealthCheck();
      this.isInitialized = true;
    } catch (error) {
      log.error('Failed to initialize WebSocket provider:', error);
      throw error;
    }
  }

  // Initialize HTTP provider for periodic data retrieval
  private async initializeHttp() {
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    if (!rpcUrl) {
      throw new Error('ETHEREUM_RPC_URL environment variable is not set');
    }

    try {
      const httpProvider = new ethers.JsonRpcProvider(rpcUrl);
      await Promise.race([
        httpProvider.ready,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('HTTP connection timeout')), this.TIMEOUT_MS)
        )
      ]);

      this.provider = httpProvider;
      this.connectionMode = 'http';
      this.setupPolling();
      this.isInitialized = true;
    } catch (error) {
      log.error('Failed to initialize HTTP provider:', error);
      throw error;
    }
  }

  // Set up health check interval for provider connection monitoring
  private setupHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        if (!this.provider) {
          await this.initialize();
          return;
        }

        const blockNumber = await this.provider.getBlockNumber();
        if (!blockNumber) {
          throw new Error('Failed to get block number');
        }
      } catch (error) {
        log.error('Health check failed:', error);
        await this.reconnect();
      }
    }, this.HEALTH_CHECK_INTERVAL_MS);
  }

  // Set up polling interval for periodic data retrieval
  private setupPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        if (!this.provider) {
          await this.initialize();
          return;
        }

        const currentBlock = await this.provider.getBlockNumber();
        if (currentBlock > this.lastBlockNumber) {
          // Process new blocks
          for (let blockNumber = this.lastBlockNumber + 1; blockNumber <= currentBlock; blockNumber++) {
            await this.processBlock(blockNumber);
          }
          this.lastBlockNumber = currentBlock;
        }
      } catch (error) {
        log.error('Polling failed:', error);
        await this.reconnect();
      }
    }, this.POLLING_INTERVAL_MS);
  }

  // Process a specific block for real-time updates
  private async processBlock(blockNumber: number) {
    try {
      const block = await this.provider!.getBlock(blockNumber);
      if (!block) return;

      // Process each subscription
      for (const [subscriptionKey, callbacks] of this.subscribers.entries()) {
        const [protocol, network, address] = subscriptionKey.split(':');
        const protocolConfig = PROTOCOL_CONFIGS[protocol as Protocol]?.[network as Network];
        if (!protocolConfig) continue;

        const contractKey = this.getContractKey(protocol, network);
        const contract = this.contracts.get(contractKey);
        if (!contract) continue;

        try {
          // Query events for each configured event type
          const allEvents = await Promise.all(
            protocolConfig.events.map(async (eventSignature: string) => {
              const eventName = eventSignature.split('(')[0];
              const filter = contract.filters[eventName](address);
              return contract.queryFilter(filter, blockNumber, blockNumber);
            })
          );

          // Flatten events array
          const events = allEvents.flat();

          if (events.length > 0) {
            try {
              const service = ServiceFactory.getService(protocol as Protocol, network as Network);
              const positions = await service.getPositions({
                protocol: protocol as string,
                network: network as Network,
                fromTimestamp: block.timestamp,
                toTimestamp: block.timestamp
              });
              const positionsRecord = positions.reduce((acc, pos) => {
                const key = `${pos.protocol}_${pos.network}_${pos.userAddress}`;
                acc[key] = pos;
                return acc;
              }, {} as Record<string, unknown>);
              callbacks.forEach(callback => callback({
                positions: positionsRecord,
                event: {
                  name: 'blockUpdate',
                  blockNumber,
                  timestamp: block.timestamp,
                  events: events.map((event) => ({
                    name: String('event' in event && event.event ? event.event : 'topics' in event ? event.topics[0] : 'Unknown Event'),
                    args: 'args' in event 
                      ? (typeof event.args === 'object' && event.args !== null 
                          ? Array.isArray(event.args)
                            ? event.args.reduce((acc, arg, index) => ({ ...acc, [index.toString()]: arg }), {})
                            : event.args
                          : { value: event.args })
                      : {},
                  })),
                },
              }));
            } catch (error) {
              log.error(`Error fetching positions for ${subscriptionKey}:`, error);
            }
          }
        } catch (error) {
          log.error(`Error processing events for ${subscriptionKey}:`, error);
        }
      }
    } catch (error) {
      log.error('Error processing block:', error);
    }
  }

  // Set up event listeners for specific protocols and networks
  private async setupListeners(
    protocol: Protocol,
    network: Network,
    address: string
  ) {
    const protocolConfig = PROTOCOL_CONFIGS[protocol]?.[network];
    if (!protocolConfig) {
      log.warn(`No configuration found for ${protocol} on ${network}`);
      return;
    }

    const contractKey = this.getContractKey(protocol, network);
    const subscriptionKey = this.getSubscriptionKey(protocol, network, address);

    let contract = this.contracts.get(contractKey);
    if (!contract) {
      try {
        contract = new ethers.Contract(
          protocolConfig.address,
          protocolConfig.abi,
          this.provider!
        );
        this.contracts.set(contractKey, contract);
      } catch (error) {
        log.error(`Error creating contract for ${protocol} on ${network}:`, error);
        return;
      }
    }

    if (this.connectionMode === 'websocket') {
      // Setup WebSocket event listeners
      if (protocolConfig?.events) {
        protocolConfig.events.forEach((eventName) => {
          contract!.on(eventName, async (...args) => {
            const subscribers = this.subscribers.get(subscriptionKey);
            if (subscribers) {
              try {
                const service = ServiceFactory.getService(protocol, network);
                const positions = await service.getPositions({
                  protocol: protocol as string,
                  network: network as Network,
                  fromTimestamp: Date.now(),
                  toTimestamp: Date.now()
                });
                const positionsRecord = positions.reduce((acc, pos) => {
                  const key = `${pos.protocol}_${pos.network}_${pos.userAddress}`;
                  acc[key] = pos;
                  return acc;
                }, {} as Record<string, unknown>);
                subscribers.forEach(callback => callback({
                  positions: positionsRecord,
                  event: {
                    name: 'event' in args[args.length - 1] && args[args.length - 1].event ? args[args.length - 1].event : 'topics' in args[args.length - 1] ? args[args.length - 1].topics[0] : 'Unknown Event',
                    args: args.slice(0, -1).reduce((acc, arg, index) => {
                      acc[index.toString()] = arg;
                      return acc;
                    }, {} as Record<string, unknown>),
                    timestamp: Date.now(),
                  },
                }));
              } catch (error) {
                log.error(`Error processing event for ${subscriptionKey}:`, error);
              }
            }
          });
        });
      }
    }
  }

  // Subscribe to real-time updates for a specific protocol, network, and address
  async subscribe(
    protocol: Protocol,
    network: Network,
    address: string,
    callback: UpdateCallback
  ): Promise<void> {
    const subscriptionKey = this.getSubscriptionKey(protocol, network, address);
    
    if (!this.subscribers.has(subscriptionKey)) {
      this.subscribers.set(subscriptionKey, new Set());
      await this.setupListeners(protocol, network, address);
    }

    this.subscribers.get(subscriptionKey)!.add(callback);
  }

  // Unsubscribe from real-time updates for a specific protocol, network, and address
  unsubscribe(
    protocol: Protocol,
    network: Network,
    address: string,
    callback: UpdateCallback
  ): void {
    const subscriptionKey = this.getSubscriptionKey(protocol, network, address);
    const contractKey = this.getContractKey(protocol, network);
    
    this.subscribers.get(subscriptionKey)?.delete(callback);
    
    if (this.subscribers.get(subscriptionKey)?.size === 0) {
      this.subscribers.delete(subscriptionKey);
      
      const contract = this.contracts.get(contractKey);
      if (this.connectionMode === 'websocket' && contract) {
        const protocolConfig = PROTOCOL_CONFIGS[protocol][network];
        if (protocolConfig?.events) {
          protocolConfig.events.forEach(eventSignature => {
            const eventName = eventSignature.split('(')[0];
            contract.removeAllListeners(eventName);
          });
        }
      }
      
      // Only remove event filters for this subscription
      this.eventFilters.delete(subscriptionKey);
      
      // Check if there are any other subscriptions using this contract
      let hasOtherSubscriptions = false;
      for (const [key] of this.subscribers.entries()) {
        const [subProtocol, subNetwork] = key.split(':');
        if (this.getContractKey(subProtocol, subNetwork) === contractKey) {
          hasOtherSubscriptions = true;
          break;
        }
      }
      
      // Only remove the contract if no other subscriptions are using it
      if (!hasOtherSubscriptions) {
        this.contracts.delete(contractKey);
      }
    }
  }

  // Get the subscription key for a specific protocol, network, and address
  private getSubscriptionKey(protocol: string, network: string, address: string): string {
    return `${protocol}:${network}:${address}`.toLowerCase();
  }

  // Get the contract key for a specific protocol and network
  private getContractKey(protocol: string, network: string): string {
    return `${protocol}:${network}`.toLowerCase();
  }

  // Reconnect to the blockchain provider
  private async reconnect() {
    try {
      if (this.provider) {
        if (this.connectionMode === 'websocket') {
          (this.provider as ethers.WebSocketProvider).destroy();
        }
        this.provider.removeAllListeners();
      }

      // Reset state
      this.provider = null;
      this.isInitialized = false;
      this.contracts.clear();
      this.eventFilters.clear();

      // Try to initialize again
      await this.initialize();

      // Resubscribe all listeners
      for (const [key, callbacks] of this.subscribers.entries()) {
        const [protocol, network, address] = key.split(':');
        for (const callback of callbacks) {
          await this.setupListeners(protocol as Protocol, network as Network, address);
        }
      }
    } catch (error) {
      log.error('Failed to reconnect:', error);
    }
  }

  // Clean up resources and disconnect from the blockchain provider
  cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    // Cleanup WebSocket provider if active
    if (this.connectionMode === 'websocket' && this.provider) {
      (this.provider as ethers.WebSocketProvider).destroy();
    }
    
    // Remove all listeners and clear all subscriptions
    for (const [contractKey, contract] of this.contracts.entries()) {
      contract.removeAllListeners();
    }
    
    this.provider = null;
    this.contracts.clear();
    this.eventFilters.clear();
    this.subscribers.clear();
    this.isInitialized = false;
  }
}
