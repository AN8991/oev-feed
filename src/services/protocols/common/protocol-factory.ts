import { Network } from '../../../types/networks';
import { Protocol } from '../../../types/protocols';
import { BaseProtocolService, ProtocolConfig } from './base-protocol';
import { log } from '../../../utils/logger';

/**
 * Interface for protocol service factories
 */
export interface ProtocolServiceFactory<T extends BaseProtocolService, C extends ProtocolConfig> {
  /**
   * Create a service instance with the given configuration
   * @param config Service configuration
   */
  createService(config: C): Promise<T>;
  
  /**
   * Get a service instance for a specific network
   * @param network The network to get a service for
   */
  getServiceForNetwork(network: Network): Promise<T>;
  
  /**
   * Dispose a specific service instance
   * @param config Service configuration
   */
  disposeService(config: C): Promise<void>;
  
  /**
   * Dispose all service instances
   */
  disposeAll(): Promise<void>;
}

/**
 * Base implementation of a protocol service factory
 */
export abstract class BaseProtocolServiceFactory<T extends BaseProtocolService, C extends ProtocolConfig> implements ProtocolServiceFactory<T, C> {
  protected services: Map<string, T> = new Map();
  protected protocol: Protocol;
  
  constructor(protocol: Protocol) {
    this.protocol = protocol;
  }
  
  /**
   * Get a unique key for a service configuration
   * @param config Service configuration
   */
  protected getServiceKey(config: C): string {
    return `${this.protocol}-${config.network}`;
  }
  
  /**
   * Create a new service instance
   * @param config Service configuration
   */
  abstract createService(config: C): Promise<T>;
  
  /**
   * Get a service instance for a specific network
   * @param network The network to get a service for
   */
  abstract getServiceForNetwork(network: Network): Promise<T>;
  
  /**
   * Dispose a specific service instance
   * @param config Service configuration
   */
  async disposeService(config: C): Promise<void> {
    const key = this.getServiceKey(config);
    const service = this.services.get(key);
    
    if (service) {
      await service.dispose();
      this.services.delete(key);
      log.info('Disposed service', { key });
    }
  }
  
  /**
   * Dispose all service instances
   */
  async disposeAll(): Promise<void> {
    const disposePromises: Promise<void>[] = [];
    
    for (const [key, service] of this.services.entries()) {
      disposePromises.push(
        service.dispose()
          .catch(error => {
            log.error('Error disposing service', { key, error });
            throw error;
          })
      );
    }
    
    await Promise.all(disposePromises);
    this.services.clear();
    log.info(`All ${this.protocol} services disposed`);
  }
}
