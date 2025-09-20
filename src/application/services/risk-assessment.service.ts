/*
 * File: risk-assessment.service.ts
 * Description: Application service for risk assessment operations.
 * Layer: Application
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RiskAssessmentModel, RiskCalculator, AssetPosition } from '@domain/models/risk.model';
import { RiskAssessmentPort } from '@domain/ports/secondary/risk-assessment.port';
import { UserProtocolPosition, Protocol } from '@domain/types/protocols';
import { Network } from '@domain/types/networks';
import { PositionEntity } from '../../adapters/secondary/database/typeorm/entities/position.entity';
import { PositionsService } from './positions.service';

/**
 * Application service for risk assessment operations
 * Implements the RiskAssessmentPort interface
 */
@Injectable()
export class RiskAssessmentService implements RiskAssessmentPort {
  private readonly logger = new Logger(RiskAssessmentService.name);
  
  constructor(
    @InjectRepository(PositionEntity)
    private readonly positionRepository: Repository<PositionEntity>,
    private readonly positionsService: PositionsService,
  ) {}
  
  /**
   * Calculate risk assessment for a single position
   */
  async calculateRiskAssessment(position: UserProtocolPosition): Promise<RiskAssessmentModel> {
    try {
      this.logger.debug(
        `Calculating risk assessment for position: ${position.userAddress} on ${position.protocol}`
      );

      // Transform supplied assets to AssetPosition format
      const suppliedAssets: AssetPosition[] = position.suppliedAssets.map(asset => ({
        symbol: asset.symbol,
        address: asset.address,
        amount: asset.amount,
        valueUSD: this.convertETHToUSD(asset.valueETH || '0'),
        valueETH: asset.valueETH,
        percentage: 0 // Will be calculated in RiskCalculator
      }));

      // Transform borrowed assets to AssetPosition format
      const borrowedAssets: AssetPosition[] = position.borrowedAssets.map(asset => ({
        symbol: asset.symbol,
        address: asset.address || '',
        amount: asset.amount,
        valueUSD: this.convertETHToUSD(asset.valueETH),
        valueETH: asset.valueETH
      }));

      // Calculate total collateral and debt in USD
      const totalCollateralUSD = suppliedAssets
        .reduce((sum, asset) => sum + parseFloat(asset.valueUSD || '0'), 0)
        .toString();

      const totalDebtUSD = borrowedAssets
        .reduce((sum, asset) => sum + parseFloat(asset.valueUSD || '0'), 0)
        .toString();

      // Extract risk metrics from position
      const healthFactor = position.healthFactor;
      const liquidationThreshold = position.liquidationRisk?.threshold || '0';
      const currentLTV = position.liquidationRisk?.currentLTV || '0';

      // Use a temporary position ID for risk assessment
      const positionId = `temp-${position.userAddress}-${position.protocol}-${position.network}`;

      // Create risk assessment using RiskCalculator
      const riskAssessment = RiskCalculator.createRiskAssessment(
        position.userAddress,
        position.protocol,
        position.network,
        positionId,
        suppliedAssets,
        borrowedAssets,
        healthFactor,
        liquidationThreshold,
        currentLTV,
        totalCollateralUSD,
        totalDebtUSD
      );

      // Persist risk assessment data to database
      await this.persistRiskAssessment(riskAssessment, position);

      this.logger.log(
        `Risk assessment completed: ${riskAssessment.riskLevel} (Score: ${riskAssessment.compositeRiskScore})`,
        {
          userAddress: position.userAddress,
          protocol: position.protocol,
          riskLevel: riskAssessment.riskLevel,
          healthFactor: riskAssessment.healthFactor,
          alertCount: riskAssessment.riskAlerts.length
        }
      );

      return riskAssessment;

    } catch (error) {
      this.logger.error(
        'Error calculating risk assessment',
        error instanceof Error ? error : new Error(String(error))
      );
      throw new Error(`Failed to calculate risk assessment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate risk assessments for multiple positions
   */
  async calculateBulkRiskAssessments(positions: UserProtocolPosition[]): Promise<RiskAssessmentModel[]> {
    this.logger.log(`Calculating bulk risk assessments for ${positions.length} positions`);

    const results: RiskAssessmentModel[] = [];
    const errors: string[] = [];

    // Process positions in parallel with error handling
    const assessmentPromises = positions.map(async (position, index) => {
      try {
        return await this.calculateRiskAssessment(position);
      } catch (error) {
        const errorMsg = `Position ${index} (${position.userAddress}): ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        this.logger.warn(`Failed to assess position: ${errorMsg}`);
        return null;
      }
    });

    const assessmentResults = await Promise.all(assessmentPromises);
    
    // Filter out failed assessments
    assessmentResults.forEach(result => {
      if (result) {
        results.push(result);
      }
    });

    if (errors.length > 0) {
      this.logger.warn(
        `Bulk risk assessment completed with ${errors.length} errors`,
        { errorCount: errors.length, successCount: results.length }
      );
    }

