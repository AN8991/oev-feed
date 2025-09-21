/**
 * Network Configuration Usage Examples
 * 
 * This file demonstrates how to use the new NetworkConfigService
 * in various scenarios throughout the application.
 */

import { Injectable, Logger } from '@nestjs/common';
import { NetworkConfigService } from '../infrastructure/config/network.config';
import { Network } from '../domain/types/networks';
import { Providers } from '../domain/enums/providers.enum';

@Injectable()
export class NetworkConfigUsageExample {
  private readonly logger = new Logger(NetworkConfigUsageExample.name);

  constructor(private readonly networkConfig: NetworkConfigService) {}

  /**
   * Example 1: Get basic network information (domain data only)
   */
  async getNetworkBasics() {
    // Get network information for business logic
    const ethereumInfo = this.networkConfig.getNetworkInfo(Network.ETHEREUM);
    
    this.logger.log(`Ethereum Chain ID: ${ethereumInfo.chainId}`);
    this.logger.log(`Native Token: ${ethereumInfo.symbol}`);
    this.logger.log(`Explorer: ${ethereumInfo.explorerUrl}`);
    
    return ethereumInfo;
  }

  /**
   * Example 2: Get complete network configuration with RPC URLs
   */
  async getNetworkConfiguration() {
    try {
      // Get configuration for Polygon using Alchemy
      const polygonConfig = this.networkConfig.getNetworkConfig(
        Network.POLYGON, 
        Providers.ALCHEMY
      );
      
      this.logger.log(`Polygon RPC URL: ${polygonConfig.rpcUrl}`);
      this.logger.log(`Polygon WebSocket: ${polygonConfig.wsUrl}`);
      this.logger.log(`Provider: ${polygonConfig.provider}`);
      
      return polygonConfig;
      
    } catch (error) {
      this.logger.error('Failed to get network configuration:', error);
      throw error;
    }
  }

  /**
   * Example 3: Dynamic provider selection with fallback
   */
  async getConfigurationWithFallback(network: Network) {
    const preferredProviders = [
      Providers.ALCHEMY,
      Providers.INFURA,
      Providers.QUICKNODE,
      Providers.BLOCKDAEMON
    ];

    for (const provider of preferredProviders) {
      try {
        if (this.networkConfig.isSupported(network, provider)) {
          const config = this.networkConfig.getNetworkConfig(network, provider);
          this.logger.log(`Using ${provider} for ${network}`);
          return config;
        }
      } catch (error) {
        this.logger.warn(`Provider ${provider} failed for ${network}, trying next...`);
        continue;
      }
    }

    // Fallback to environment variable if all providers fail
    const fallbackUrl = this.networkConfig.getFallbackRpcUrl(network);
    if (fallbackUrl) {
      this.logger.log(`Using fallback RPC URL for ${network}`);
      const networkInfo = this.networkConfig.getNetworkInfo(network);
      return {
        ...networkInfo,
        rpcUrl: fallbackUrl,
        provider: Providers.CUSTOM
      };
    }

    throw new Error(`No configuration available for network ${network}`);
  }

  /**
   * Example 4: Get all supported combinations
   */
  async getSupportMatrix() {
    const networks = this.networkConfig.getSupportedNetworks();
    const supportMatrix: Record<string, string[]> = {};

    for (const network of networks) {
      const providers = this.networkConfig.getSupportedProviders(network);
      supportMatrix[network] = providers;
    }

    this.logger.log('Network-Provider Support Matrix:', supportMatrix);
    return supportMatrix;
  }

  /**
   * Example 5: Validate configuration before use
   */
  async validateAndGetConfig(network: Network, provider: Providers) {
    // Check if combination is supported
    if (!this.networkConfig.isSupported(network, provider)) {
      throw new Error(`Provider ${provider} is not supported for network ${network}`);
    }

    // Get supported providers for this network
    const supportedProviders = this.networkConfig.getSupportedProviders(network);
    this.logger.log(`${network} supports: ${supportedProviders.join(', ')}`);

    // Get the configuration
    return this.networkConfig.getNetworkConfig(network, provider);
  }

  /**
   * Example 6: Multi-network setup for cross-chain operations
   */
  async setupMultiNetworkConfig() {
    const networks = [Network.ETHEREUM, Network.POLYGON, Network.ARBITRUM];
    const configs = [];

    for (const network of networks) {
      try {
        // Use different providers for load balancing
        const provider = this.selectProviderForNetwork(network);
        const config = this.networkConfig.getNetworkConfig(network, provider);
        configs.push(config);
        
        this.logger.log(`✅ Configured ${network} with ${provider}`);
      } catch (error) {
        this.logger.error(`❌ Failed to configure ${network}:`, error);
      }
    }

    return configs;
  }

  /**
   * Helper method to select provider based on network
   */
  private selectProviderForNetwork(network: Network): Providers {
    // Example logic: use different providers for different networks
    switch (network) {
      case Network.ETHEREUM:
        return Providers.ALCHEMY;
      case Network.POLYGON:
        return Providers.INFURA;
      case Network.ARBITRUM:
        return Providers.QUICKNODE;
      case Network.OPTIMISM:
        return Providers.BLOCKDAEMON;
      case Network.BLAST:
        return Providers.ALCHEMY;
      default:
        return Providers.INFURA;
    }
  }

  /**
   * Example 7: Environment-specific configuration
   */
  async getEnvironmentSpecificConfig(network: Network) {
    const environment = process.env.NODE_ENV || 'development';
    
    switch (environment) {
      case 'production':
        // Use premium providers in production
        return this.networkConfig.getNetworkConfig(network, Providers.ALCHEMY);
        
      case 'staging':
        // Use reliable but cost-effective providers in staging
        return this.networkConfig.getNetworkConfig(network, Providers.INFURA);
        
      case 'development':
        // Try local node first, fallback to public providers
        try {
          return this.networkConfig.getNetworkConfig(network, Providers.LOCAL);
        } catch {
          return this.networkConfig.getNetworkConfig(network, Providers.INFURA);
        }
        
      default:
        return this.networkConfig.getNetworkConfig(network, Providers.INFURA);
    }
  }
}

/**
 * Usage in other services:
 * 
 * @Injectable()
 * export class MyService {
 *   constructor(private readonly networkConfig: NetworkConfigService) {}
 *   
 *   async connectToNetwork() {
 *     const config = this.networkConfig.getNetworkConfig(Network.ETHEREUM, Providers.ALCHEMY);
 *     // Use config.rpcUrl to connect to the network
 *   }
 * }
 */
