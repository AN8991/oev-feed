// Enumeration of supported blockchain networks
export enum Network {
  ETHEREUM = 'ethereum',
}

// Enumeration of supported network providers
export enum NetworkProvider {
  INFURA = 'infura',
  ALCHEMY = 'alchemy',
}

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

// Generate network configuration dynamically based on provider settings
export function getNetworkConfig(
  network: Network, 
  provider: NetworkProvider = NetworkProvider.INFURA
): NetworkConfig {
  // Retrieve network-specific URLs from provider manager
  const getProviderUrls = (provider: NetworkProvider) => {
    switch (provider) {
      case NetworkProvider.INFURA:
        return { 
          http: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`, 
          ws: `wss://mainnet.infura.io/ws/v3/${process.env.INFURA_API_KEY}`
        };
      case NetworkProvider.ALCHEMY:
        return { 
          http: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`, 
          ws: `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        };
      default:
        throw new Error(`Unsupported network provider: ${provider}`);
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