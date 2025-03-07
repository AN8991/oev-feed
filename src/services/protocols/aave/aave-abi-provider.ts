import { AaveVersion } from './aave-config';
import { log } from '../../../utils/logger';

// Define ABIs directly instead of importing from @aave/core-v3
// These are simplified versions of the actual ABIs

// Pool ABI with essential methods
export const AAVE_V3_POOL_ABI = [
  // getUserAccountData returns all user data in a single call
  "function getUserAccountData(address user) view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
  "function getUserConfiguration(address user) view returns (uint256)",
  "function getReservesList() view returns (address[])",
  "function getReserveData(address asset) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint8 id) data)"
];

// Oracle ABI with essential methods
export const AAVE_V3_ORACLE_ABI = [
  "function getAssetPrice(address asset) view returns (uint256)",
  "function getAssetsPrices(address[] calldata assets) view returns (uint256[] memory)"
];

// Pool Addresses Provider ABI with essential methods
export const AAVE_V3_POOL_DATA_PROVIDER_ABI = [
  "function getUserReserveData(address asset, address user) view returns (tuple(uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled))",
  "function getReserveData(address asset) view returns (tuple(uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp))",
  "function getReserveConfigurationData(address asset) view returns (tuple(uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen))"
];

// Aave V2 ABIs
export const AAVE_V2_LENDING_POOL_ABI = [
  "function getUserAccountData(address user) view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
  "function getUserConfiguration(address user) view returns (uint256)"
];

export const AAVE_V2_DATA_PROVIDER_ABI = [
  "function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)",
  "function getReserveData(address asset) view returns (uint256 availableLiquidity, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)",
  "function getReserveConfigurationData(address asset) view returns (uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen)"
];

// For backward compatibility
export const AAVE_POOL_ABI = AAVE_V3_POOL_ABI;

// Simplified ABIs for internal use
const POOL_ABI = [
  // getUserAccountData returns all user data in a single call
  "function getUserAccountData(address user) view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)"
];

const ORACLE_ABI = [
  "function getAssetPrice(address asset) view returns (uint256)",
  "function getAssetsPrices(address[] calldata assets) view returns (uint256[] memory)"
];

const POOL_ADDRESSES_PROVIDER_ABI = [
  "function getPool() view returns (address)",
  "function getPriceOracle() view returns (address)",
  "function getPoolDataProvider() view returns (address)"
];

/**
 * Provider for Aave contract ABIs
 * Uses hardcoded ABIs for essential methods
 */
export class AaveAbiProvider {
  /**
   * Get Pool ABI for the specified version
   * @param version The Aave protocol version
   * @returns The ABI for the Pool contract
   */
  static getPoolAbi(version: AaveVersion) {
    log.debug('Getting Pool ABI', { version });
    return version === AaveVersion.V3 ? AAVE_V3_POOL_ABI : AAVE_V2_LENDING_POOL_ABI;
  }
  
  /**
   * Get Data Provider ABI for the specified version
   * @param version The Aave protocol version
   * @returns The ABI for the Data Provider contract
   */
  static getDataProviderAbi(version: AaveVersion) {
    log.debug('Getting Data Provider ABI', { version });
    return version === AaveVersion.V3 ? AAVE_V3_POOL_DATA_PROVIDER_ABI : AAVE_V2_DATA_PROVIDER_ABI;
  }
  
  /**
   * Get Oracle ABI for the specified version
   * @param version The Aave protocol version
   * @returns The ABI for the Oracle contract
   */
  static getOracleAbi(version: AaveVersion) {
    log.debug('Getting Oracle ABI', { version });
    return AAVE_V3_ORACLE_ABI;
  }
  
  /**
   * Get Pool Addresses Provider ABI
   * @returns The ABI for the Pool Addresses Provider contract
   */
  static getPoolAddressesProviderAbi() {
    return POOL_ADDRESSES_PROVIDER_ABI;
  }
}
