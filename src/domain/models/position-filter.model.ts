/*
 * File: position-filter.model.ts
 * Description: Model representing filter criteria for position queries.
 * Layer: Domain
 */

export interface PositionFilterCriteria {
  /**
   * Minimum health factor threshold
   * Only return positions with health factor >= this value
   */
  minHealthFactor?: number;

  /**
   * Maximum health factor threshold
   * Only return positions with health factor <= this value
   */
  maxHealthFactor?: number;

  /**
   * Minimum collateral amount in ETH
   */
  minCollateralAmountETH?: number;

  /**
   * Maximum collateral amount in ETH
   */
  maxCollateralAmountETH?: number;

  /**
   * Minimum debt amount in ETH
   */
  minDebtAmountETH?: number;

  /**
   * Maximum debt amount in ETH
   */
  maxDebtAmountETH?: number;

  /**
   * Specific protocols to include
   */
  includedProtocols?: string[];

  /**
   * Specific networks to include
   */
  includedNetworks?: string[];
}
