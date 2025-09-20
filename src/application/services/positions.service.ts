import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { PositionEntity } from '../../adapters/secondary/database/typeorm/entities/position.entity';
import { ProtocolAdapterService } from '../../adapters/secondary/protocols/protocol-adapter.service';
import { CreatePositionDto, UpdatePositionDto } from '../dto/position.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PositionsService {
  private readonly logger = new Logger(PositionsService.name);

  constructor(
    @InjectRepository(PositionEntity)
    private readonly positionRepository: Repository<PositionEntity>,
    private readonly protocolAdapterService: ProtocolAdapterService,
    private readonly dataSource: DataSource,
  ) {}

  async getPositions(): Promise<PositionEntity[]> {
    // Return all positions from database
    return this.positionRepository.find({
      order: { lastUpdated: 'DESC' },
    });
  }

  async getPositionsByUser(userAddress: string): Promise<PositionEntity[]> {
    return this.positionRepository.find({
      where: { userAddress },
      order: { lastUpdated: 'DESC' },
    });
  }

  async fetchAndSavePositions(userAddresses: string[]): Promise<PositionEntity[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const savedPositions: PositionEntity[] = [];
      
      // Fetch positions from all available protocol adapters
      const adapters = this.protocolAdapterService.getAllAdapters();
      
      this.logger.log(`Starting batch position fetch for ${userAddresses.length} users across ${adapters.length} adapters`);
      
      for (const adapter of adapters) {
        try {
          const positions = await adapter.fetchUserPositions({ userAddresses });
          this.logger.debug(`Fetched ${positions.length} positions from ${adapter.getProtocol()}-${adapter.getNetwork()}`);
          
          // Batch process positions for this adapter
          const batchPositions = await this.processBatchPositions(positions, queryRunner);
          savedPositions.push(...batchPositions);
          
        } catch (error) {
          this.logger.error(`Error fetching positions from adapter ${adapter.getProtocol()}-${adapter.getNetwork()}:`, error);
          // Continue with other adapters even if one fails
        }
      }

      // Commit the transaction
      await queryRunner.commitTransaction();
      this.logger.log(`Successfully saved ${savedPositions.length} positions in transaction`);
      
      return savedPositions;
      
    } catch (error) {
      // Rollback the transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error('Error in batch position save, transaction rolled back:', error);
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  /**
   * Process positions in batches within a transaction
   * @param positions Array of position data
   * @param queryRunner Transaction query runner
   * @returns Array of saved position entities
   */
  private async processBatchPositions(
    positions: any[],
    queryRunner: QueryRunner
  ): Promise<PositionEntity[]> {
    const savedPositions: PositionEntity[] = [];
    const batchSize = 50; // Process in batches of 50
    
    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      const batchEntities = batch.map(positionData => this.createPositionEntity(positionData));
      
      // Use the query runner's manager for transactional operations
      const saved = await queryRunner.manager.save(PositionEntity, batchEntities);
      savedPositions.push(...saved);
      
      this.logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}: ${saved.length} positions`);
    }
    
    return savedPositions;
  }

  /**
   * Create a position entity with proper UUID and validation
   * @param positionData Position data from adapter
   * @returns PositionEntity instance
   */
  private createPositionEntity(positionData: any): PositionEntity {
    const entity = new PositionEntity();
    
    // Generate proper UUID instead of timestamp-based ID
    entity.id = uuidv4();
    entity.userAddress = positionData.userAddress;
    entity.protocol = positionData.protocol;
    entity.network = positionData.network;
    entity.assetAddress = positionData.assetAddress || '';
    entity.assetSymbol = positionData.assetSymbol || '';
    entity.collateralAmount = positionData.collateralAmount;
    entity.collateralAmountUSD = positionData.collateralAmountUSD || '0';
    entity.debtAmount = positionData.debtAmount;
    entity.debtAmountUSD = positionData.debtAmountUSD || '0';
    entity.healthFactor = positionData.healthFactor;
    entity.liquidationThreshold = positionData.liquidationThreshold;
    entity.ltv = positionData.ltv;
    entity.lastUpdated = new Date();
    
    return entity;
  }

  async findOne(id: string): Promise<PositionEntity | null> {
    return this.positionRepository.findOne({ where: { id } });
  }

  async create(dto: CreatePositionDto): Promise<PositionEntity> {
    const positionEntity = this.positionRepository.create({
      ...dto,
      id: uuidv4(), // Use proper UUID instead of timestamp-based ID
      lastUpdated: new Date(),
    });
    
    this.logger.debug(`Creating position with ID: ${positionEntity.id} for user: ${dto.userAddress}`);
    return this.positionRepository.save(positionEntity);
  }

  async update(id: string, dto: UpdatePositionDto): Promise<PositionEntity | null> {
    const existingPosition = await this.positionRepository.findOne({ where: { id } });
    if (!existingPosition) {
      return null;
    }
    
    Object.assign(existingPosition, dto, { lastUpdated: new Date() });
    return this.positionRepository.save(existingPosition);
  }

  async remove(id: string): Promise<boolean> {
    try {
      const result = await this.positionRepository.delete(id);
      const success = (result.affected ?? 0) > 0;
      
      if (success) {
        this.logger.debug(`Successfully removed position with ID: ${id}`);
      } else {
        this.logger.warn(`Position with ID: ${id} not found for removal`);
      }
      
      return success;
    } catch (error) {
      this.logger.error(`Error removing position with ID: ${id}`, error);
      throw error;
    }
  }

  /**
   * Bulk create positions with transaction support
   * @param dtos Array of position DTOs to create
   * @returns Array of created position entities
   */
  async bulkCreate(dtos: CreatePositionDto[]): Promise<PositionEntity[]> {
    if (dtos.length === 0) {
      return [];
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const entities = dtos.map(dto => ({
        ...dto,
        id: uuidv4(),
        lastUpdated: new Date(),
      }));

      const saved = await queryRunner.manager.save(PositionEntity, entities);
      await queryRunner.commitTransaction();
      
      this.logger.log(`Successfully bulk created ${saved.length} positions`);
      return saved;
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error in bulk create, transaction rolled back:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retry mechanism for external adapter calls
   * @param operation Function to retry
   * @param maxRetries Maximum number of retries
   * @param delay Delay between retries in milliseconds
   * @returns Promise with operation result
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          this.logger.error(`Operation failed after ${maxRetries} attempts:`, lastError);
          throw lastError;
        }
        
        this.logger.warn(`Operation attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
        await this.sleep(delay);
        delay *= 2; // Exponential backoff
      }
    }
    
    throw lastError!;
  }

  /**
   * Sleep utility for retry delays
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhanced fetch and save with retry mechanism
   * @param userAddresses Array of user addresses
   * @returns Array of saved position entities
   */
  async fetchAndSavePositionsWithRetry(userAddresses: string[]): Promise<PositionEntity[]> {
    return this.retryOperation(
      () => this.fetchAndSavePositions(userAddresses),
      3, // Max 3 retries
      2000 // Start with 2 second delay
    );
  }
}
