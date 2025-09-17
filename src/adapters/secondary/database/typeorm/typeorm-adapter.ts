// TypeORM database adapter implementation
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabasePort } from '@domain/ports/secondary/database.port';
import { PositionModel } from '@domain/models/position.model';
import { PositionEntity } from './entities/position.entity';

@Injectable()
export class TypeORMAdapter implements DatabasePort {
  constructor(
    @InjectRepository(PositionEntity)
    private readonly positionRepository: Repository<PositionEntity>
  ) {}

  /**
   * Save positions to database with upsert logic
   */
  async savePositions(positions: PositionModel[]): Promise<void> {
    if (!positions || positions.length === 0) return;
    
    for (const position of positions) {
      // Check if position already exists based on user + protocol + network + asset
      const existingPosition = await this.positionRepository.findOne({
        where: {
          userAddress: position.userAddress,
          protocol: position.protocol,
          network: position.network,
          assetAddress: position.assetAddress
        }
      });

      if (existingPosition) {
        // Update existing position
        await this.positionRepository.update(
          { id: existingPosition.id },
          {
            assetSymbol: position.assetSymbol,
            collateralAmount: position.collateralAmount,
            collateralAmountUSD: position.collateralAmountUSD,
            debtAmount: position.debtAmount,
            debtAmountUSD: position.debtAmountUSD,
            healthFactor: position.healthFactor,
            liquidationThreshold: position.liquidationThreshold,
            ltv: position.ltv,
            lastUpdated: position.lastUpdated
          }
        );
      } else {
        // Insert new position
        const entity = Object.assign(new PositionEntity(), position);
        await this.positionRepository.save(entity);
      }
    }
  }

  /**
   * Find all positions (optionally filter by user)
   */
  async getPositions(userAddress?: string): Promise<PositionModel[]> {
    if (userAddress) {
      return this.positionRepository.find({ where: { userAddress } });
    }
    return this.positionRepository.find();
  }
}