    return results;
  }

  /**
   * Get risk assessment for a specific user and protocol
   */
  async getRiskAssessmentByUser(
    userAddress: string,
    protocol: string,
    network: string
  ): Promise<RiskAssessmentModel | null> {
    this.logger.debug(
      `Getting risk assessment for user: ${userAddress} on ${protocol}/${network}`
    );

    try {
      // Query the database for the latest risk assessment
      const position = await this.positionRepository.findOne({
        where: {
          userAddress: userAddress.toLowerCase(),
          protocol: protocol.toLowerCase(),
          network: network.toLowerCase()
        },
        order: {
          riskAssessedAt: 'DESC'
        }
      });

      if (position && position.riskScore && position.riskLevel && position.riskAssessedAt) {
        // Check if the assessment is recent (within last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (position.riskAssessedAt > oneHourAgo) {
          // Return cached risk assessment
          const userPosition = this.convertPositionEntityToUserProtocolPosition(position);
          return await this.calculateRiskAssessment(userPosition);
        }
      }

      // If no recent assessment found, calculate fresh one
      if (position) {
        const userPosition = this.convertPositionEntityToUserProtocolPosition(position);
        return await this.calculateRiskAssessment(userPosition);
      }

      return null;
    } catch (error) {
      this.logger.error('Error getting risk assessment by user', { error });
      return null;
    }
  }

  /**
   * Get all risk assessments with specified risk level
   */
  async getRiskAssessmentsByLevel(
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    limit: number = 100
  ): Promise<RiskAssessmentModel[]> {
    this.logger.debug(`Getting risk assessments with level: ${riskLevel}`);

    try {
      // Query positions with the specified risk level
      const positions = await this.positionRepository.find({
        where: {
          riskLevel: riskLevel
        },
        order: {
          riskAssessedAt: 'DESC',
          riskScore: 'DESC'
        },
        take: limit
      });

      // Convert positions to risk assessments
      const riskAssessments: RiskAssessmentModel[] = [];
      for (const position of positions) {
        if (position.riskScore && position.riskLevel && position.riskAssessedAt) {
          const userPosition = this.convertPositionEntityToUserProtocolPosition(position);
          const riskAssessment = await this.calculateRiskAssessment(userPosition);
          riskAssessments.push(riskAssessment);
        }
      }

      return riskAssessments;
    } catch (error) {
      this.logger.error('Error getting risk assessments by level', { error });
      return [];
    }
  }

  /**
   * Get positions at risk of liquidation
   */
  async getPositionsAtRisk(
    healthFactorThreshold: number = 1.2,
    limit: number = 50
  ): Promise<RiskAssessmentModel[]> {
    this.logger.debug(
      `Getting positions at risk with HF threshold: ${healthFactorThreshold}`
    );

    try {
      // Query positions with health factor below threshold
      const riskyPositions = await this.positionRepository.find({
        where: {
          healthFactor: LessThan(healthFactorThreshold.toString())
        },
        order: {
          healthFactor: 'ASC',
          lastUpdated: 'DESC'
        },
        take: limit
      });

      // Calculate risk assessments for each position
      const riskAssessments: RiskAssessmentModel[] = [];
      
      for (const position of riskyPositions) {
        const userPosition = this.convertPositionEntityToUserProtocolPosition(position);
        const riskAssessment = await this.calculateRiskAssessment(userPosition);
        riskAssessments.push(riskAssessment);
      }

      return riskAssessments;
    } catch (error) {
      this.logger.error('Error getting positions at risk', { error });
      throw error;
    }
  }

  /**
   * Calculate risk assessments for all positions of a specific user
   */
  async calculateUserRiskAssessments(userAddress: string): Promise<RiskAssessmentModel[]> {
    const positions = await this.positionsService.getPositionsByUser(userAddress);
    const riskAssessments: RiskAssessmentModel[] = [];

    for (const position of positions) {
      const userPosition = this.convertPositionEntityToUserProtocolPosition(position);
      const riskAssessment = await this.calculateRiskAssessment(userPosition);
      riskAssessments.push(riskAssessment);
    }

    return riskAssessments;
  }

  /**
   * Calculate risk assessments for all positions in database
   */
  async calculateAllRiskAssessments(limit: number = 100): Promise<RiskAssessmentModel[]> {
    const positions = await this.positionRepository.find({
      order: { lastUpdated: 'DESC' },
      take: limit
    });

    const riskAssessments: RiskAssessmentModel[] = [];
    
    for (const position of positions) {
      try {
        const userPosition = this.convertPositionEntityToUserProtocolPosition(position);
        const riskAssessment = await this.calculateRiskAssessment(userPosition);
        riskAssessments.push(riskAssessment);
      } catch (error) {
        this.logger.error(`Error calculating risk for position ${position.id}`, { error });
      }
    }

    return riskAssessments;
  }

  /**
   * Convert ETH value to USD (placeholder implementation)
   * In production, this would use real-time price feeds
   */
  private convertETHToUSD(ethValue: string): string {
    // TODO: Implement real ETH/USD conversion using price feeds
    // For now, using a placeholder conversion rate
    const ETH_USD_RATE = 2000; // Placeholder rate
    const ethAmount = parseFloat(ethValue || '0');
    return (ethAmount * ETH_USD_RATE).toString();
  }

  /**
   * Generate a unique position ID
   */
  private generatePositionId(userAddress: string, protocol: string, network: string): string {
    return `${protocol}-${network}-${userAddress.toLowerCase()}`;
  }

  /**
   * Convert PositionEntity to UserProtocolPosition format
   */
  private convertPositionEntityToUserProtocolPosition(position: PositionEntity): UserProtocolPosition {
    return {
      userAddress: position.userAddress,
      protocol: this.mapStringToProtocol(position.protocol),
      network: this.mapStringToNetwork(position.network),
      version: 'v3', // Default version, could be stored in entity
      collateral: position.collateralAmount,
      debt: position.debtAmount,
      healthFactor: position.healthFactor,
      liquidationRisk: {
        threshold: position.liquidationThreshold,
        currentLTV: position.ltv
      },
      suppliedAssets: [{
        symbol: position.assetSymbol,
        address: position.assetAddress,
        amount: position.collateralAmount,
        valueETH: this.convertUSDToETH(position.collateralAmountUSD)
      }],
      borrowedAssets: [{
        symbol: position.assetSymbol,
        address: position.assetAddress,
        amount: position.debtAmount,
        valueETH: this.convertUSDToETH(position.debtAmountUSD)
      }],
      fetchedTimestamp: position.lastUpdated.getTime()
    };
  }

  /**
   * Convert USD value to ETH (inverse of convertETHToUSD)
   */
  private convertUSDToETH(usdValue: string): string {
    const ETH_USD_RATE = 2000; // Same placeholder rate
    const usdAmount = parseFloat(usdValue || '0');
    return (usdAmount / ETH_USD_RATE).toString();
  }

  /**
   * Map string protocol to Protocol enum
   */
  private mapStringToProtocol(protocolString: string): Protocol {
    switch (protocolString.toLowerCase()) {
      case 'aave':
      case 'aave-v2':
      case 'aave-v3':
        return Protocol.AAVE;
      default:
        return Protocol.AAVE; // Default fallback
    }
  }

  /**
   * Map string network to Network enum
   */
  private mapStringToNetwork(networkString: string): Network {
    switch (networkString.toLowerCase()) {
      case 'ethereum':
        return Network.ETHEREUM;
      default:
        return Network.ETHEREUM; // Default fallback
    }
  }

  /**
   * Persist risk assessment data to the database
   */
  private async persistRiskAssessment(riskAssessment: RiskAssessmentModel, userPosition: UserProtocolPosition): Promise<void> {
    try {
      // Find the position in the database using user address, protocol, and network
      this.logger.debug(`Looking for position with: userAddress=${userPosition.userAddress.toLowerCase()}, protocol=${userPosition.protocol.toLowerCase()}, network=${userPosition.network.toLowerCase()}`);
      
      // Use case-insensitive search with query builder
      const position = await this.positionRepository
        .createQueryBuilder('position')
        .where('LOWER(position.userAddress) = LOWER(:userAddress)', { userAddress: userPosition.userAddress })
        .andWhere('LOWER(position.protocol) = LOWER(:protocol)', { protocol: userPosition.protocol })
        .andWhere('LOWER(position.network) = LOWER(:network)', { network: userPosition.network })
        .orderBy('position.lastUpdated', 'DESC')
        .getOne();

      this.logger.debug(`Found position: ${position ? position.id : 'null'}`);

      if (position) {
        // Update the position with risk assessment data
        await this.positionRepository.update(
          { id: position.id },
          {
            riskScore: riskAssessment.compositeRiskScore.toString(),
            riskLevel: riskAssessment.riskLevel,
            riskAssessedAt: new Date()
          }
        );

        this.logger.debug(
          `Risk assessment persisted for position: ${position.id}`,
          {
            userAddress: userPosition.userAddress,
            protocol: userPosition.protocol,
            riskScore: riskAssessment.compositeRiskScore,
            riskLevel: riskAssessment.riskLevel
          }
        );
      } else {
        this.logger.warn(
          `Position not found for risk assessment persistence: ${userPosition.userAddress} on ${userPosition.protocol}/${userPosition.network}`
        );
      }
    } catch (error) {
      this.logger.error(
        'Error persisting risk assessment',
        error instanceof Error ? error : new Error(String(error))
      );
      // Don't throw here to avoid breaking the risk calculation flow
    }
  }

  /**
   * Validate position data before risk calculation
   */
  private validatePosition(position: UserProtocolPosition): void {
    if (!position.userAddress) {
      throw new Error('User address is required');
    }
    if (!position.protocol) {
      throw new Error('Protocol is required');
    }
    if (!position.network) {
      throw new Error('Network is required');
    }
    if (!position.healthFactor) {
      throw new Error('Health factor is required');
    }
  }
}
