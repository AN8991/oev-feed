import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PositionEntity } from '../../adapters/secondary/database/typeorm/entities/position.entity';
import { RiskAssessmentModel, RiskCalculator, RiskLevel, AssetPosition } from '../models/risk.model';

@Injectable()
export class RiskAnalysisService {
  constructor(
    @InjectRepository(PositionEntity)
    private readonly positionRepo: Repository<PositionEntity>,
  ) {}

  /**
   * Get comprehensive risk assessment for a user address
   */
  async getUserRiskAssessment(
    userAddress: string,
    protocol?: string,
    network?: string
  ): Promise<RiskAssessmentModel[]> {
    const positions = await this.getUserPositions(userAddress, protocol, network);
    
    if (positions.length === 0) {
      throw new Error(`No positions found for address: ${userAddress}`);
    }

    return positions.map(position => this.calculateRiskAssessment(position));
  }

  /**
   * Get risk assessment for a specific position
   */
  async getPositionRiskAssessment(positionId: string): Promise<RiskAssessmentModel> {
    const position = await this.positionRepo.findOneBy({ id: positionId });
    
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }

    return this.calculateRiskAssessment(position);
  }

  /**
   * Get all positions at specified risk level
   */
  async getPositionsAtRisk(
    riskLevel: RiskLevel,
    protocol?: string,
    network?: string
  ): Promise<RiskAssessmentModel[]> {
    const queryBuilder = this.positionRepo.createQueryBuilder('position');
    
    if (protocol) {
      queryBuilder.andWhere('position.protocol = :protocol', { protocol });
    }
    
    if (network) {
      queryBuilder.andWhere('position.network = :network', { network });
    }

    const positions = await queryBuilder.getMany();
    const riskAssessments = positions.map(position => this.calculateRiskAssessment(position));
    
    return riskAssessments.filter(assessment => assessment.riskLevel === riskLevel);
  }

  /**
   * Get risk summary statistics
   */
  async getRiskSummary(
    protocol?: string,
    network?: string
  ): Promise<{
    totalPositions: number;
    riskDistribution: Record<RiskLevel, number>;
    averageHealthFactor: number;
    totalValueAtRisk: string;
    criticalAlerts: number;
  }> {
    const queryBuilder = this.positionRepo.createQueryBuilder('position');
    
    if (protocol) {
      queryBuilder.andWhere('position.protocol = :protocol', { protocol });
    }
    
    if (network) {
      queryBuilder.andWhere('position.network = :network', { network });
    }

    const positions = await queryBuilder.getMany();
    const riskAssessments = positions.map(position => this.calculateRiskAssessment(position));
    
    const riskDistribution: Record<RiskLevel, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };
    
    let totalHealthFactor = 0;
    let totalValueAtRisk = 0;
    let criticalAlerts = 0;
    
    riskAssessments.forEach(assessment => {
      riskDistribution[assessment.riskLevel]++;
      totalHealthFactor += parseFloat(assessment.healthFactor);
      
      if (assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'CRITICAL') {
        totalValueAtRisk += parseFloat(assessment.totalCollateralUSD);
      }
      
      criticalAlerts += assessment.riskAlerts.filter(alert => alert.severity === 'CRITICAL').length;
    });
    
    return {
      totalPositions: positions.length,
      riskDistribution,
      averageHealthFactor: positions.length > 0 ? totalHealthFactor / positions.length : 0,
      totalValueAtRisk: totalValueAtRisk.toFixed(2),
      criticalAlerts
    };
  }

  /**
   * Refresh risk assessment for a user (force recalculation)
   */
  async refreshUserRiskAssessment(
    userAddress: string,
    protocol?: string,
    network?: string
  ): Promise<RiskAssessmentModel[]> {
    // In a real implementation, this would trigger fresh data fetching from protocols
    // For now, we'll just recalculate with existing data
    return this.getUserRiskAssessment(userAddress, protocol, network);
  }

  /**
   * Get risk alerts for a user
   */
  async getUserRiskAlerts(
    userAddress: string,
    severity?: 'INFO' | 'WARNING' | 'CRITICAL'
  ) {
    const riskAssessments = await this.getUserRiskAssessment(userAddress);
    
    const allAlerts = riskAssessments.flatMap(assessment => 
      assessment.riskAlerts.map(alert => ({
        ...alert,
        positionId: assessment.positionId,
        protocol: assessment.protocol,
        userAddress: assessment.userAddress
      }))
    );
    
    if (severity) {
      return allAlerts.filter(alert => alert.severity === severity);
    }
    
    return allAlerts;
  }

  /**
   * Get user positions with optional filters
   */
  private async getUserPositions(
    userAddress: string,
    protocol?: string,
    network?: string
  ): Promise<PositionEntity[]> {
    const queryBuilder = this.positionRepo.createQueryBuilder('position')
      .where('position.userAddress = :userAddress', { userAddress });
    
    if (protocol) {
      queryBuilder.andWhere('position.protocol = :protocol', { protocol });
    }
    
    if (network) {
      queryBuilder.andWhere('position.network = :network', { network });
    }

    return queryBuilder.getMany();
  }

  /**
   * Calculate risk assessment from position data
   */
  private calculateRiskAssessment(position: PositionEntity): RiskAssessmentModel {
    // Convert position data to AssetPosition format based on current PositionEntity structure
    const suppliedAssets: AssetPosition[] = [{
      symbol: position.assetSymbol,
      address: position.assetAddress,
      amount: position.collateralAmount,
      valueUSD: position.collateralAmountUSD,
      valueETH: '0' // Not available in current structure
    }];
    
    const borrowedAssets: AssetPosition[] = position.debtAmount !== '0' ? [{
      symbol: position.assetSymbol,
      address: position.assetAddress,
      amount: position.debtAmount,
      valueUSD: position.debtAmountUSD,
      valueETH: '0' // Not available in current structure
    }] : [];

    return RiskCalculator.createRiskAssessment(
      position.userAddress,
      position.protocol,
      position.network,
      position.id,
      suppliedAssets,
      borrowedAssets,
      position.healthFactor,
      position.liquidationThreshold,
      position.ltv,
      position.collateralAmountUSD,
      position.debtAmountUSD
    );
  }
}
