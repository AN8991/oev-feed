export const SILO_LENS_ABI = [
  "function getUserHealthFactor(address user) external view returns (uint256)",
  "function getUserDebt(address user) external view returns (uint256)",
  "function getUserCollateral(address user) external view returns (uint256)",
  "function getPositionData(address user) external view returns (tuple(uint256 collateral, uint256 debt, uint256 healthFactor))",
  "function getUserAssets(address user) external view returns (address[])",
  "function getAssetsWithPositions(address user) external view returns (address[])",
  "function getAssetPrice(address asset) external view returns (uint256)",
  "function getAssetData(address asset) external view returns (tuple(uint256 totalDeposits, uint256 totalBorrows, uint256 depositApy, uint256 borrowApy, uint256 liquidity, uint256 liquidationThreshold))"
] as const;

export const SILO_REPOSITORY_ABI = [
  "function getAssetsLength() external view returns (uint256)",
  "function getAssets() external view returns (address[])",
  "function getAssetConfig(address asset) external view returns (tuple(bool active, uint256 collateralFactor, uint256 borrowFactor, uint256 maxDeposit, uint256 maxBorrow))"
] as const;
