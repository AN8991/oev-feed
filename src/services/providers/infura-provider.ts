import { Network, NetworkProvider } from '../../types/networks';
import { log } from '../../utils/logger';
import { ProviderUrls } from './provider-urls';

export class InfuraProvider {
  // Get HTTP URL for Infura provider
  static getHttpUrl(network: Network, apiKey: string): string {
    return ProviderUrls.getHttpUrl(network, NetworkProvider.INFURA, apiKey);
  }

  // Get WebSocket URL for Infura provider
  static getWsUrl(network: Network, apiKey: string): string {
    return ProviderUrls.getWsUrl(network, NetworkProvider.INFURA, apiKey);
  }

  // Validate Infura API key format
  static validateApiKey(apiKey: string): boolean {
    if (!apiKey) {
      throw new Error('Infura API key is required');
    }

    // Infura API keys are typically 32 characters hexadecimal
    if (apiKey.length !== 32 || !/^[0-9a-f]+$/i.test(apiKey)) {
      throw new Error('Invalid Infura API key format');
    }

    log.info('Infura API Key Validated');
    return true;
  }
}
