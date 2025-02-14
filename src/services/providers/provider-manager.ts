import { ethers } from 'ethers';
import { Network } from '../../types/networks';
import { log } from '../../utils/logger';

export interface ProviderConfig {
  maxConnections?: number;
  connectionTimeout?: number;
  keepAliveTimeout?: number;
  network: Network;
  rpcUrl: string;
  wsUrl?: string;
}

export class ProviderManager {
  private static instance: ProviderManager;
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private wsProviders: Map<string, ethers.WebSocketProvider> = new Map();
  private config: Map<string, ProviderConfig> = new Map();

  private constructor() {}

  static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  async initializeProvider(key: string, config: ProviderConfig): Promise<void> {
    this.config.set(key, config);
  }

  async getProvider(key: string): Promise<ethers.JsonRpcProvider> {
    const config = this.config.get(key);
    if (!config) {
      throw new Error(`No configuration found for provider key: ${key}`);
    }

    let provider = this.providers.get(key);
    if (!provider) {
      provider = new ethers.JsonRpcProvider(config.rpcUrl);
      this.providers.set(key, provider);
      log.info(`Created new provider for ${key}`);
    }
    return provider;
  }

  async getWebSocketProvider(key: string): Promise<ethers.WebSocketProvider | null> {
    const config = this.config.get(key);
    if (!config || !config.wsUrl) {
      return null;
    }

    let wsProvider = this.wsProviders.get(key);
    if (!wsProvider) {
      wsProvider = new ethers.WebSocketProvider(config.wsUrl);
      this.wsProviders.set(key, wsProvider);
      log.info(`Created new WebSocket provider for ${key}`);
    }
    return wsProvider;
  }

  async disposeProvider(key: string): Promise<void> {
    const provider = this.providers.get(key);
    if (provider) {
      await provider.destroy();
      this.providers.delete(key);
      log.info(`Disposed provider for ${key}`);
    }

    const wsProvider = this.wsProviders.get(key);
    if (wsProvider) {
      await wsProvider.destroy();
      this.wsProviders.delete(key);
      log.info(`Disposed WebSocket provider for ${key}`);
    }
  }

  async disposeAll(): Promise<void> {
    const disposePromises: Promise<void>[] = [];
    for (const key of this.providers.keys()) {
      disposePromises.push(this.disposeProvider(key));
    }
    await Promise.all(disposePromises);
    log.info('All providers disposed');
  }
}
