import { Network } from '../../types/networks';

export enum Provider {
  ALCHEMY = 'alchemy',
  INFURA = 'infura',
}

export interface ProviderConfig {
  name: Provider;
  getHttpUrl(network: Network, apiKey: string): string;
  getWsUrl(network: Network, apiKey: string): string;
  isSupported(network: Network): boolean;
}

export interface ProviderUrls {
  http: string;
  ws?: string;
}
