import { Protocol } from '@/types/protocols';
import { Network } from '@/types/networks';
import { BaseProtocolService } from '@/services/protocols/common/base-protocol';
import { AaveServiceFactory } from '@/services/protocols/aave/aave-factory';
import { log } from '@/utils/logger';

export class ServiceFactory {
  private static instances = new Map<string, BaseProtocolService>();

  static async getService(protocol: Protocol, network: Network): Promise<BaseProtocolService> {
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
      
      try {
        // Use the new factory pattern
        const aaveFactory = AaveServiceFactory.getInstance();
        const service = await aaveFactory.getServiceForNetwork(network);
        this.instances.set(key, service);
      } catch (error) {
        const errorMsg = `Failed to initialize service for ${protocol} on ${network}: ${error}`;
        log.error(errorMsg);
        throw new Error(errorMsg);
      }
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
