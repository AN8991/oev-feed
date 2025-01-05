export const LENDLE_CONTROLLER_ABI = [
  "function getAccountLiquidity(address account) view returns (uint256 error, uint256 liquidity, uint256 shortfall)",
  "function markets(address asset) view returns (bool isListed, uint256 collateralFactorMantissa)",
  "function oracle() view returns (address)"
] as const;

export const LENDLE_MARKET_ABI = [
  "function borrowBalanceStored(address account) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function exchangeRateStored() view returns (uint256)",
  "function getAccountSnapshot(address account) view returns (uint256 error, uint256 tokenBalance, uint256 borrowBalance, uint256 exchangeRate)"
] as const;
