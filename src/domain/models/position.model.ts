/*
 * File: position.model.ts
 * Description: Domain model representing a user position in a protocol (e.g., Aave, Compound).
 * Layer: Domain
 */

export interface PositionModel {
  //Unique identifier for the position
  id: string;
  
  //User address associated with this position
  userAddress: string;
  
  //Protocol identifier (e.g., "aave-v2", "aave-v3", "silo")
  protocol: string;
  
  //Network identifier (e.g., "ethereum", "optimism", "arbitrum", "base")
  network: string;
  
  //Asset address
  assetAddress: string;
  
  //Asset symbol (e.g., "ETH", "USDC")
  assetSymbol: string;
  
  //Collateral amount in native token units
  collateralAmount: string;
  
  //Collateral amount in USD value
  collateralAmountUSD: string;
  
  //Debt amount in native token units
  debtAmount: string;
  
  //Debt amount in USD value
  debtAmountUSD: string;
  
  //Health factor as a string
  healthFactor: string;
  
  //Liquidation threshold as a percentage
  liquidationThreshold: string;
  
  //Loan to value ratio as a percentage
  ltv: string;
  
  //Timestamp of when the position was last updated
  lastUpdated: Date;
}
