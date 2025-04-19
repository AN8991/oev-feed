/*
 * File: aave-position.dto.ts
 * Description: Data Transfer Object for Aave position data, used for transferring position information between application layers.
 * Layer: Application
 */

// Data Transfer Object for Aave position data
export interface AavePositionDTO {
  // User information
  userAddress: string;
  
  // Asset information
  assetAddress: string;
  assetSymbol: string;
  assetDecimals: number;
  
  // Position data
  aTokenBalance: string;
  stableDebt: string;
  variableDebt: string;
  principalStableDebt: string;
  scaledVariableDebt: string;
  
  // Calculated values
  collateralETH: string;
  debtETH: string;
  
  // Risk parameters
  healthFactor: string;
  liquidationThreshold: string;
  ltv: string;
  
  // Metadata
  protocol: string;
  network: string;
  version: string;
  lastUpdated: number;
}
