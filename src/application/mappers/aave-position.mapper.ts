/*
 * File: aave-position.mapper.ts
 * Description: Mapper for converting between domain and DTO representations of Aave positions.
 * Layer: Application
 */

// Mapper for transforming between Aave Position DTOs and domain models
import { PositionModel } from '@domain/models/position.model';
import { AavePositionDTO } from '../dto/aave-position.dto';
import { normalizeAddress } from '@domain/utils/address-utils';

export class AavePositionMapper {
  /**
   * Map from Aave-specific DTO to domain model
   * @param dto Aave position data transfer object
   * @returns Domain position model
   */
  public static toDomain(dto: AavePositionDTO): PositionModel {
    // Use assetAddress if present, otherwise fallback to assetSymbol
    const assetKey = dto.assetAddress?.toLowerCase?.() || dto.assetSymbol?.toLowerCase?.() || 'unknown';
    const id = `${normalizeAddress(dto.userAddress ?? '')}-${assetKey}-${dto.protocol ?? 'aave-v3'}-${dto.network ?? 'ethereum'}`;

    // Calculate debtAmount as sum of stableDebt and variableDebt
    const debtAmount = (BigInt(dto.stableDebt ?? '0') + BigInt(dto.variableDebt ?? '0')).toString();

    return {
      id,
      userAddress: normalizeAddress(dto.userAddress ?? ''),
      protocol: dto.protocol ?? 'aave-v3',
      network: dto.network ?? 'ethereum',
      assetAddress: dto.assetAddress ?? '',
      assetSymbol: dto.assetSymbol ?? '',
      collateralAmount: dto.aTokenBalance ?? '0',
      collateralAmountETH: dto.collateralETH ?? '0',
      debtAmount,
      debtAmountETH: dto.debtETH ?? '0',
      healthFactor: dto.healthFactor ?? '0',
      liquidationThreshold: dto.liquidationThreshold ?? '0',
      ltv: dto.ltv ?? '0',
      lastUpdated: String(dto.lastUpdated ?? Date.now()),
    };
  }
  
  /**
   * Map multiple DTOs to domain models
   * @param dtos Array of Aave position DTOs
   * @returns Array of domain position models
   */
  public static toDomainList(dtos: AavePositionDTO[]): PositionModel[] {
    return dtos.map(dto => this.toDomain(dto));
  }
}
