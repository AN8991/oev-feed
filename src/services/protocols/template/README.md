# Protocol Integration Template

This directory contains template files for integrating a new protocol into the system. Follow these steps to create a new protocol integration:

## Steps to Integrate a New Protocol

1. **Copy the Template Directory**
   
   Copy this entire directory and rename it to your protocol name (e.g., `compound`).

2. **Update Protocol Enum**

   Add your protocol to the Protocol enum in `src/types/protocols.ts`:

   ```typescript
   export enum Protocol {
     AAVE = 'AAVE',
     COMPOUND = 'COMPOUND', // Add your protocol here
     // ...
   }
   ```

3. **Rename Files and Classes**

   Rename all occurrences of "Protocol" in filenames and class names to your protocol name.

4. **Implement Protocol-Specific Logic**

   - Update the ABI in `abi.ts` with your protocol's contract ABI
   - Update the GraphQL queries in `queries.ts` for your protocol's subgraph
   - Implement the protocol-specific methods in your service class

5. **Configure Contract Addresses**

   Add your protocol's contract addresses to `src/config/contracts.ts`:

   ```typescript
   export const CONTRACT_ADDRESSES = {
     // ...
     COMPOUND: {
       ETHEREUM: {
         COMPTROLLER: '0x...',
         PRICE_ORACLE: '0x...',
         // ...
       },
       // Add other networks as needed
     }
   };
   ```

6. **Update Factory Implementation**

   Implement the `createConfigForNetwork` method in your factory class with the correct contract addresses and configuration for each supported network.

7. **Export from Main Index**

   Add your protocol to the main protocols index file:

   ```typescript
   // src/services/protocols/index.ts
   export * from './compound'; // Add your protocol here
   ```

8. **Update Sync Service**

   Add your protocol to the `ProtocolPositionSyncService` in `src/services/protocols/sync.ts`:

   ```typescript
   async syncAllProtocolPositions(network: Network): Promise<void> {
     await Promise.all([
       this.syncAavePositions(network),
       this.syncCompoundPositions(network), // Add your protocol here
       // ...
     ]);
   }
   
   // Implement sync method for your protocol
   async syncCompoundPositions(network: Network, fromAddress?: string): Promise<void> {
     // Implementation
   }
   ```

## Testing Your Integration

1. **Unit Tests**

   Create unit tests for your protocol service in `test/services/protocols/your-protocol`.

2. **Integration Tests**

   Create integration tests that verify your protocol service can fetch real data from the blockchain.

3. **Manual Testing**

   Test your integration manually by running the sync service and verifying that positions are correctly fetched and stored.

## Best Practices

- Follow the established patterns for error handling, logging, and resource management
- Use the builder pattern for configuration
- Implement proper fallback mechanisms for data sources
- Add comprehensive logging for debugging
- Handle network-specific differences in your factory implementation
