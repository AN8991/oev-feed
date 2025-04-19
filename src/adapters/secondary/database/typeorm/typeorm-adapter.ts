// TypeORM database adapter implementation
import { DatabasePort } from '@domain/ports/secondary/database.port';
import { PositionModel } from '@domain/models/position.model';
import { PositionRepository } from '@adapters/secondary/database/typeorm/repositories/position.repository';

export class TypeORMAdapter implements DatabasePort {
  private positionRepository: PositionRepository;

  constructor() {
    this.positionRepository = new PositionRepository();
  }

  /**
   * Save user positions to the database
   */
  async savePositions(positions: PositionModel[]): Promise<void> {
    await this.positionRepository.savePositions(positions);
  }

  /**
   * Find all positions (optionally filter by user)
   */
  async getPositions(userAddress?: string): Promise<PositionModel[]> {
    return this.positionRepository.findAll(userAddress);
  }
}
