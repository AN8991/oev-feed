/*
 * File: aave-position.mapper.ts
 * Description: Mapper for converting between domain and DTO representations of Aave positions.
 * Layer: Application
 */

// Mapper for transforming between Aave Position DTOs and domain models
import { Injectable, Logger } from '@nestjs/common';
import { PositionModel } from '../../domain/models/position.model';
import { RiskAssessmentModel, RiskCalculator, AssetPosition } from '../../domain/models/risk.model';
import { AavePositionDTO } from '../dto/aave-position.dto';
import { normalizeAddress } from '../../domain/utils/address-utils';
import { formatUnits } from 'ethers';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AavePositionMapper {
  private readonly logger = new Logger(AavePositionMapper.name);
  /**
   * Map from Aave-specific DTO to domain model
   * @param dto Aave position data transfer object
   * @returns Domain position model
   */
  public toDomain(dto: AavePositionDTO): PositionModel {
    try {
      // Generate simple UUID for position ID
      const id = uuidv4();

      // Use ethers formatUnits for proper token amount conversion
      const decimals = dto.assetDecimals ?? 18;

      // Convert collateral from Wei to human-readable units using ethers
      const collateralAmount = this.formatTokenAmount(dto.aTokenBalance ?? '0', decimals);

      // Calculate and convert debt amount from Wei to human-readable units
      const stableDebt = parseFloat(dto.stableDebt ?? '0');
      const variableDebt = parseFloat(dto.variableDebt ?? '0');
      const totalDebt = (stableDebt + variableDebt).toString();
      const debtAmount = this.formatTokenAmount(totalDebt, decimals);

      // Convert health factor from raw (with 18 decimals) to human-readable using ethers
      const healthFactor = this.formatHealthFactor(dto.healthFactor ?? '0');

      return {
      id,
      userAddress: normalizeAddress(dto.userAddress ?? ''),
      protocol: dto.protocol ?? 'aave-v3',
      network: dto.network ?? 'ethereum',
      assetAddress: dto.assetAddress ?? '',
      assetSymbol: dto.assetSymbol ?? '',
      collateralAmount: collateralAmount.replace(/\.$/, ''), 
      collateralAmountUSD: dto.collateralETH ?? '0',
      debtAmount: debtAmount.replace(/\.$/, ''),
      debtAmountUSD: dto.debtETH ?? '0',
      healthFactor: healthFactor.replace(/\.$/, ''),
      liquidationThreshold: dto.liquidationThreshold ?? '0',
      ltv: dto.ltv ?? '0',
      lastUpdated: dto.lastUpdated instanceof Date ? dto.lastUpdated : new Date(dto.lastUpdated ?? Date.now()),
    };
    } catch (error) {
      this.logger.error('Error mapping Aave position to domain model:', error);
      throw new Error(`Failed to map Aave position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map multiple DTOs to domain models
   * @param dtos Array of Aave position DTOs
   * @returns Array of domain position models
   */
  public toDomainList(dtos: AavePositionDTO[]): PositionModel[] {
    return dtos.map(dto => this.toDomain(dto));
  }

  /**
   * Create risk assessment from Aave position DTO
   * @param dto Aave position data transfer object
   * @returns Risk assessment model
   */
  public toRiskAssessment(dto: AavePositionDTO): RiskAssessmentModel {
    const positionId = `${normalizeAddress(dto.userAddress ?? '')}-${dto.protocol ?? 'aave-v3'}-${dto.network ?? 'ethereum'}`;
    
    // Convert supplied assets (collateral)
    const suppliedAssets: AssetPosition[] = [{
      symbol: dto.assetSymbol ?? '',
      address: dto.assetAddress ?? '',
      amount: dto.aTokenBalance ?? '0',
      valueUSD: dto.collateralETH ?? '0', // Using ETH value as USD placeholder
      valueETH: dto.collateralETH ?? '0'
    }];

    // Convert borrowed assets (debt)
    const borrowedAssets: AssetPosition[] = [];
    const totalDebt = (parseFloat(dto.stableDebt ?? '0') + parseFloat(dto.variableDebt ?? '0')).toString();
    
    if (parseFloat(totalDebt) > 0) {
      borrowedAssets.push({
        symbol: dto.assetSymbol ?? '',
        address: dto.assetAddress ?? '',
        amount: totalDebt,
        valueUSD: dto.debtETH ?? '0', // Using ETH value as USD placeholder
        valueETH: dto.debtETH ?? '0'
      });
    }

    return RiskCalculator.createRiskAssessment(
      normalizeAddress(dto.userAddress ?? ''),
      dto.protocol ?? 'aave-v3',
      dto.network ?? 'ethereum',
      positionId,
      suppliedAssets,
      borrowedAssets,
      dto.healthFactor ?? '0',
      dto.liquidationThreshold ?? '0',
      dto.ltv ?? '0',
      dto.collateralETH ?? '0', // Total collateral USD
      dto.debtETH ?? '0' // Total debt USD
    );
  }

  /**
   * Create risk assessments from multiple Aave position DTOs
   * @param dtos Array of Aave position DTOs
   * @returns Array of risk assessment models
   */
  public toRiskAssessmentList(dtos: AavePositionDTO[]): RiskAssessmentModel[] {
    return dtos.map(dto => this.toRiskAssessment(dto));
  }

  /**
   * Format token amount using ethers formatUnits
   * @param amount Token amount in wei
   * @param decimals Token decimals
   * @returns Formatted token amount
   */
  private formatTokenAmount(amount: string, decimals: number): string {
    try {
      if (!amount || amount === '0') return '0';
      const formatted = formatUnits(amount, decimals);
      // Remove trailing zeros and decimal point if not needed
      return parseFloat(formatted).toString();
    } catch (error) {
      this.logger.warn(`Error formatting token amount ${amount}:`, error);
      return '0';
    }
  }

  /**
   * Format health factor using ethers formatUnits
   * @param healthFactor Health factor in wei (18 decimals)
   * @returns Formatted health factor
   */
  private formatHealthFactor(healthFactor: string): string {
    try {
      if (!healthFactor || healthFactor === '0') return '0';
      const formatted = formatUnits(healthFactor, 18);
      const numericValue = parseFloat(formatted);
      
      // Cap at reasonable display value
      if (numericValue > 100) {
        return '100.0000';
      }
      
      return numericValue.toFixed(6);
    } catch (error) {
      this.logger.warn(`Error formatting health factor ${healthFactor}:`, error);
      return '0';
    }
  }
}
