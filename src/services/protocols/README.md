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
- `template/` - Template for adding new protocol implementations
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
    // Always normalize addresses using ethers.getAddress()
    this.config.poolAddress = ethers.getAddress(address);
    return this;
  }
  
  // Additional protocol-specific configuration methods
}
```

## Adding a New Protocol

To add a new protocol, follow these steps:

1. Copy the `template/` directory and rename it for your protocol (e.g., `compound/`)
2. Implement the protocol-specific service extending `BaseProtocolService`
3. Create a configuration builder extending `BaseConfigBuilder`
4. Implement a factory extending `BaseProtocolServiceFactory`
5. Add contract ABIs and GraphQL queries if needed
6. Create an index.ts file to export all components
7. Create test scripts in the `scripts/` directory to validate your implementation

### Example Implementation

```typescript
// compound-service.ts
export class CompoundService extends BaseProtocolService {
  // Protocol-specific implementation
  
  // Ensure proper address validation
  private normalizeAddress(address: string): string {
    return ethers.getAddress(address);
  }
}

// compound-config.ts
export class CompoundConfigBuilder extends BaseConfigBuilder<CompoundConfig> {
  // Protocol-specific configuration
  
  // Always normalize addresses in configuration methods
  withComptrollerAddress(address: string): this {
    this.config.comptrollerAddress = ethers.getAddress(address);
    return this;
  }
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
- Supports multiple protocols with a focus on Aave V3
- Can sync positions for a specific user or all users
- Stores positions with timestamp for historical tracking
- Properly handles address validation and checksumming

### Usage

#### Sync All Positions
```typescript
const syncService = new ProtocolPositionSyncService();
await syncService.syncAllProtocolPositions(Network.ETHEREUM);
```

#### Sync Positions for a Specific User
```typescript
const syncService = new ProtocolPositionSyncService();
// Always normalize user addresses before passing to sync methods
const normalizedAddress = ethers.getAddress('0x1234...');
await syncService.syncAavePositions(Network.ETHEREUM, normalizedAddress);
```

### Synchronization Process
1. Fetch user positions from on-chain contracts
2. Transform contract data to database model
3. Upsert positions in the `UserPosition` table
4. Handle errors gracefully with logging

### Important Implementation Notes
- Always use `ethers.getAddress()` to normalize Ethereum addresses before using them in contract interactions
- For Aave V3, the `getUserAccountData` method returns data as an array (tuple) rather than an object with named properties when using ethers.js v6+
- Use official address book packages like `@bgd-labs/aave-address-book` for contract addresses when available
- Add comprehensive logging for debugging and error tracking

### Testing Protocol Implementations
- Create test scripts in the `scripts/` directory to validate your implementation
- Use the test scripts to verify on-chain data fetching and formatting
- Add test scripts to package.json for easy execution
- Save test results to JSON files for easier debugging and analysis

### Future Improvements
- Add support for more networks
- Implement more robust user discovery methods
- Add caching and rate limiting
- Enhance error handling and retry mechanisms
