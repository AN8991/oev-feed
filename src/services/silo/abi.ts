export const SILO_ABI = [
  "function getUserHealthFactor(address user) external view returns (uint256)",
  "function getUserDebt(address user) external view returns (uint256)",
  "function getUserCollateral(address user) external view returns (uint256)",
  "function getPositionData(address user) external view returns (tuple(uint256 collateral, uint256 debt, uint256 healthFactor))",
] as const;
