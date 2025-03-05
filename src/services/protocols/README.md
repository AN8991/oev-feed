# Protocol Services

This directory contains services for interacting with various DeFi protocols. Each protocol has its own subdirectory with protocol-specific implementations.

## Directory Structure

- `common/` - Common interfaces, base classes, and utilities for all protocols
  - `base-protocol.ts` - Base protocol service class with common functionality
  - `data-source-fallback.ts` - Service for handling fallback between data sources
  - `protocol-factory.ts` - Base factory for creating protocol services
  - `protocol-config.ts` - Configuration builders for protocol services
  - `index.ts` - Exports all common components
- `aave/` - Aave protocol implementation
  - `aave-service.ts` - Aave service implementation
  - `aave-factory.ts` - Factory for creating Aave services
  - `aave-config.ts` - Configuration for Aave services
  - `abi.ts` - Aave contract ABIs
  - `queries.ts` - GraphQL queries for Aave subgraph
  - `index.ts` - Exports all Aave components
- `sync.ts` - Service for synchronizing protocol positions

## Architecture

### Base Protocol Service

The `BaseProtocolService` class provides common functionality for all protocol services:

- Provider management and fallback
- Data source fallback (on-chain, subgraph, API)
- Resource cleanup and disposal
- Common error handling
- Position fetching and processing

### Protocol Factory Pattern

Each protocol should implement a factory following the `ProtocolServiceFactory` interface:

```typescript
export interface ProtocolServiceFactory<T extends BaseProtocolService, C extends ProtocolConfig> {
  createService(config: C): Promise<T>;
  getServiceForNetwork(network: Network): Promise<T>;
  disposeService(config: C): Promise<void>;
  disposeAll(): Promise<void>;
}
```

### Configuration Builder Pattern

Each protocol should implement a configuration builder extending the `BaseConfigBuilder` class:

```typescript
export class AaveConfigBuilder extends BaseConfigBuilder<AaveConfig> {
  withPoolAddress(address: string): this {
    this.config.poolAddress = address;
    return this;
  }
  
  // Additional protocol-specific configuration methods
}
```

## Adding a New Protocol

To add a new protocol, follow these steps:

1. Create a new directory for the protocol (e.g., `compound/`)
2. Implement the protocol-specific service extending `BaseProtocolService`
3. Create a configuration builder extending `BaseConfigBuilder`
4. Implement a factory extending `BaseProtocolServiceFactory`
5. Add contract ABIs and GraphQL queries if needed
6. Create an index.ts file to export all components

### Example Implementation

```typescript
// compound-service.ts
export class CompoundService extends BaseProtocolService {
  // Protocol-specific implementation
}

// compound-config.ts
export class CompoundConfigBuilder extends BaseConfigBuilder<CompoundConfig> {
  // Protocol-specific configuration
}

// compound-factory.ts
export class CompoundServiceFactory extends BaseProtocolServiceFactory<CompoundService, CompoundConfig> {
  // Protocol-specific factory implementation
}
```

## Protocol Position Synchronization Service

### Overview
The `ProtocolPositionSyncService` is responsible for synchronizing user positions across different lending protocols with our database.

### Key Features
- Supports multiple protocols: Silo, Aave, Lendle, Orbit, Ironclad
- Can sync positions for a specific user or all users
- Stores positions with timestamp for historical tracking

### Usage

#### Sync All Positions
```typescript
const syncService = new ProtocolPositionSyncService();
await syncService.syncAllProtocolPositions(Network.ETHEREUM);
```

#### Sync Positions for a Specific User
```typescript
const syncService = new ProtocolPositionSyncService();
await syncService.syncSiloPositions(Network.ETHEREUM, '0x1234...');
```

### Synchronization Process
1. Fetch user positions from on-chain contracts
2. Transform contract data to database model
3. Upsert positions in the `UserPosition` table
4. Handle errors gracefully with logging

### Limitations
- Placeholder methods for fetching all users need to be implemented
- Currently supports only Ethereum network
- Requires proper contract ABIs and addresses

### Recommended Setup
- Run as a scheduled job (e.g., daily or hourly)
- Can be triggered manually or via CLI
- Ensure proper error handling and monitoring

### Future Improvements
- Add support for more networks
- Implement more robust user discovery methods
- Add caching and rate limiting
