// Secondary (outbound) port for database operations
import { PositionModel } from '@domain/models/position.model';

export interface DatabasePort {
  /**
   * Save user positions to the database
   */
  savePositions(positions: PositionModel[]): Promise<void>;

  /**
   * Find all positions (optionally filter by user)
   */
  getPositions(userAddress?: string): Promise<PositionModel[]>;
}
