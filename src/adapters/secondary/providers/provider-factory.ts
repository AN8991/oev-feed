// Provider factory for creating and managing blockchain providers
import { ProviderAdapterPort } from '@domain/ports/secondary/provider-adapter.port';
import { AlchemyProviderAdapter, AlchemyProviderConfig } from './alchemy-provider.adapter';
import { InfuraProviderAdapter, InfuraProviderConfig } from './infura-provider.adapter';
import { EnhancedProviderAdapter } from './enhanced-provider.adapter';
import { DatabaseProviderAdapter } from './database-provider.adapter';
import { logger, LogCategory } from '@infrastructure/utils/structured-logger';
import { metrics, ProviderMetric } from '@infrastructure/utils/metrics-collector';
import { ProviderConfigService } from '@infrastructure/config/provider-config';
import { requestDistributor, SelectionStrategy } from '@infrastructure/utils/request-distributor';
import { DatabaseService } from '../../../domain/services/database/database.service';
import { ProviderType } from '@domain/enums/provider-type.enum';

/**
 * Provider options interface
 */
export interface ProviderOptions {
  /**
   * Provider type
   */
  type?: ProviderType;
  
  /**
   * Whether to use fallback providers if the primary provider fails
   */
  fallback?: boolean;
  
  /**
   * Provider-specific configuration options
   */
  config?: Record<string, any>;

  /**
   * Whether to use database persistence for provider metrics
   */
  useDatabasePersistence?: boolean;
}

/**
 * Provider factory class
 * Responsible for creating and managing provider instances
 */
export class ProviderFactory {
  /**
   * Provider cache
   * Maps network name and provider type to provider instance
   */
  private static providerCache: Map<string, Map<ProviderType, ProviderAdapterPort>> = new Map();
  
  /**
   * Provider priority for fallback
   */
  private static providerPriority: ProviderType[] = [];
  
  /**
   * Configuration service instance
   */
  private static configService: ProviderConfigService = ProviderConfigService.getInstance();
  
  /**
   * Initialize the provider factory
   */
  public static initialize(): void {
    // Load configuration from environment variables
    this.configService.loadFromEnv();
    
    // Set provider priority from configuration
    this.providerPriority = this.configService.getProviderPriority();
    
    logger.info('Provider factory initialized', LogCategory.GENERAL);
    logger.debug('Provider priority set', LogCategory.GENERAL, { priority: this.providerPriority });
  }
  
  /**
   * Get a provider for a specific network
   * @param network Network name
   * @param options Provider options
   * @returns Provider instance
   */
  public static async getProvider(
    network: string,
    options: ProviderOptions = {}
  ): Promise<ProviderAdapterPort> {
    const { type, fallback = true, config = {}, useDatabasePersistence = false } = options;
    
    // Normalize network name
    const normalizedNetwork = network.toLowerCase();
    
    // Check if network is supported
    if (!this.configService.isNetworkSupported(normalizedNetwork)) {
      throw new Error(`Unsupported network: ${network}`);
    }
    
    // Get provider type
    const providerType = type || this.getDefaultProviderType(normalizedNetwork);
    
    // Check if provider is cached
    const cachedProvider = this.getCachedProvider(normalizedNetwork, providerType);
    if (cachedProvider) {
      return cachedProvider;
    }
    
    try {
      // Create provider
      const provider = this.createProvider(providerType, normalizedNetwork, config, useDatabasePersistence);
      
      // Initialize provider
      await provider.initialize();
      
      // Cache provider
      this.cacheProvider(normalizedNetwork, providerType, provider);
      
      return provider;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      logger.error(
        `Failed to create ${providerType} provider for ${normalizedNetwork}:`, 
        LogCategory.PROVIDER, 
        { 
          network: normalizedNetwork, 
          providerType 
        },
        error instanceof Error ? error : new Error(errorMsg)
      );
      
      // If fallback is enabled, try alternative providers
      if (fallback) {
        return this.getFallbackProvider(normalizedNetwork, providerType, config, useDatabasePersistence);
      }
      
      throw new Error(`Failed to get provider for ${normalizedNetwork}: ${errorMsg}`);
    }
  }
  
