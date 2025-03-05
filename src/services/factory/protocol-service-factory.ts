import { Protocol } from '../../types/protocols';
import { Network } from '../../types/networks';
import { BaseProtocolService } from '../protocols/common/base-protocol';
import { AaveServiceFactory } from '../protocols/aave/aave-factory';
import { log } from '../../utils/logger';

export class ProtocolServiceFactory {
  private static instance: ProtocolServiceFactory;
  private services: Map<string, BaseProtocolService> = new Map();

  private constructor() {}

  static getInstance(): ProtocolServiceFactory {
    if (!ProtocolServiceFactory.instance) {
      ProtocolServiceFactory.instance = new ProtocolServiceFactory();
    }
    return ProtocolServiceFactory.instance;
  }

  private getServiceKey(protocol: Protocol, network: Network): string {
    return `${protocol}-${network}`;
  }

  async getService(protocol: Protocol, network: Network): Promise<BaseProtocolService> {
    const key = this.getServiceKey(protocol, network);
    
    if (!this.services.has(key)) {
      let service: BaseProtocolService;
      
      switch (protocol) {
        case Protocol.AAVE:
          // Use the new factory pattern
          const aaveFactory = AaveServiceFactory.getInstance();
          service = await aaveFactory.getServiceForNetwork(network);
          break;
        // Add cases for future protocols here
        default:
          throw new Error(`Unsupported protocol: ${protocol}`);
      }
      
      this.services.set(key, service);
      log.info(`Created new service instance for ${protocol} on ${network}`);
    }
    
    return this.services.get(key)!;
  }

  async disposeService(protocol: Protocol, network: Network): Promise<void> {
    const key = this.getServiceKey(protocol, network);
    const service = this.services.get(key);
    
    if (service) {
      await service.dispose();
      this.services.delete(key);
      log.info(`Disposed service instance for ${protocol} on ${network}`);
    }
  }

  async disposeAll(): Promise<void> {
    const services = Array.from(this.services.values());
    await Promise.all(services.map(service => service.dispose()));
    this.services.clear();
    log.info('Disposed all protocol service instances');
  }
}

// Add shutdown hook for cleanup
process.on('SIGTERM', async () => {
  try {
    await ProtocolServiceFactory.getInstance().disposeAll();
    log.info('Gracefully shut down protocol services');
  } catch (error) {
    log.error('Error during protocol services shutdown', error);
  }
});

process.on('SIGINT', async () => {
  try {
    await ProtocolServiceFactory.getInstance().disposeAll();
    log.info('Gracefully shut down protocol services');
  } catch (error) {
    log.error('Error during protocol services shutdown', error);
  }
});
