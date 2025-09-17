/*
 * File: networks.ts
 * Description: Type definitions and constants for supported blockchain networks in the domain layer.
 * Layer: Domain
 * Created: 2025-04-15
 */

/**
 * Domain types for networks and network providers
 * 
 * Part of the domain layer in hexagonal architecture
 * Contains core network abstractions that are independent of implementation details
 */

// Enumeration of supported blockchain networks
export enum Network {
  ETHEREUM = 'ethereum',
}

import { ProviderType } from '../enums/provider-type.enum';

// Use the domain ProviderType enum instead of duplicating
export { ProviderType as NetworkProvider };

// Detailed configuration for a specific blockchain network
export interface NetworkConfig {
  chainId: number;        // Unique identifier for the blockchain
  name: Network;          // Network name from the enum
  rpcUrl: string;         // HTTP endpoint for blockchain interactions
  wsUrl?: string;         // Optional WebSocket endpoint
  explorerUrl: string;    // Block explorer URL for the network
  nativeCurrency: {       // Details of the network's native cryptocurrency
    name: string;
    symbol: string;
    decimals: number;
  };
}

import { ProviderConfigService } from '../../infrastructure/config/provider-config';

// Generate network configuration dynamically based on provider settings
// NOTE: This function is deprecated and should be replaced with dependency injection
// For now, it uses environment variables directly to avoid singleton pattern
export function getNetworkConfig(
  network: Network, 
  provider: ProviderType = ProviderType.INFURA
): NetworkConfig {
  // Retrieve network-specific URLs from environment variables directly
  const getProviderUrls = (provider: ProviderType) => {
    const networkName = network.toLowerCase();
    
    try {
      // Get API keys from environment variables
      let apiKey: string | undefined;
      let baseUrl: string;
      
      switch (provider) {
        case ProviderType.ALCHEMY:
          apiKey = process.env.ALCHEMY_API_KEY;
          baseUrl = networkName === 'ethereum' 
            ? 'https://eth-mainnet.alchemyapi.io/v2/' 
            : `https://eth-${networkName}.alchemyapi.io/v2/`;
          break;
        case ProviderType.INFURA:
          apiKey = process.env.INFURA_API_KEY;
          baseUrl = networkName === 'ethereum' 
            ? 'https://mainnet.infura.io/v3/' 
            : `https://${networkName}.infura.io/v3/`;
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      if (!apiKey) {
        throw new Error(`API key not found for provider ${provider}. Please set the appropriate environment variable.`);
      }
      
      // Build URLs based on provider type
      let httpUrl: string;
      let wsUrl: string;
      
      switch (provider) {
        case ProviderType.ALCHEMY:
          httpUrl = `${baseUrl}${apiKey}`;
          wsUrl = baseUrl.replace('https://', 'wss://') + apiKey;
          break;
        case ProviderType.INFURA:
          httpUrl = `${baseUrl}${apiKey}`;
          wsUrl = baseUrl.replace('https://', 'wss://').replace('/v3/', '/ws/v3/') + apiKey;
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      return { http: httpUrl, ws: wsUrl };
    } catch (error) {
      throw new Error(`Failed to get provider URLs for ${provider} on ${network}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Base network configuration without URLs
  const configs: Record<Network, Omit<NetworkConfig, 'rpcUrl' | 'wsUrl'>> = {
    [Network.ETHEREUM]: {
      chainId: 1,
      name: Network.ETHEREUM,
      explorerUrl: 'https://etherscan.io',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
    }
  };

  // Get URLs for the specified provider
  const urls = getProviderUrls(provider);

  // Combine base config with dynamic URLs
  return {
    ...configs[network],
    rpcUrl: urls.http,
    wsUrl: urls.ws,
  };
};

// Precomputed network configurations for all supported networks
export const NETWORK_CONFIGS: Record<Network, NetworkConfig> = {
  [Network.ETHEREUM]: getNetworkConfig(Network.ETHEREUM)
};
