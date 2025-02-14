import { Protocol } from '../../types/protocols';
import { Network } from '../../types/networks';
import { BaseProtocolService } from '../protocols/base';
import { AaveService } from '../protocols/aave';
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
          service = new AaveService();
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
      log.info(`Disposed service for ${protocol} on ${network}`);
    }
  }

  async disposeAll(): Promise<void> {
    const disposePromises: Promise<void>[] = [];
    for (const [key, service] of this.services.entries()) {
      disposePromises.push(service.dispose());
      log.info(`Disposing service: ${key}`);
    }
    
    await Promise.all(disposePromises);
    this.services.clear();
    log.info('All protocol services disposed');
  }
}

// Add shutdown hook for cleanup
process.on('SIGTERM', async () => {
  try {
    await ProtocolServiceFactory.getInstance().disposeAll();
    log.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    log.error('Error during shutdown', { error });
    process.exit(1);
  }
});
