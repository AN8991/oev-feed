/**
 * Part of the infrastructure layer in hexagonal architecture
 * Provides intelligent request routing to blockchain providers based on various strategies
 */
import { Injectable, Logger } from '@nestjs/common';
import { ProviderFactory } from '@adapters/secondary/providers/provider-factory';
import { Providers } from '@/domain/enums/providers.enum';
import { ProviderAdapterPort } from '@domain/ports/secondary/provider-adapter.port';

/**
 * Provider selection strategies
 */
export enum SelectionStrategy {
  // Select provider with the most remaining rate limit
  RATE_LIMIT = 'rate_limit',
  
  // Select provider with the fastest response time
  RESPONSE_TIME = 'response_time',
  
  // Select provider with the lowest failure rate
  HEALTH = 'health',
  
  // Select provider randomly
  RANDOM = 'random',
  
  // Select provider with the least number of requests
  LEAST_LOADED = 'least_loaded',
  
  // Round-robin selection
  ROUND_ROBIN = 'round_robin'
}

/**
 * Request distributor options
 */
export interface RequestDistributorOptions {
  // Default selection strategy
  defaultStrategy: SelectionStrategy;
  
  // Whether to exclude unhealthy providers
  excludeUnhealthy: boolean;
  
  // Minimum rate limit remaining to consider a provider
  minRateLimitRemaining: number;
}

/**
 * Default request distributor options
 */
const DEFAULT_OPTIONS: RequestDistributorOptions = {
  defaultStrategy: SelectionStrategy.RATE_LIMIT,
  excludeUnhealthy: true,
  minRateLimitRemaining: 10
};

/**
 * Request distributor for intelligent request routing
 */
export class RequestDistributor {
  private readonly logger = new Logger(RequestDistributor.name);
  
  // Current selection strategy
  private strategy: SelectionStrategy;
  
  // Options for the request distributor
  private options: RequestDistributorOptions;
  
  // Counter for round-robin selection
  private roundRobinCounter: Map<string, number> = new Map();
  
  // Last selected provider type for each network
  private lastSelectedProviderType: Map<string, Providers> = new Map();
  
  // Excluded providers for each network
  private excludedProviders: Map<string, Set<Providers>> = new Map();
  
  /**
   * Constructor
   * 
   * @param options Request distributor options
   */
  constructor(options: Partial<RequestDistributorOptions> = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    };
    
    this.strategy = this.options.defaultStrategy;
    
