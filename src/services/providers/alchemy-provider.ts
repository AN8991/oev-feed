import { Network, NetworkProvider } from '../../types/networks';
import { log } from '../../utils/logger';
import { ProviderUrls } from './provider-urls';

export class AlchemyProvider {
  // Get HTTP URL for Alchemy provider
  static getHttpUrl(network: Network, apiKey: string): string {
    return ProviderUrls.getHttpUrl(network, NetworkProvider.ALCHEMY, apiKey);
  }

  // Get WebSocket URL for Alchemy provider
  static getWsUrl(network: Network, apiKey: string): string {
    return ProviderUrls.getWsUrl(network, NetworkProvider.ALCHEMY, apiKey);
  }

  // Validate Alchemy API key format
  static validateApiKey(apiKey: string): boolean {
    if (!apiKey) {
      throw new Error('Alchemy API key is required');
    }

    // Alchemy API keys are typically 32 characters
    if (apiKey.length < 20) {
      throw new Error('Invalid Alchemy API key format');
    }

    log.info('Alchemy API Key Validated');
    return true;
  }
}
