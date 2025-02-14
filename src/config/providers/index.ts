import { Network } from '../../types/networks';
import { Provider, ProviderConfig, ProviderUrls } from './types';
import { AlchemyProvider } from './alchemy';
import { InfuraProvider } from './infura';
import { ENV } from '../env';

export * from './types';

// Configuration mapping for supported blockchain providers
const PROVIDERS: Record<Provider, ProviderConfig> = {
  [Provider.ALCHEMY]: AlchemyProvider,
  [Provider.INFURA]: InfuraProvider,
};

// Centralized management of blockchain providers with fallback mechanism
export class ProviderManager {
  private static instance: ProviderManager;
  private activeProvider: Provider;
  private fallbackProvider: Provider;

  private constructor() {
    // Default to Alchemy with Infura as fallback
    this.activeProvider = Provider.ALCHEMY;
    this.fallbackProvider = Provider.INFURA;
  }

  // Singleton pattern to ensure a single provider management instance
  static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  // Configure primary and fallback providers dynamically
  setProvider(provider: Provider, fallback?: Provider) {
    if (!(provider in PROVIDERS)) {
      throw new Error(`Provider ${provider} not supported`);
    }
    this.activeProvider = provider;
    if (fallback) {
      if (!(fallback in PROVIDERS)) {
        throw new Error(`Fallback provider ${fallback} not supported`);
      }
      this.fallbackProvider = fallback;
    }
  }

  // Retrieve connection URLs for a specific network, with fallback support
  getUrls(network: Network): ProviderUrls {
    const provider = PROVIDERS[this.activeProvider];
    const fallbackProvider = PROVIDERS[this.fallbackProvider];

    try {
      if (!provider.isSupported(network)) {
        throw new Error(`Network ${network} not supported by ${provider.name}`);
      }

      const apiKey = this.getApiKey(this.activeProvider);
      return {
        http: provider.getHttpUrl(network, apiKey),
        ws: provider.getWsUrl(network, apiKey),
      };
    } catch (error) {
      // Fallback to secondary provider if primary fails
      if (!fallbackProvider.isSupported(network)) {
        throw new Error(`Network ${network} not supported by any configured provider`);
      }

      const fallbackApiKey = this.getApiKey(this.fallbackProvider);
      return {
        http: fallbackProvider.getHttpUrl(network, fallbackApiKey),
        ws: fallbackProvider.getWsUrl(network, fallbackApiKey),
      };
    }
  }

  private getApiKey(provider: Provider): string {
    switch (provider) {
      case Provider.ALCHEMY:
        return ENV.getAlchemyApiKey();
      case Provider.INFURA:
        return ENV.getInfuraApiKey();
      default:
        throw new Error(`API key not found for provider ${provider}`);
    }
  }
}
