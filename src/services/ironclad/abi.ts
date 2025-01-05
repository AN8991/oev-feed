export const IRONCLAD_VAULT_ABI = [
  "function getUserAccountData(address user) view returns (uint256 totalCollateral, uint256 totalDebt, uint256 healthFactor)",
  "function getUserPositions(address user) view returns (tuple(address asset, uint256 amount, uint256 debt)[])",
  "function getAssetPrice(address asset) view returns (uint256)"
] as const;

export const IRONCLAD_STRATEGY_ABI = [
  "function getPositionHealth(address user, address asset) view returns (uint256)",
  "function getCollateralFactor(address asset) view returns (uint256)"
] as const;
