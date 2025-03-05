import { Network, NetworkProvider } from '../../types/networks';

// Centralized provider URL configurations
export class ProviderUrls {
  // Get HTTP URL for a provider
  static getHttpUrl(network: Network, provider: NetworkProvider, apiKey: string): string {
    switch (provider) {
      case NetworkProvider.ALCHEMY:
        switch (network) {
          case Network.ETHEREUM:
            return `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
          default:
            throw new Error(`Unsupported network for Alchemy: ${network}`);
        }
      
      case NetworkProvider.INFURA:
        switch (network) {
          case Network.ETHEREUM:
            return `https://mainnet.infura.io/v3/${apiKey}`;
          default:
            throw new Error(`Unsupported network for Infura: ${network}`);
        }
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  // Get WebSocket URL for a provider
  static getWsUrl(network: Network, provider: NetworkProvider, apiKey: string): string {
    switch (provider) {
      case NetworkProvider.ALCHEMY:
        switch (network) {
          case Network.ETHEREUM:
            return `wss://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
          default:
            throw new Error(`Unsupported network for Alchemy: ${network}`);
        }
      
      case NetworkProvider.INFURA:
        switch (network) {
          case Network.ETHEREUM:
            return `wss://mainnet.infura.io/ws/v3/${apiKey}`;
          default:
            throw new Error(`Unsupported network for Infura: ${network}`);
        }
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
