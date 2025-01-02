import { ProtocolService, SupportedProtocols } from '@/types/protocols';
import { AaveService } from './aave';
import { SiloService } from './silo';
import { OrbitService } from './orbit';
import { IroncladService } from './ironclad';
import { LendleService } from './lendle';
import { log } from '@/utils/logger';

export class ProtocolServiceFactory {
  private static services: Map<SupportedProtocols, ProtocolService> = new Map();

  static getService(protocol: SupportedProtocols): ProtocolService {
    if (!this.services.has(protocol)) {
      switch (protocol) {
        case SupportedProtocols.AAVE:
          this.services.set(protocol, new AaveService());
          break;
        case SupportedProtocols.SILO:
          this.services.set(protocol, new SiloService());
          break;
        case SupportedProtocols.ORBIT:
          this.services.set(protocol, new OrbitService());
          break;
        case SupportedProtocols.IRONCLAD:
          this.services.set(protocol, new IroncladService());
          break;
        case SupportedProtocols.LENDLE:
          this.services.set(protocol, new LendleService());
          break;
        // Add other protocol services as they are implemented
        default:
          log.error(`Protocol ${protocol} not implemented`);
          throw new Error(`Protocol ${protocol} not implemented`);
      }
    }

    return this.services.get(protocol)!;
  }

  static async getUserPositionsAcrossProtocols(address: string): Promise<any[]> {
    const positions = [];
    
    for (const protocol of Object.values(SupportedProtocols)) {
      try {
        const service = this.getService(protocol as SupportedProtocols);
        const protocolPositions = await service.getUserPositions(address);
        positions.push(...protocolPositions);
      } catch (error) {
        log.error(`Error fetching positions for ${protocol}`, { error, address });
        // Continue with other protocols even if one fails
      }
    }

    return positions;
  }
}
