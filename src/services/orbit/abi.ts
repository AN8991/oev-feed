export const ORBIT_LENDING_POOL_ABI = [
  "function getUserAccountData(address user) view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
  "function getUserConfiguration(address user) view returns (uint256)",
  "function getReservesList() view returns (address[])",
  "function getReserveData(address asset) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 variableBorrowIndex, uint128 currentLiquidityRate, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint8 id))"
] as const;

export const ORBIT_ORACLE_ABI = [
  "function getAssetPrice(address asset) view returns (uint256)",
  "function getAssetsPrices(address[] assets) view returns (uint256[])"
] as const;
