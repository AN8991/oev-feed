// Domain service for Position operations - Core business logic
import { PositionModel } from '@domain/models/position.model';
import { PositionRepositoryPort } from '@domain/ports/secondary/repositories/position-repository.port';
import { RepositoryFactory } from '@adapters/secondary/database/typeorm/repositories/repository-factory';
import { PositionEntity } from '@adapters/secondary/database/typeorm/entities/position.entity';

export class PositionService {
  private positionRepository: PositionRepositoryPort<PositionEntity>;

  constructor(positionRepository?: PositionRepositoryPort<PositionEntity>) {
    this.positionRepository = positionRepository || RepositoryFactory.getInstance().getPositionRepository();
  }

  async savePositions(positions: PositionModel[]): Promise<void> {
    await this.positionRepository.savePositions(positions as PositionEntity[]);
  }

  async getPositions(userAddress?: string): Promise<PositionEntity[]> {
    return this.positionRepository.findAll(userAddress);
  }
}
