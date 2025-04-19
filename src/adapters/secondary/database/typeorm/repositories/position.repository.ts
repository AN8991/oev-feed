import { Repository } from 'typeorm';
import { AppDataSource } from '@infrastructure/config/typeorm.config';
import { PositionEntity } from '@adapters/secondary/database/typeorm/entities/position.entity';
import { PositionModel } from '@domain/models/position.model';
import { PositionRepositoryPort } from '@domain/ports/secondary/repositories/position-repository.port';

export class PositionRepository implements PositionRepositoryPort<PositionEntity> {
  private repository: Repository<PositionEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(PositionEntity);
  }

  /**
   * Save (upsert) multiple positions
   */
  async savePositions(positions: PositionModel[]): Promise<void> {
    if (!positions || positions.length === 0) return;
    // Log all IDs for debugging
    const ids = positions.map(pos => pos.id);
    console.log('[DEBUG] Position IDs to save:', ids);
    // Check for duplicate IDs in the batch
    const duplicateIds = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (duplicateIds.length > 0) {
      console.warn('[WARNING] Duplicate position IDs in batch:', duplicateIds);
    }
    // Deduplicate by ID (keep last occurrence)
    const uniquePositions = Array.from(new Map(positions.map(p => [p.id, p])).values());
    // Map PositionModel[] to PositionEntity[]
    const entities = uniquePositions.map(pos => Object.assign(new PositionEntity(), pos));
    await this.repository.save(entities);
  }

  /**
   * Find all positions (optionally filter by user)
   */
  async findAll(userAddress?: string): Promise<PositionEntity[]> {
    if (userAddress) {
      return this.repository.find({ where: { userAddress } });
    }
    return this.repository.find();
  }
}
