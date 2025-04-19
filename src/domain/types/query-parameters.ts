import { PositionFilterCriteria } from '@domain/types/position-filter.type';

/**
 * Enum for predefined time ranges
 */
export enum TimeRange {
  CURRENT_MONTH = 'CURRENT_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  LAST_3_MONTHS = 'LAST_3_MONTHS',
  LAST_6_MONTHS = 'LAST_6_MONTHS',
  LAST_YEAR = 'LAST_YEAR',
  CUSTOM = 'CUSTOM'
}

/**
 * Extended query parameters with time-based filtering
 */
export interface ProtocolQueryParameters {
  /**
   * List of user addresses to query. 
   * If empty, throws an error.
   */
  userAddresses?: string[];

  /**
   * Optional filter criteria to apply to positions
   */
  filterCriteria?: PositionFilterCriteria;

  /**
   * Optional list of protocols to query
   * Defaults to all supported protocols if not specified
   */
  protocols?: string[];

  /**
   * Optional list of networks to query
   * Defaults to all supported networks if not specified
   */
  networks?: string[];

  /**
   * Time range for querying positions
   */
  timeRange?: TimeRange;

  /**
   * Custom start timestamp for querying positions
   * Required if timeRange is CUSTOM
   */
  fromTimestamp?: number;

  /**
   * Custom end timestamp for querying positions
   * Required if timeRange is CUSTOM
   */
  toTimestamp?: number;
}

/**
 * Defines the structure for filtering positions
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
