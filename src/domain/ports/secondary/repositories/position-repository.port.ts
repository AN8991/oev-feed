import { PositionModel } from '@domain/models/position.model';

export interface PositionRepositoryPort<T = PositionModel> {
  savePositions(positions: PositionModel[]): Promise<void>;
  findAll(userAddress?: string): Promise<T[]>;
}
