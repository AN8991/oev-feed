import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PositionEntity } from '../../adapters/secondary/database/typeorm/entities/position.entity';
import { ProtocolAdapterService } from '../../adapters/secondary/protocols/protocol-adapter.service';
import { CreatePositionDto, UpdatePositionDto } from '../dto/position.dto';

@Injectable()
export class PositionsService {
  private readonly logger = new Logger(PositionsService.name);

  constructor(
    @InjectRepository(PositionEntity)
    private readonly positionRepository: Repository<PositionEntity>,
    private readonly protocolAdapterService: ProtocolAdapterService,
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
    const savedPositions: PositionEntity[] = [];

    // Fetch positions from all available protocol adapters
    const adapters = this.protocolAdapterService.getAllAdapters();
    
    for (const adapter of adapters) {
      try {
        const positions = await adapter.fetchUserPositions({ userAddresses });
        
        for (const positionData of positions) {
          const positionEntity = this.positionRepository.create({
            id: `${positionData.userAddress}-${positionData.protocol}-${positionData.network}-${Date.now()}`,
            userAddress: positionData.userAddress,
            protocol: positionData.protocol,
            network: positionData.network,
            assetAddress: positionData.assetAddress || '',
            assetSymbol: positionData.assetSymbol || '',
            collateralAmount: positionData.collateralAmount,
            collateralAmountUSD: positionData.collateralAmountUSD || '0',
            debtAmount: positionData.debtAmount,
            debtAmountUSD: positionData.debtAmountUSD || '0',
            healthFactor: positionData.healthFactor,
            liquidationThreshold: positionData.liquidationThreshold,
            ltv: positionData.ltv,
            lastUpdated: Date.now().toString(),
          });

          const savedPosition = await this.positionRepository.save(positionEntity);
          savedPositions.push(savedPosition);
        }
      } catch (error) {
        this.logger.error(`Error fetching positions from adapter:`, error);
      }
    }

    return savedPositions;
  }

  async findOne(id: string): Promise<PositionEntity | null> {
    return this.positionRepository.findOne({ where: { id } });
  }

  async create(dto: CreatePositionDto): Promise<PositionEntity> {
    const positionEntity = this.positionRepository.create({
      ...dto,
      id: `${dto.userAddress}-${dto.protocol}-${dto.network}-${Date.now()}`,
      lastUpdated: Date.now().toString(),
    });
    return this.positionRepository.save(positionEntity);
  }

  async update(id: string, dto: UpdatePositionDto): Promise<PositionEntity | null> {
    const existingPosition = await this.positionRepository.findOne({ where: { id } });
    if (!existingPosition) {
      return null;
    }
    
    Object.assign(existingPosition, dto, { lastUpdated: Date.now().toString() });
    return this.positionRepository.save(existingPosition);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.positionRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
