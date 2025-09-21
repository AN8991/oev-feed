/*
 * File: data-source.types.ts
 * Description: Type definitions for supported data source types used in the domain layer.
 * Layer: Domain
 */

export enum DataSourceType {
  ON_CHAIN = 'on_chain',
  SUBGRAPH = 'subgraph',
  API = 'api',
  CACHE = 'cache'
}
