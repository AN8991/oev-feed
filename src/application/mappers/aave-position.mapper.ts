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

    // Convert Wei amounts to human-readable token units using simple division
    const decimals = dto.assetDecimals ?? 18;
    const divisor = Math.pow(10, decimals);

    // Convert collateral from Wei to human-readable units (e.g., ETH)
    const collateralAmountWei = parseFloat(dto.aTokenBalance ?? '0');
    const collateralAmount = (collateralAmountWei / divisor).toFixed(8).replace(/\.?0+$/, '');

    // Calculate and convert debt amount from Wei to human-readable units
    const stableDebtWei = parseFloat(dto.stableDebt ?? '0');
    const variableDebtWei = parseFloat(dto.variableDebt ?? '0');
    const debtAmountWei = stableDebtWei + variableDebtWei;
    const debtAmount = (debtAmountWei / divisor).toFixed(8).replace(/\.?0+$/, '');

    // Convert health factor from raw (with 18 decimals) to human-readable
    const healthFactorWei = parseFloat(dto.healthFactor ?? '0');
    const healthFactor = healthFactorWei > 0 ?
      (healthFactorWei / Math.pow(10, 18)).toFixed(6).replace(/\.?0+$/, '')
      : '0';

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
