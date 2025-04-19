/*
 * File: data-source-type.ts
 * Description: Type definitions for supported data source types used in the domain layer.
 * Layer: Domain
 */

/**
 * Enum representing different data source types
 */
export enum DataSourceType {
  /**
   * Data fetched directly from the blockchain using a provider
   */
  ON_CHAIN = 'on_chain',
  
  /**
   * Data fetched from a subgraph (e.g., The Graph)
   */
  SUBGRAPH = 'subgraph',
  
  /**
   * Data fetched from a REST API
   */
  API = 'api',
  
  /**
   * Data fetched from a local cache
   */
  CACHE = 'cache'
}
