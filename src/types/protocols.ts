import { Network } from './networks';

// Enumeration of supported blockchain protocols
export enum Protocol {
  AAVE = 'AAVE',
}

// Base interface for a borrowed asset
export interface BorrowedAsset {
  // Identification
  name: string;        // Full name of the asset
  symbol: string;      // Ticker symbol
  address: string;     // Contract address
  decimals: number;    // Decimal places for precise calculations
  
  // Borrowed amount details
  borrowAmount: string;    // Amount borrowed
  borrowValueUSD?: string; // Optional USD valuation
  
  // Interest rate information
  borrowAPR?: string;  // Annual Percentage Rate
  borrowAPY?: string;  // Annual Percentage Yield
}

// Comprehensive user position interface
export interface UserProtocolPosition {
  // Core identification
  protocol: Protocol;      // Which protocol (e.g., Aave)
  network: Network;        // Blockchain network
  version?: string;        // Optional to maintain backward compatibility
  userAddress: string;     // Wallet address
  
  // Collateral and debt information
  collateral: string | null;  // Collateral amount
  debt: string | null;        // Total debt
  
  // Health and risk metrics
  healthFactor: string;   // Position's health score
  liquidationRisk?: {
    threshold: string;     // Liquidation threshold
    currentLTV: string;    // Loan-to-Value ratio
  };
  
  // Borrowed assets
  borrowedAssets: {
    symbol: string;
    amount: string;
    valueETH: string;
  }[];
  
  // Timestamp information
  timestamp: number;       // When position was captured
  
  // Optional metadata for historical or aggregated data
  periodStart?: number;    // Start of tracking period
  periodEnd?: number;      // End of tracking period
  
  // Optional details for additional context
  details?: any;
}

// Alias for backwards compatibility
export type UserPosition = UserProtocolPosition;

// Flexible query parameters to support both on-chain and subgraph querying
export interface ProtocolQueryParams {
  // User-specific filtering
  userAddress?: string;                    // Filter by specific user
  protocol?: Protocol;                     // Add protocol to query params
  network?: Network;                       // Add network to query params
  
  // Time-based filtering
  fromTimestamp?: number;                  // Start of time range
  toTimestamp?: number;                    // End of time range
  
  // Optional protocol-specific filters
  protocolSpecificFilters?: Record<string, any>;  // Additional custom filters
}

// Flexible query parameters for transaction history
export interface TransactionQueryParams {
  userAddress: string;
  protocol: string;
  network: Network;
  fromTimestamp: number;
  toTimestamp: number;
}

// Enum to distinguish data source
export enum DataSourceType {
  ON_CHAIN = 'ON_CHAIN',    // Direct blockchain query
  SUBGRAPH = 'SUBGRAPH',    // Using The Graph protocol
}

// Interface for protocol data fetching service
export interface ProtocolDataService {
  // Fetch user positions with flexible querying
  fetchUserPositions(params: ProtocolQueryParams): Promise<UserProtocolPosition[]>;
  
  // Determine the primary data source for this protocol
  getDataSourceType(): DataSourceType;
}

// Utility function to get supported networks for a protocol
export function getSupportedNetworksForProtocol(protocol: Protocol): Network[] {
  // Currently all protocols are on Ethereum Mainnet
  return [Network.ETHEREUM];
}

// Utility function to check if a protocol supports a specific network
export function isProtocolSupportedOnNetwork(protocol: Protocol, network: Network): boolean {
  return getSupportedNetworksForProtocol(protocol).includes(network);
}
