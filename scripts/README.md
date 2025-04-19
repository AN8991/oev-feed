# Testing Scripts

This directory contains scripts for testing and validating the OEV Feed application, particularly focused on the Aave integration.

## Testing Approach

We've moved away from traditional unit testing to a more integration-focused approach using script-based tests. This approach provides several advantages:

1. **Real-world Testing**: Scripts interact with actual contracts on the Ethereum mainnet, providing more realistic validation
2. **Address Validation**: Proper testing of address checksumming as required by ethers.js v6+
3. **Data Format Validation**: Ensures position data is properly formatted with correct decimal places and units
4. **Easy to Run**: Simple npm scripts to run individual tests or all tests at once

## Available Scripts

### 1. Aave Position Fetching (`test-aave-fetch.ts`)
npx ts-node -r tsconfig-paths/register scripts/test-aave-fetch.ts

Fetches Aave positions from Ethereum mainnet using official Aave contracts. Formats, normalizes, and saves user positions.

### 2. Aave V3 Adapter Integration (`test-aave-v2-adapter.ts` or `test-aave-v3-adapter.ts`)
npx ts-node -r tsconfig-paths/register scripts/test-aave-v2-adapter.ts
npx ts-node -r tsconfig-paths/register scripts/test-aave-v3-adapter.ts

Tests the Aave V2 or V3 protocol adapter for initialization, fetching, and formatting user positions. Uses environment variables for configuration.

### 3. Provider Adapters (`test-provider-adapters.ts`)
Tests initialization and data retrieval for various Ethereum provider adapters (Alchemy, Infura, etc.), including provider stats and fallback logic.

### 4. Provider Monitoring (`test-provider-monitoring.ts`)
Demonstrates the provider health monitoring system, metrics collection, and dashboard integration.

### 5. Query Orchestrator (`test-query-orchestrator.ts`)
Tests the Query Orchestrator service for aggregating user positions across multiple protocols and normalizing results.

### 6. Path Alias Validation (`test-path-aliases.ts`)
Validates TypeScript path alias configuration and import boundaries for all architectural layers.

### 7. Address Validation (`test-address-validation.ts`)
Checks Ethereum address normalization and checksumming for addresses in the Aave Address Book and elsewhere.

### 8. Data Format Validation (`test-data-format.ts`)
Validates the structure, checksumming, and formatting of position data objects and data files.

### 9. Database Connection Test (`test-database-connection.ts`)
Tests connectivity and configuration for the application's database layer.

### 10. Provider Config Test (`test-provider-config.ts`)
Tests provider configuration loading and validation logic.

### 11. Aave Address Book (`check-aave-addresses-book.ts`)
Prints and explores Aave contract addresses from the official Aave Address Book package.

### 12. Contract Verification (`verify-contracts.ts`)
Automates verification of smart contract addresses, bytecode, and interfaces used in the application.

### 13. Config Test (`test-config.ts`)
Validates application configuration loading and parsing.

## How to Run Scripts

Each script can be run individually with ts-node (ensure you have tsconfig-paths installed):

```
npx ts-node -r tsconfig-paths/register scripts/<script-name>.ts
```

Or, add npm scripts for frequent tests in your `package.json`:

```
"scripts": {
  "test:aave": "ts-node -r tsconfig-paths/register scripts/test-aave-fetch.ts",
  "test:aave-v3": "ts-node -r tsconfig-paths/register scripts/test-aave-v3-adapter.ts",
  "test:provider": "ts-node -r tsconfig-paths/register scripts/test-provider-adapters.ts",
  ...
}
```

## Running All Tests

To run all tests at once, use:

```
npm run test:all
```

## Notes
- All scripts use direct imports aligned with the project's hexagonal architecture.
- Scripts are integration-focused and interact with live Ethereum networks or configured testnets.
- For environment-dependent scripts, copy `.env.example` to `.env` and fill in required values.
- See each script's top comments for specific usage and requirements.
