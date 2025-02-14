# Protocol Services

This directory contains services for interacting with various DeFi protocols. Each protocol has its own subdirectory with protocol-specific implementations.

## Structure

- `base.ts` - Base protocol service class with common functionality
- `sync.ts` - Service for synchronizing protocol positions
- `aave/` - Aave protocol implementation
  - `index.ts` - Main Aave service implementation
  - `abi.ts` - Aave contract ABIs
  - `queries.ts` - GraphQL queries for Aave subgraph

# Protocol Position Synchronization Service

## Overview
The `ProtocolPositionSyncService` is responsible for synchronizing user positions across different lending protocols with our database.

## Key Features
- Supports multiple protocols: Silo, Aave, Lendle, Orbit, Ironclad
- Can sync positions for a specific user or all users
- Stores positions with timestamp for historical tracking

## Usage

### Sync All Positions
```typescript
const syncService = new ProtocolPositionSyncService();
await syncService.syncAllProtocolPositions(Network.ETHEREUM);
```

### Sync Positions for a Specific User
```typescript
const syncService = new ProtocolPositionSyncService();
await syncService.syncSiloPositions(Network.ETHEREUM, '0x1234...');
```

## Synchronization Process
1. Fetch user positions from on-chain contracts
2. Transform contract data to database model
3. Upsert positions in the `UserPosition` table
4. Handle errors gracefully with logging

## Limitations
- Placeholder methods for fetching all users need to be implemented
- Currently supports only Ethereum network
- Requires proper contract ABIs and addresses

## Recommended Setup
- Run as a scheduled job (e.g., daily or hourly)
- Can be triggered manually or via CLI
- Ensure proper error handling and monitoring

## Future Improvements
- Add support for more networks
- Implement more robust user discovery methods
- Add caching and rate limiting
