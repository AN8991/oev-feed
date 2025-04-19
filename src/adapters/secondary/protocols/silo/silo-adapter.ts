// TODO: Silo Finance protocol adapter implementation
import { PositionModel } from '@/domain/models/position.model';
import { ProtocolAdapterPort } from '@domain/ports/secondary/protocol-adapter.port';

export class SiloProtocolAdapter implements ProtocolAdapterPort {
  // To be implemented
  public async initialize(): Promise<void> {
    throw new Error('Method not implemented');
  }
  public async fetchUserPositions(userAddress: string): Promise<PositionModel[]> {
    throw new Error('Method not implemented');
  }
  public async getHealthFactor(userAddress: string): Promise<string> {
    throw new Error('Method not implemented');
  }
  public async cleanup(): Promise<void> {
    throw new Error('Method not implemented');
  }
}
