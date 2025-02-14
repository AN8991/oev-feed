import { Network, NetworkProvider, getNetworkConfig } from '@/types/networks';
import { Provider, ProviderConfig } from './types';
import { ENV } from '@/config/env';

// Infura provider with network configuration from networks.ts
export const InfuraProvider: ProviderConfig = {
  name: Provider.INFURA,
  
  // Generate HTTP endpoint URL using network configuration
  getHttpUrl(network: Network, apiKey: string): string {
    // Use fallback to environment API key if not provided
    apiKey = apiKey || ENV.INFURA_API_KEY;
    
    if (!apiKey) {
      throw new Error('Infura API key is required. Please provide a valid API key.');
    }

    const config = getNetworkConfig(network, NetworkProvider.INFURA);
    return config.rpcUrl;
  },

  // Generate WebSocket endpoint URL using network configuration
  getWsUrl(network: Network, apiKey: string): string {
    // Use fallback to environment API key if not provided
    apiKey = apiKey || ENV.INFURA_API_KEY;
    
    if (!apiKey) {
      throw new Error('Infura API key is required. Please provide a valid API key.');
    }

    const config = getNetworkConfig(network, NetworkProvider.INFURA);
    return config.wsUrl || '';
  },

  // Check network support by attempting to generate configuration
  isSupported(network: Network): boolean {
    try {
      getNetworkConfig(network, NetworkProvider.INFURA);
      return true;
    } catch {
      return false;
    }
  }
};