    this.logger.log(`Request distributor initialized with strategy: ${this.strategy}`);
  }
  
  /**
   * Set the selection strategy
   * 
   * @param strategy Selection strategy to use
   */
  public setStrategy(strategy: SelectionStrategy): void {
    this.strategy = strategy;
    
    this.logger.log(`Request distributor strategy changed to: ${strategy}`);
  }
  
  /**
   * Exclude a provider from selection for a specific network
   * 
   * @param providerType Provider type to exclude
   * @param network Network name
   * @param temporaryExclusionMs Optional duration in ms to exclude the provider (if not provided, excluded until explicitly included)
   */
  public excludeProvider(
    providerType: Providers,
    network: string,
    temporaryExclusionMs?: number
  ): void {
    // Initialize excluded providers set for this network if it doesn't exist
    if (!this.excludedProviders.has(network)) {
      this.excludedProviders.set(network, new Set());
    }
    
    // Add provider to excluded set
    this.excludedProviders.get(network)!.add(providerType);
    
    this.logger.log(`Excluded provider ${providerType} for network ${network}${temporaryExclusionMs ? ` for ${temporaryExclusionMs}ms` : ''}`);
    
    // If temporary exclusion is specified, schedule re-inclusion
    if (temporaryExclusionMs && temporaryExclusionMs > 0) {
      setTimeout(() => {
        this.includeProvider(providerType, network);
      }, temporaryExclusionMs);
    }
  }
  
  /**
   * Include a previously excluded provider
   * 
   * @param providerType Provider type to include
   * @param network Network name
   */
  public includeProvider(providerType: Providers, network: string): void {
    // Check if we have excluded providers for this network
    if (this.excludedProviders.has(network)) {
      // Remove provider from excluded set
      this.excludedProviders.get(network)!.delete(providerType);
      
      this.logger.log(`Included provider ${providerType} for network ${network}`);
    }
  }
  
  /**
   * Get the last selected provider type for a network
   * 
   * @param network Network name
   * @returns Last selected provider type or undefined if none selected yet
   */
  public getLastSelectedProviderType(network: string): Providers | undefined {
    return this.lastSelectedProviderType.get(network);
  }
  
  /**
   * Select the best provider for a request based on the current strategy
   * 
   * @param providers Available providers
   * @param network Network name
   * @returns Selected provider and its type
   */
  public selectProvider(
    providers: Map<Providers, ProviderAdapterPort>,
    network: string
  ): { provider: ProviderAdapterPort; type: Providers } {
    // Convert providers map to array of entries
    let availableProviders = Array.from(providers.entries())
      // Only include providers for the requested network
      .filter(([_, provider]) => provider.network === network);

    // Filter out excluded providers
    if (this.excludedProviders.has(network)) {
      const excluded = this.excludedProviders.get(network)!;
      availableProviders = availableProviders.filter(([type]) => !excluded.has(type));
    }

    // If no providers are available, throw an error
    if (availableProviders.length === 0) {
      throw new Error(`No providers available for network: ${network}`);
    }

    if (availableProviders.length === 1) {
      const [type, provider] = availableProviders[0];

      // Record selection
      this.lastSelectedProviderType.set(network, type);

      this.logger.debug(`Selected only available provider ${provider.getName()} (${type}) for network ${network}`);

      return { provider, type };
    }

    // Select provider based on strategy
    let selected: [Providers, ProviderAdapterPort];

    switch (this.strategy) {
      case SelectionStrategy.RATE_LIMIT:
        selected = this.selectByRateLimit(availableProviders);
        break;
      case SelectionStrategy.RESPONSE_TIME:
        selected = this.selectByResponseTime(availableProviders);
        break;
      case SelectionStrategy.HEALTH:
        selected = this.selectByHealth(availableProviders);
        break;
      case SelectionStrategy.LEAST_LOADED:
        selected = this.selectByLeastLoaded(availableProviders);
        break;
      case SelectionStrategy.ROUND_ROBIN:
        selected = this.selectByRoundRobin(availableProviders, network);
        break;
      case SelectionStrategy.RANDOM:
        selected = this.selectRandomly(availableProviders);
        break;
      default:
        selected = this.selectByRateLimit(availableProviders);
    }

    const [type, provider] = selected;

    // Record selection
    this.lastSelectedProviderType.set(network, type);

    this.logger.debug(`Selected provider ${provider.getName()} (${type}) for network ${network} using strategy ${this.strategy}`);

    return { provider, type };
  }
  
  /**
   * Select provider with the most remaining rate limit
   * 
   * @param providers Available providers
   * @returns Selected provider entry
   */
  private selectByRateLimit(
    providers: [Providers, ProviderAdapterPort][]
  ): [Providers, ProviderAdapterPort] {
    // Sort by rate limit remaining (highest first)
    const sorted = [...providers].sort((a, b) => {
      const statsA = a[1].getStats();
      const statsB = b[1].getStats();
      
      const remainingA = statsA.rateLimitStatus?.remaining ?? 0;
      const remainingB = statsB.rateLimitStatus?.remaining ?? 0;
      
      return remainingB - remainingA;
    });
    
    // Filter out providers with too few remaining requests
    const eligible = sorted.filter(([_, provider]) => {
      const stats = provider.getStats();
      const remaining = stats.rateLimitStatus?.remaining ?? 0;
      return remaining >= this.options.minRateLimitRemaining;
    });
    
    // Use eligible providers if available, otherwise fall back to all providers
    return eligible.length > 0 ? eligible[0] : sorted[0];
  }
  
  /**
   * Select provider with the fastest response time
   * 
   * @param providers Available providers
   * @returns Selected provider entry
   */
  private selectByResponseTime(
    providers: [Providers, ProviderAdapterPort][]
  ): [Providers, ProviderAdapterPort] {
    // Sort by average response time (lowest first)
    return [...providers].sort((a, b) => {
      const statsA = a[1].getStats();
      const statsB = b[1].getStats();
      
      return statsA.averageResponseTime - statsB.averageResponseTime;
    })[0];
  }
  
  /**
   * Select provider with the lowest failure rate
   * 
   * @param providers Available providers
   * @returns Selected provider entry
   */
  private selectByHealth(
    providers: [Providers, ProviderAdapterPort][]
  ): [Providers, ProviderAdapterPort] {
    // Sort by failure rate (lowest first)
    return [...providers].sort((a, b) => {
      const statsA = a[1].getStats();
      const statsB = b[1].getStats();
      
      const failureRateA = statsA.requestCount > 0 
        ? statsA.failureCount / statsA.requestCount 
        : 0;
      
      const failureRateB = statsB.requestCount > 0 
        ? statsB.failureCount / statsB.requestCount 
        : 0;
      
      return failureRateA - failureRateB;
    })[0];
  }
  
  /**
   * Select provider with the least number of requests
   * 
   * @param providers Available providers
   * @returns Selected provider entry
   */
  private selectByLeastLoaded(
    providers: [Providers, ProviderAdapterPort][]
  ): [Providers, ProviderAdapterPort] {
    // Sort by request count (lowest first)
    return [...providers].sort((a, b) => {
      const statsA = a[1].getStats();
      const statsB = b[1].getStats();
      
      return statsA.requestCount - statsB.requestCount;
    })[0];
  }
  
  /**
   * Select provider in round-robin fashion
   * 
   * @param providers Available providers
   * @param network Network name (used as key for round-robin counter)
   * @returns Selected provider entry
   */
  private selectByRoundRobin(
    providers: [Providers, ProviderAdapterPort][],
    network: string
  ): [Providers, ProviderAdapterPort] {
    // Get or initialize counter for this network
    const counter = this.roundRobinCounter.get(network) || 0;
    
    // Select provider by index
    const index = counter % providers.length;
    const selected = providers[index];
    
    // Update counter
    this.roundRobinCounter.set(network, counter + 1);
    
    return selected;
  }
  
  /**
   * Select provider randomly
   * 
   * @param providers Available providers
   * @returns Selected provider entry
   */
  private selectRandomly(
    providers: [Providers, ProviderAdapterPort][]
  ): [Providers, ProviderAdapterPort] {
    const index = Math.floor(Math.random() * providers.length);
    return providers[index];
  }
}

