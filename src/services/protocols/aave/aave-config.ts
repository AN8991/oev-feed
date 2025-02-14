import { Network } from '../../../types/networks';
import { Protocol } from '../../../types/protocols';

export interface AaveServiceConfig {
  network: Network;
  rpcUrl: string;
  wsUrl?: string;
  subgraphUrl?: string;
  maxConnections?: number;
  connectionTimeout?: number;
  keepAliveTimeout?: number;
  protocol: Protocol;
  apiKey?: string;
  retryAttempts?: number;
  healthCheckInterval?: number;
}

export class AaveConfigBuilder {
  private config: Partial<AaveServiceConfig> = {};

  withNetwork(network: Network): AaveConfigBuilder {
    this.config.network = network;
    return this;
  }

  withRpcUrl(rpcUrl: string): AaveConfigBuilder {
    this.config.rpcUrl = rpcUrl;
    return this;
  }

  withWsUrl(wsUrl: string): AaveConfigBuilder {
    this.config.wsUrl = wsUrl;
    return this;
  }

  withSubgraphUrl(subgraphUrl: string): AaveConfigBuilder {
    this.config.subgraphUrl = subgraphUrl;
    return this;
  }

  withMaxConnections(maxConnections: number): AaveConfigBuilder {
    this.config.maxConnections = maxConnections;
    return this;
  }

  withConnectionTimeout(timeout: number): AaveConfigBuilder {
    this.config.connectionTimeout = timeout;
    return this;
  }

  withKeepAliveTimeout(timeout: number): AaveConfigBuilder {
    this.config.keepAliveTimeout = timeout;
    return this;
  }

  withProtocol(protocol: Protocol): AaveConfigBuilder {
    this.config.protocol = protocol;
    return this;
  }

  withApiKey(apiKey: string): AaveConfigBuilder {
    this.config.apiKey = apiKey;
    return this;
  }

  withRetryAttempts(attempts: number): AaveConfigBuilder {
    this.config.retryAttempts = attempts;
    return this;
  }

  withHealthCheckInterval(interval: number): AaveConfigBuilder {
    this.config.healthCheckInterval = interval;
    return this;
  }

  validate(): void {
    const requiredFields: (keyof AaveServiceConfig)[] = ['network', 'rpcUrl', 'protocol'];
    const missingFields = requiredFields.filter(field => !this.config[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required configuration fields: ${missingFields.join(', ')}`);
    }
  }

  build(): AaveServiceConfig {
    this.validate();
    return this.config as AaveServiceConfig;
  }
}
