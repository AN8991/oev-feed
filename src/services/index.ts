import { Protocol } from '@/types/protocols';
import { Network } from '@/types/networks';
import { BaseProtocolService } from '@/services/protocols/base';
import { AaveService } from '@/services/protocols/aave';
import { log } from '@/utils/logger';

export class ServiceFactory {
  private static instances = new Map<string, BaseProtocolService>();

  static getService(protocol: Protocol, network: Network): BaseProtocolService {
    // Validate network - only Ethereum is supported
    if (network !== Network.ETHEREUM) {
      const error = `Network ${network} not supported. Only Ethereum mainnet is currently supported.`;
      log.error(error);
      throw new Error(error);
    }

    const key = `${protocol}-${network}`;
    
    if (!this.instances.has(key)) {
      if (protocol !== Protocol.AAVE) {
        const error = `Protocol ${protocol} not supported. Only AAVE is currently supported.`;
        log.error(error);
        throw new Error(error);
      }
      this.instances.set(key, new AaveService(network));
    }

    const service = this.instances.get(key);
    if (!service) {
      const error = `Failed to initialize service for ${protocol} on ${network}`;
      log.error(error);
      throw new Error(error);
    }

    return service;
  }
}
