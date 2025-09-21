/*
 * File: networks.ts
 * Description: Core network types and enums for the domain layer.
 * Layer: Domain
 */

/**
 * Enumeration of supported blockchain networks
 */
export enum Network {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  BLAST = 'blast'
}

/**
 * Basic network information (domain concept)
 * This contains only the essential network properties that are business-relevant
 */
export interface NetworkInfo {
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  explorerUrl: string;
}

/**
 * Network constants for business logic
 */
export const NETWORK_INFO: Record<Network, NetworkInfo> = {
  [Network.ETHEREUM]: {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    explorerUrl: 'https://etherscan.io'
  },
  [Network.POLYGON]: {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
    explorerUrl: 'https://polygonscan.com'
  },
  [Network.ARBITRUM]: {
    chainId: 42161,
    name: 'Arbitrum One',
    symbol: 'ETH',
    decimals: 18,
    explorerUrl: 'https://arbiscan.io'
  },
  [Network.OPTIMISM]: {
    chainId: 10,
    name: 'Optimism',
    symbol: 'ETH',
    decimals: 18,
    explorerUrl: 'https://optimistic.etherscan.io'
  },
  [Network.BLAST]: {
    chainId: 81457,
    name: 'Blast',
    symbol: 'ETH',
    decimals: 18,
    explorerUrl: 'https://blastscan.io'
  }
};
