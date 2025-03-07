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
   - Ensure proper address validation using `ethers.getAddress()` for all Ethereum addresses

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

   Consider using an official address book package if available (like `@bgd-labs/aave-address-book` for Aave).

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

1. **Create Test Scripts**

   Create test scripts in the `scripts/` directory to test your protocol integration:

   ```typescript
   // scripts/test-compound-fetch.ts
   import dotenv from 'dotenv';
   dotenv.config();
   
   // Import your protocol service and other dependencies
   import { CompoundService } from '../src/services/protocols/compound';
   
   // Create a test class similar to AaveServiceTester
   class CompoundServiceTester {
     // Implement test methods
   }
   
   // Run the tests
   async function main() {
     const tester = new CompoundServiceTester();
     await tester.run();
   }
   
   main();
   ```

2. **Add Test Script to package.json**

   Add your test script to the package.json file:

   ```json
   "scripts": {
     // ...
     "test:compound": "ts-node scripts/test-compound-fetch.ts",
     "test:all": "npm run test:aave && npm run test:compound && npm run test:address-validation && npm run test:data-format"
   }
   ```

3. **Manual Testing**

   Test your integration manually by running your test script:

   ```bash
   npm run test:compound
   ```

## Best Practices

- Follow the established patterns for error handling, logging, and resource management
- Use the builder pattern for configuration
- Implement proper fallback mechanisms for data sources
- Add comprehensive logging for debugging
- Handle network-specific differences in your factory implementation
- Always normalize Ethereum addresses using `ethers.getAddress()` before using them in contract interactions
- Add clear, single-line comments throughout your code to explain the purpose of each section
- Process contract response data carefully, especially when using ethers.js v6+ which may return tuples instead of named objects
- Save test results to JSON files for easier debugging and analysis