  /**
   * Get the best provider for a specific network based on health, performance, and rate limits
   * @param network Network name
   * @returns Best provider instance
   */
  public static async getBestProvider(network: string): Promise<ProviderAdapterPort> {
    // Normalize network name
    const normalizedNetwork = network.toLowerCase();
    
    // Check if network is supported
    if (!this.configService.isNetworkSupported(normalizedNetwork)) {
      throw new Error(`Unsupported network: ${network}`);
    }
    
    // Get all providers for the network
    const providers = await this.getAllProviders(normalizedNetwork);
    
    if (providers.size === 0) {
      throw new Error(`No providers available for ${normalizedNetwork}`);
    }
    
    // If only one provider is available, return it
    if (providers.size === 1) {
      const firstProvider = providers.values().next().value;
      if (!firstProvider) {
        throw new Error(`Failed to get provider for ${normalizedNetwork}`);
      }
      return firstProvider;
    }
    
    // Score each provider
    const providerScores: Array<{
      provider: ProviderAdapterPort;
      score: number;
      type: ProviderType;
    }> = [];
    
    for (const [type, provider] of providers.entries()) {
      try {
        // Check if provider is healthy
        const isHealthy = await provider.isHealthy();
        
        if (!isHealthy) {
          logger.warn(
            `Provider ${provider.name} is not healthy, skipping`,
            LogCategory.PROVIDER,
            { provider: provider.name, network: normalizedNetwork }
          );
          continue;
        }
        
        // Get provider stats
        const stats = provider.getStats();
        
        // Calculate score based on stats
        let score = 100;
        
        // Factor 1: Response time (lower is better)
        if (stats.averageResponseTime > 0) {
          // Penalize for slow response time
          const responseTimePenalty = Math.min(30, stats.averageResponseTime / 10);
          score -= responseTimePenalty;
        }
        
        // Factor 2: Failure rate (lower is better)
        if (stats.requestCount > 0) {
          const failureRate = stats.failureCount / stats.requestCount;
          const failureRatePenalty = Math.min(50, failureRate * 100);
          score -= failureRatePenalty;
        }
        
        // Factor 3: Rate limit (higher remaining is better)
        if (stats.rateLimitStatus && stats.rateLimitStatus.limit > 0) {
          const remainingRatio = stats.rateLimitStatus.remaining / stats.rateLimitStatus.limit;
          
          // Penalize if less than 10% remaining
          if (remainingRatio < 0.1) {
            const rateLimitPenalty = Math.min(20, (0.1 - remainingRatio) * 200);
            score -= rateLimitPenalty;
          }
        }
        
        // Factor 4: Provider priority (higher priority is better)
        const priorityIndex = this.providerPriority.indexOf(type);
        if (priorityIndex !== -1) {
          // Boost score for higher priority providers
          const priorityBoost = Math.max(0, 10 - priorityIndex * 2);
          score += priorityBoost;
        }
        
        // Ensure score is between 0 and 100
        score = Math.max(0, Math.min(100, score));
        
        providerScores.push({ provider, score, type });
        
        logger.debug(
          `Provider ${provider.name} score: ${score}`,
          LogCategory.PROVIDER,
          { 
            provider: provider.name, 
            network: normalizedNetwork, 
            score,
            stats: {
              requestCount: stats.requestCount,
              failureCount: stats.failureCount,
              averageResponseTime: stats.averageResponseTime,
              rateLimitRemaining: stats.rateLimitStatus?.remaining,
              rateLimitTotal: stats.rateLimitStatus?.limit
            }
          }
        );
      } catch (error) {
        logger.error(
          `Failed to score provider ${provider.name}:`,
          LogCategory.PROVIDER,
          { provider: provider.name, network: normalizedNetwork },
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
    
    // Sort providers by score (descending)
    providerScores.sort((a, b) => b.score - a.score);
    
    if (providerScores.length === 0) {
      throw new Error(`No healthy providers available for ${normalizedNetwork}`);
    }
    
    // Log the selected provider
    const selected = providerScores[0];
    logger.info(
      `Selected best provider ${selected.provider.name} for ${normalizedNetwork} with score ${selected.score}`,
      LogCategory.PROVIDER,
      { 
        provider: selected.provider.name, 
        network: normalizedNetwork, 
        score: selected.score,
        allScores: providerScores.map(p => ({ 
          provider: p.provider.name, 
          type: p.type, 
          score: p.score 
        }))
      }
    );
    
    return selected.provider;
  }
  
  /**
   * Get all available providers for a specific network
   * @param network Network name
   * @returns Map of provider type to provider instance
   */
  public static async getAllProviders(network: string): Promise<Map<ProviderType, ProviderAdapterPort>> {
    // Normalize network name
    const normalizedNetwork = network.toLowerCase();
    
    // Check if network is supported
    if (!this.configService.isNetworkSupported(normalizedNetwork)) {
      throw new Error(`Unsupported network: ${network}`);
    }
    
    // Get network configuration
    const networkConfig = this.configService.getNetwork(normalizedNetwork);
    
    if (!networkConfig) {
      throw new Error(`Network configuration not found for ${normalizedNetwork}`);
    }
    
    // Get available provider types for the network
    const availableTypes = Object.keys(networkConfig.providers) as ProviderType[];
    
    if (availableTypes.length === 0) {
      throw new Error(`No providers configured for ${normalizedNetwork}`);
    }
    
    // Get providers for each type
    const providers = new Map<ProviderType, ProviderAdapterPort>();
    
    for (const type of availableTypes) {
      try {
        // Check if provider is cached
        const cachedProvider = this.getCachedProvider(normalizedNetwork, type);
        
        if (cachedProvider) {
          providers.set(type, cachedProvider);
          continue;
        }
        
        // Create provider
        const provider = this.createProvider(type, normalizedNetwork);
        
        // Initialize provider
        await provider.initialize();
        
        // Cache provider
        this.cacheProvider(normalizedNetwork, type, provider);
        
        providers.set(type, provider);
      } catch (error) {
        logger.error(
          `Failed to create provider ${type} for ${normalizedNetwork}:`,
          LogCategory.PROVIDER,
          { providerType: type, network: normalizedNetwork },
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
    
    return providers;
  }
  
  /**
   * Set provider priority for fallback
   * @param priority Provider priority array
   */
  public static setProviderPriority(priority: ProviderType[]): void {
    this.providerPriority = [...priority];
  }
  
  /**
   * Clear provider cache
   */
  public static clearCache(): void {
    // Clean up resources for each provider
    for (const [network, providers] of this.providerCache.entries()) {
      for (const [type, provider] of providers.entries()) {
        try {
          provider.cleanup();
        } catch (error) {
          logger.error(
            `Failed to clean up provider ${provider.name}:`,
            LogCategory.PROVIDER,
            { provider: provider.name, network },
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }
    }
    
    // Clear cache
    this.providerCache.clear();
    
    logger.info('Provider cache cleared', LogCategory.PROVIDER);
  }
  
  /**
   * Get cached provider
   * @param network Network name
   * @param type Provider type
   * @returns Cached provider or undefined if not found
   */
  private static getCachedProvider(
    network: string,
    type: ProviderType
  ): ProviderAdapterPort | undefined {
    const networkCache = this.providerCache.get(network);
    
    if (!networkCache) {
      return undefined;
    }
    
    return networkCache.get(type);
  }
  
  /**
   * Cache provider
   * @param network Network name
   * @param type Provider type
   * @param provider Provider instance
   */
  private static cacheProvider(
    network: string,
    type: ProviderType,
    provider: ProviderAdapterPort
  ): void {
    let networkCache = this.providerCache.get(network);
    
    if (!networkCache) {
      networkCache = new Map<ProviderType, ProviderAdapterPort>();
      this.providerCache.set(network, networkCache);
    }
    
    networkCache.set(type, provider);
  }
  
  /**
   * Create provider
   * @param type Provider type
   * @param network Network name
   * @param config Provider configuration
   * @param useDatabasePersistence Whether to use database persistence for provider metrics
   * @returns Provider instance
   */
  private static createProvider(
    type: ProviderType,
    network: string,
    config: Record<string, any> = {},
    useDatabasePersistence: boolean = false
  ): ProviderAdapterPort {
    // Merge default config with provided config
    const mergedConfig = {
      ...this.configService.getProviderConfig(network, type), // Fix argument order for getProviderConfig: should be (networkName, providerType)
      ...config,
      network // Ensure network is included in the config
    };
    
    let baseProvider: ProviderAdapterPort;
    
    // Create provider based on type
    switch (type) {
      case ProviderType.ALCHEMY:
        baseProvider = new AlchemyProviderAdapter(mergedConfig as AlchemyProviderConfig);
        break;
      case ProviderType.INFURA:
        baseProvider = new InfuraProviderAdapter(mergedConfig as InfuraProviderConfig);
        break;
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
    
    // Enhance provider with circuit breaker and retry logic
    const enhancedProvider = new EnhancedProviderAdapter(baseProvider);
    
    // If database persistence is enabled, wrap with database provider adapter
    if (useDatabasePersistence) {
      const dbService = new DatabaseService();
      return new DatabaseProviderAdapter(enhancedProvider, dbService, network);
    }
    
    return enhancedProvider;
  }
  
  /**
   * Get fallback provider
   * @param network Network name
   * @param excludeType Provider type to exclude
   * @param config Additional configuration
   * @param useDatabasePersistence Whether to use database persistence for provider metrics
   * @returns Fallback provider instance
   */
  private static async getFallbackProvider(
    network: string,
    excludeType: ProviderType,
    config: Record<string, any> = {},
    useDatabasePersistence: boolean = false
  ): Promise<ProviderAdapterPort> {
    // Get network configuration
    const networkConfig = this.configService.getNetwork(network);
    
    if (!networkConfig) {
      throw new Error(`Network configuration not found for ${network}`);
    }
    
    // Get available provider types for the network
    const availableTypes = Object.keys(networkConfig.providers) as ProviderType[];
    
    // Filter out excluded type
    const fallbackTypes = availableTypes.filter(type => type !== excludeType);
    
    if (fallbackTypes.length === 0) {
      throw new Error(`No fallback providers available for ${network}`);
    }
    
    // Sort fallback types by priority
    const sortedTypes = [...fallbackTypes].sort((a, b) => {
      const aIndex = this.providerPriority.indexOf(a);
      const bIndex = this.providerPriority.indexOf(b);
      
      // If both types are in priority list, sort by priority
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one type is in priority list, it comes first
      if (aIndex !== -1) {
        return -1;
      }
      
      if (bIndex !== -1) {
        return 1;
      }
      
      // If neither type is in priority list, keep original order
      return 0;
    });
    
    // Try each fallback type
    for (const type of sortedTypes) {
      try {
        // Check if provider is cached
        const cachedProvider = this.getCachedProvider(network, type);
        
        if (cachedProvider) {
          // Check if cached provider is healthy
          const isHealthy = await cachedProvider.isHealthy();
          
          if (isHealthy) {
            logger.info(
              `Using cached fallback provider ${type} for ${network}`,
              LogCategory.PROVIDER,
              { network, fromType: excludeType, toType: type }
            );
            
            // Record fallback metric
            metrics.recordProviderFallback(
              excludeType,
              excludeType,
              cachedProvider.name,
              type,
              network,
              'primary_provider_failed'
            );
            
            return cachedProvider;
          }
          
          logger.warn(
            `Cached fallback provider ${type} for ${network} is unhealthy, creating new instance`,
            LogCategory.PROVIDER,
            { network, providerType: type }
          );
        }
        
        // Create provider
        const provider = this.createProvider(type, network, config, useDatabasePersistence);
        
        // Initialize provider
        await provider.initialize();
        
        // Cache provider
        this.cacheProvider(network, type, provider);
        
        logger.info(
          `Using fallback provider ${type} for ${network}`,
          LogCategory.PROVIDER,
          { network, fromType: excludeType, toType: type }
        );
        
        // Record fallback metric
        metrics.recordProviderFallback(
          excludeType,
          excludeType,
          provider.name,
          type,
          network,
          'primary_provider_failed'
        );
        
        return provider;
      } catch (error) {
        logger.error(
          `Failed to create fallback provider ${type} for ${network}:`,
          LogCategory.PROVIDER,
          { network, providerType: type },
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
    
    throw new Error(`All fallback providers failed for ${network}`);
  }
  
  /**
   * Get default provider type for a network
   * @param network Network name
   * @returns Default provider type
   */
  private static getDefaultProviderType(network: string): ProviderType {
    // Get network configuration
    const networkConfig = this.configService.getNetwork(network);
    
    if (!networkConfig) {
      throw new Error(`Network configuration not found for ${network}`);
    }
    
    // Use network-specific default provider if available
    if (networkConfig.defaultProvider) {
      return networkConfig.defaultProvider;
    }
    
    // Use global default provider type
    const globalConfig = this.configService.getGlobalConfig();
    return globalConfig.defaultProviderType;
  }
  
  /**
   * Get all available networks
   * @returns Array of network names
   */
  public static getAvailableNetworks(): string[] {
    return this.configService.getNetworkNames();
  }
  
  /**
   * Get all provider types
   * @returns Object with provider types
   */
  public static getProviderTypes(): typeof ProviderType {
    return ProviderType;
  }
  
  /**
   * Get all cached providers for a specific network
   * @param network Network name
   * @returns Object mapping provider type to provider instance (or undefined)
   */
  public static getProvidersForNetwork(network: string): Record<string, ProviderAdapterPort | undefined> {
    const normalizedNetwork = network.toLowerCase();
    const providersMap = this.providerCache.get(normalizedNetwork);
    const result: Record<string, ProviderAdapterPort | undefined> = {};
    if (providersMap) {
      for (const [type, provider] of providersMap.entries()) {
        result[type] = provider;
      }
    }
    return result;
  }
}

export { ProviderType };

// Initialize provider factory
ProviderFactory.initialize();
