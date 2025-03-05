import { Network } from '../../../types/networks';
import { Protocol } from '../../../types/protocols';
import { ProtocolConfig } from './base-protocol';

/**
 * Extended protocol configuration with protocol-specific fields
 */
export interface ExtendedProtocolConfig extends ProtocolConfig {
  protocol: Protocol;
  apiKey?: string;
  healthCheckInterval?: number;
}

/**
 * Base builder for protocol service configurations
 */
export abstract class BaseConfigBuilder<T extends ExtendedProtocolConfig> {
  protected config: Partial<T> = {};

  /**
   * Set the network for the service
   * @param network The network to use
   */
  withNetwork(network: Network): this {
    this.config.network = network;
    return this;
  }

  /**
   * Set the RPC URL for the service
   * @param rpcUrl The RPC URL to use (optional in method signature, but required for validation)
   */
  withRpcUrl(rpcUrl?: string): this {
    this.config.rpcUrl = rpcUrl;
    return this;
  }

  /**
   * Set the WebSocket URL for the service
   * @param wsUrl The WebSocket URL to use (optional)
   */
  withWsUrl(wsUrl?: string): this {
    this.config.wsUrl = wsUrl;
    return this;
  }

  /**
   * Set the protocol for the service
   * @param protocol The protocol to use
   */
  withProtocol(protocol: Protocol): this {
    this.config.protocol = protocol;
    return this;
  }

  /**
   * Set the subgraph URL for the service
   * @param subgraphUrl The subgraph URL to use (optional)
   */
  withSubgraphUrl(subgraphUrl?: string): this {
    this.config.subgraphUrl = subgraphUrl;
    return this;
  }

  /**
   * Set the maximum number of connections for the service
   * @param maxConnections The maximum number of connections
   */
  withMaxConnections(maxConnections: number): this {
    this.config.maxConnections = maxConnections;
    return this;
  }

  /**
   * Set the connection timeout for the service
   * @param timeout The connection timeout in milliseconds
   */
  withConnectionTimeout(timeout: number): this {
    this.config.connectionTimeout = timeout;
    return this;
  }

  /**
   * Set the keep-alive timeout for the service
   * @param timeout The keep-alive timeout in milliseconds
   */
  withKeepAliveTimeout(timeout: number): this {
    this.config.keepAliveTimeout = timeout;
    return this;
  }

  /**
   * Set the API key for the service
   * @param apiKey The API key to use (optional)
   */
  withApiKey(apiKey?: string): this {
    this.config.apiKey = apiKey;
    return this;
  }

  /**
   * Set the retry attempts for the service
   * @param attempts The number of retry attempts
   */
  withRetryAttempts(attempts: number): this {
    this.config.retryAttempts = attempts;
    return this;
  }

  /**
   * Set the health check interval for the service
   * @param interval The health check interval in milliseconds
   */
  withHealthCheckInterval(interval: number): this {
    this.config.healthCheckInterval = interval;
    return this;
  }

  /**
   * Set fallback providers for the service
   * @param providers The fallback providers to use
   */
  withFallbackProviders(providers: { name: string; rpcUrl: string; wsUrl?: string }[]): this {
    this.config.fallbackProviders = providers;
    return this;
  }

  /**
   * Validate the configuration
   * @throws Error if required fields are missing
   */
  validate(): void {
    const requiredFields: (keyof ExtendedProtocolConfig)[] = ['network', 'rpcUrl', 'protocol'];
    const missingFields = requiredFields.filter(field => !this.config[field as keyof typeof this.config]);
    
    if (missingFields.length > 0) {
      if (missingFields.includes('rpcUrl')) {
        throw new Error(`Missing required RPC URL. Please set the appropriate environment variable.`);
      }
      throw new Error(`Missing required configuration fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Build the configuration
   * @returns The built configuration
   */
  build(): T {
    this.validate();
    return this.config as T;
  }
}
