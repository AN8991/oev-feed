# Testing Scripts

This directory contains scripts for testing and validating the OEV Feed application, organized by functionality for better maintainability and discovery.

## Testing Approach

We use an integration-focused approach with script-based tests that provide several advantages:

1. **Real-world Testing**: Scripts interact with actual contracts on the Ethereum mainnet, providing realistic validation
2. **Address Validation**: Proper testing of address checksumming as required by ethers.js v6+
3. **Data Format Validation**: Ensures position data is properly formatted with correct decimal places and units
4. **Easy to Run**: Simple npm scripts to run individual tests or organized test suites

## Folder Structure

### 📂 `aave/` - Aave Protocol Testing
Core Aave protocol integration tests and utilities.

- **`test-aave-data-provider.ts`** - Tests Aave data provider functionality
- **`test-aave-v2-adapter.ts`** - Tests Aave V2 protocol adapter initialization and position fetching
- **`test-aave-v3-adapter.ts`** - Tests Aave V3 protocol adapter initialization and position fetching
- **`test-weth-position.ts`** - Tests WETH-specific position handling
- **`check-aave-addresses-book.ts`** - Validates Aave contract addresses from official address book

### 📂 `database/` - Database Operations
Database setup, testing, and maintenance utilities.

- **`create-database.ts`** - Creates the oev_feed PostgreSQL database
- **`test-database-connection.ts`** - Full database connection test with TypeORM
- **`test-database-connection-simple.ts`** - Simple database connectivity test
- **`check-database-positions.ts`** - Monitors and validates database position data
- **`query-recent-positions.ts`** - Queries recent positions from database
- **`simple-db-query.ts`** - Simple database query operations
- **`pg-test.ts`** - Basic PostgreSQL connectivity test

### 📂 `infrastructure/` - Infrastructure & Provider Testing
Provider adapters, configuration, and monitoring system tests.

- **`test-provider-adapters.ts`** - Tests Ethereum provider adapters (Alchemy, Infura)
- **`test-provider-config.ts`** - Tests provider configuration loading and validation
- **`test-provider-monitoring.ts`** - Tests provider health monitoring and dashboard integration
- **`test-config.ts`** - Tests application configuration loading and parsing

### 📂 `integration/` - Integration & End-to-End Testing
Complete system integration tests and cross-component validation.

- **`test-complete-flow.ts`** - End-to-end integration testing of complete data flow
- **`test-query-orchestrator.ts`** - Tests query orchestrator for multi-protocol aggregation
- **`test-address-validation.ts`** - Tests Ethereum address normalization and checksumming
- **`test-data-format.ts`** - Tests position data structure and formatting validation

### 📂 `utilities/` - Development Utilities
Development tools and validation utilities.

- **`verify-contracts.ts`** - Automates smart contract address and bytecode verification
- **`test-path-aliases.ts`** - Validates TypeScript path alias configuration and import boundaries (uses NestJS Logger)

## How to Run Scripts

### Individual Scripts
Each script can be run individually with ts-node:

```bash
# Aave testing
npx ts-node -r tsconfig-paths/register scripts/aave/test-aave-v3-adapter.ts
npx ts-node -r tsconfig-paths/register scripts/aave/test-aave-v2-adapter.ts

# Database operations
npx ts-node -r tsconfig-paths/register scripts/database/create-database.ts
npx ts-node -r tsconfig-paths/register scripts/database/test-database-connection.ts

# Infrastructure testing
npx ts-node -r tsconfig-paths/register scripts/infrastructure/test-provider-monitoring.ts

# Integration testing
npx ts-node -r tsconfig-paths/register scripts/integration/test-complete-flow.ts

# Utilities
npx ts-node -r tsconfig-paths/register scripts/utilities/verify-contracts.ts
```

### NPM Scripts
Use the predefined npm scripts for common tests:

```bash
# Core functionality tests
npm run test:aave                    # Aave integration testing
npm run test:address-validation      # Address validation
npm run test:data-format            # Data format validation
npm run test:all                    # Run all core tests

# Infrastructure tests
npm run test:provider-monitoring     # Provider monitoring system
```

## Environment Setup

1. **Copy environment template**: `cp .env.example .env`
2. **Required variables**:
   - `ALCHEMY_API_KEY` - Your Alchemy API key (required)
   - `INFURA_API_KEY` - Your Infura API key (optional, for fallback)
   - `DATABASE_URL` - PostgreSQL connection string
3. **Database setup**: Ensure PostgreSQL is running and accessible

## Notes

- **TypeScript Consistency**: All scripts are TypeScript files using the project's path aliases
- **Integration Focus**: Scripts interact with live Ethereum networks and real contract data
- **Hexagonal Architecture**: All imports follow the project's architectural patterns (`@domain/*`, `@adapters/*`, etc.)
- **Environment Dependent**: Most scripts require proper `.env` configuration
- **Real Data**: Tests use actual blockchain data, not mocks, for realistic validation

## Quick Start

1. Set up environment variables
2. Create database: `npx ts-node -r tsconfig-paths/register scripts/database/create-database.ts`
3. Test Aave integration: `npx ts-node -r tsconfig-paths/register scripts/aave/test-aave-v3-adapter.ts`
4. Monitor providers: `npx ts-node -r tsconfig-paths/register scripts/infrastructure/test-provider-monitoring.ts`
