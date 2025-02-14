import { Protocol, DataSourceType } from '../types/protocols';
import { Network } from '../types/networks';

// Define the structure for a data source configuration
export interface DataSourceConfig {
  type: DataSourceType;
  priority: number;  // Lower number means higher priority
  enabled: boolean;
}

// Define the fallback strategy for each protocol
export interface ProtocolDataSourceStrategy {
  protocol: Protocol;
  network: Network;
  sources: DataSourceConfig[];
}

// Centralized configuration for data source fallback
export const DATA_SOURCE_STRATEGIES: ProtocolDataSourceStrategy[] = [
  {
    protocol: Protocol.AAVE,
    network: Network.ETHEREUM,
    sources: [
      {
        type: DataSourceType.ON_CHAIN,
        priority: 1,
        enabled: true
      },
      {
        type: DataSourceType.SUBGRAPH,
        priority: 2,
        enabled: false  // Not implemented yet
      }
    ]
  }
  // Add more protocol strategies here as they are developed
];

// Utility function to get data source strategy for a specific protocol and network
export function getDataSourceStrategy(
  protocol: Protocol, 
  network: Network
): ProtocolDataSourceStrategy | undefined {
  return DATA_SOURCE_STRATEGIES.find(
    strategy => 
      strategy.protocol === protocol && 
      strategy.network === network
  );
}

// Utility function to get ordered list of enabled data sources
export function getEnabledDataSources(
  protocol: Protocol, 
  network: Network
): DataSourceType[] {
  const strategy = getDataSourceStrategy(protocol, network);
  
  if (!strategy) {
    throw new Error(`No data source strategy found for ${protocol} on ${network}`);
  }

  return strategy.sources
    .filter(source => source.enabled)
    .sort((a, b) => a.priority - b.priority)
    .map(source => source.type);
}
