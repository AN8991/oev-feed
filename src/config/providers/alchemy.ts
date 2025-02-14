import { Network, NetworkProvider, getNetworkConfig } from '@/types/networks';
import { Provider, ProviderConfig } from './types';
import { ENV } from '../env';

// Alchemy provider with network configuration from networks.ts
export const AlchemyProvider: ProviderConfig = {
  name: Provider.ALCHEMY,
  
  // Generate HTTP endpoint URL using network configuration
  getHttpUrl(network: Network, apiKey: string): string {
    // Use fallback to environment API key if not provided
    apiKey = apiKey || ENV.ALCHEMY_API_KEY;
    
    if (!apiKey) {
      throw new Error('Alchemy API key is required. Please provide a valid API key.');
    }

    const config = getNetworkConfig(network, NetworkProvider.ALCHEMY);
    return config.rpcUrl;
  },

  // Generate WebSocket endpoint URL using network configuration
  getWsUrl(network: Network, apiKey: string): string {
    // Use fallback to environment API key if not provided
    apiKey = apiKey || ENV.ALCHEMY_API_KEY;
    
    if (!apiKey) {
      throw new Error('Alchemy API key is required. Please provide a valid API key.');
    }

    const config = getNetworkConfig(network, NetworkProvider.ALCHEMY);
    return config.wsUrl || '';
  },

  // Check network support by attempting to generate configuration
  isSupported(network: Network): boolean {
    try {
      getNetworkConfig(network, NetworkProvider.ALCHEMY);
      return true;
    } catch {
      return false;
    }
  }
};
