/*
 * File: provider-type.enum.ts
 * Description: Enum representing supported provider types (e.g., Alchemy, Infura, Ankr, etc.).
 * Layer: Domain
 */

/**
 * Provider type enum
 */
export enum ProviderType {
  /**
   * Alchemy provider
   */
  ALCHEMY = 'alchemy',
  
  /**
   * Infura provider
   */
  INFURA = 'infura',
  
  /**
   * Etherscan provider
   */
  ETHERSCAN = 'etherscan',
  
  /**
   * Ankr provider
   */
  ANKR = 'ankr',
  
  /**
   * Pocket provider
   */
  POCKET = 'pocket',
  
  /**
   * Custom provider
   */
  CUSTOM = 'custom',
  
  /**
   * Local provider
   */
  LOCAL = 'local'
}
