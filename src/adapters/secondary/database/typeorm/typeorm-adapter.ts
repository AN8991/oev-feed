// TypeORM database adapter implementation
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabasePort } from '@domain/ports/secondary/database.port';
import { PositionModel } from '@domain/models/position.model';
import { PositionEntity } from './entities/position.entity';
import { UserEntity } from './entities/user.entity';

type PersistablePosition = PositionModel & { user?: UserEntity | undefined };

@Injectable()
export class TypeORMAdapter implements DatabasePort {
  constructor(
    @InjectRepository(PositionEntity)
    private readonly positionRepository: Repository<PositionEntity>
  ) {}

  /**
   * Save positions to database with upsert logic
   */
  async savePositions(positions: PersistablePosition[]): Promise<void> {
    console.log(`\n🚨 TypeORMAdapter.savePositions called with ${positions.length} positions`);
    
    if (!positions || positions.length === 0) {
      console.log(`🚨 No positions to save, returning early`);
      return;
    }
    
    for (const position of positions) {
      console.log(`🔍 Processing position with ID: ${position.id}, userAddress: ${position.userAddress}, user: ${position.user?.id || 'undefined'}`);
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
        // Update existing position - but we need to handle ID change
        console.log(`🔍 TypeORMAdapter: Found existing position with ID: ${existingPosition.id}, updating to new ID: ${position.id}`);
        
        if (existingPosition.id !== position.id) {
          // ID has changed, we need to delete the old one and create a new one
          console.log(`🔍 TypeORMAdapter: ID changed from ${existingPosition.id} to ${position.id}, recreating position`);
          await this.positionRepository.delete({ id: existingPosition.id });
          
          // Create new position with new ID
          const entity = this.positionRepository.create({
            id: position.id,
            user: position.user, // Set the user relationship
            userAddress: position.userAddress,
            protocol: position.protocol,
            network: position.network,
            assetAddress: position.assetAddress,
            assetSymbol: position.assetSymbol,
            collateralAmount: position.collateralAmount,
            collateralAmountUSD: position.collateralAmountUSD,
            debtAmount: position.debtAmount,
            debtAmountUSD: position.debtAmountUSD,
            healthFactor: position.healthFactor,
            liquidationThreshold: position.liquidationThreshold,
            ltv: position.ltv,
            lastUpdated: position.lastUpdated
          });
          await this.positionRepository.save(entity);
        } else {
          // Same ID, just update the fields
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
        }
      } else {
        // Insert new position - use repository.create() to ensure proper entity initialization
        console.log(`🔍 TypeORMAdapter: Creating new position entity with ID: ${position.id}`);
        const entity = this.positionRepository.create({
          id: position.id, // Use the UUID from the position model
          user: position.user, // Set the user relationship
          userAddress: position.userAddress,
          protocol: position.protocol,
          network: position.network,
          assetAddress: position.assetAddress,
          assetSymbol: position.assetSymbol,
          collateralAmount: position.collateralAmount,
          collateralAmountUSD: position.collateralAmountUSD,
          debtAmount: position.debtAmount,
          debtAmountUSD: position.debtAmountUSD,
          healthFactor: position.healthFactor,
          liquidationThreshold: position.liquidationThreshold,
          ltv: position.ltv,
          lastUpdated: position.lastUpdated
        });
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
