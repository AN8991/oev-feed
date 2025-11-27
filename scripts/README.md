# Testing & Utility Scripts

This directory contains scripts for testing, validating, and operating the OEV Feed application. Scripts are organized by functionality using NestJS dependency injection patterns and proper architectural boundaries.

## Overview

The scripts provide comprehensive tooling for:

1. **Protocol Integration Testing**: Real-world testing with actual blockchain contracts
2. **Database Operations**: Setup, seeding, maintenance, and validation
3. **User Discovery**: Finding active DeFi users with positions at risk
4. **Position Processing**: Batch processing of user positions with risk assessment
5. **Infrastructure Testing**: Provider adapters, configuration, and monitoring
6. **Risk Assessment**: Comprehensive wallet risk analysis across protocols
7. **Development Utilities**: Contract verification, path validation, and debugging

## Architecture

All scripts follow the project's hexagonal architecture:
- **NestJS Dependency Injection**: Proper module imports and service injection
- **Path Aliases**: Use `@domain/*`, `@adapters/*`, `@application/*`, `@infrastructure/*`
- **Type Safety**: Full TypeScript support with proper interfaces
- **Clean Logging**: Uses NestJS Logger for structured output
- **Environment-Driven**: Configuration via `.env` file

## Folder Structure

### 📂 `aave/` - Aave Protocol Testing & Processing

**Integration Tests** (with full database persistence):
- **`test-aave-v2-adapter.ts`** - Aave V2 adapter test with database integration, risk assessment, and provider tracking
- **`test-aave-v3-adapter.ts`** - Aave V3 adapter test with database integration, risk assessment, and provider tracking
- **`test-aave-data-provider.ts`** - Tests Aave data provider contract interactions
- **`test-weth-position.ts`** - Tests WETH-specific position handling and edge cases
- **`check-aave-addresses-book.ts`** - Validates Aave contract addresses from official address book

**Batch Processing**:
- **`aave-v3-position-processor.ts`** - Batch processes discovered users, fetches positions, calculates risk, saves to database
  - Usage: `--network ethereum --max-users 10 --batch-size 5`

### 📂 `database/` - Database Operations

**Setup & Maintenance**:
- **`reset-database.ts`** - Truncates all tables and resets sequences for fresh testing
- **`seed-providers.ts`** - Seeds providers table with configured RPC providers (Alchemy, Infura, etc.)
- **`add-indexes-simple.ts`** - Adds performance indexes to frequently queried fields

**Testing & Validation**:
- **`check-db-positions.ts`** - Monitors and validates position data in database
- **`check-pg-connection.ts`** - Simple PostgreSQL connectivity test
- **`check-tables.ts`** - Validates database schema and table structure

### 📂 `discovery/` - User Discovery

**Protocol User Discovery**:
- **`aave-v2-user-discovery.ts`** - Discovers active Aave V2 users with positions at liquidation risk
  - Usage: `--network ethereum --from-date 2025-01-01`
- **`aave-v3-user-discovery.ts`** - Discovers active Aave V3 users with health factor <= 5
  - Usage: `--network ethereum --from-date 2025-01-01`

### 📂 `infrastructure/` - Infrastructure Testing

**Provider & Configuration**:
- **`test-provider-adapters.ts`** - Tests blockchain provider adapters (Alchemy, Infura, BlockDaemon, etc.)
- **`test-provider-config.ts`** - Tests provider configuration loading and validation
- **`test-network-config.ts`** - Tests network configuration service (5 networks, 10 providers)
- **`test-time-service.ts`** - Tests time service with NestJS @nestjs/schedule integration

### 📂 `integration/` - Integration Testing

**End-to-End Tests**:
- **`test-complete-flow.ts`** - Complete data flow: fetch positions → save to database → verify
- **`test-query-orchestrator.ts`** - Tests query orchestrator for multi-protocol position aggregation
- **`test-address-validation.ts`** - Tests Ethereum address normalization and checksum validation
- **`test-data-format.ts`** - Tests position data structure, formatting, and decimal precision

### 📂 `utilities/` - Development Utilities

**Risk Assessment & Analysis**:
- **`test-wallet-risk.ts`** - Comprehensive wallet risk assessment across Aave V2/V3 with detailed reporting
  - Features: Multi-protocol analysis, risk classification, portfolio metrics

**Development Tools**:
- **`verify-contracts.ts`** - Automates smart contract address and bytecode verification
- **`test-path-aliases.ts`** - Validates TypeScript path aliases and import boundaries

## How to Run Scripts

### Individual Scripts
Each script can be run individually with ts-node:

```bash
# User Discovery
npx ts-node -r tsconfig-paths/register scripts/discovery/aave-v2-user-discovery.ts --network ethereum --from-date 2025-01-01
npx ts-node -r tsconfig-paths/register scripts/discovery/aave-v3-user-discovery.ts --network ethereum --from-date 2025-01-01

# Position Processing (batch)
npx ts-node -r tsconfig-paths/register scripts/aave/aave-v3-position-processor.ts --network ethereum --max-users 10 --batch-size 5

# Protocol Testing (single wallet)
npx ts-node -r tsconfig-paths/register scripts/aave/test-aave-v3-adapter.ts
npx ts-node -r tsconfig-paths/register scripts/aave/test-aave-v2-adapter.ts
npx ts-node -r tsconfig-paths/register scripts/aave/test-aave-data-provider.ts
npx ts-node -r tsconfig-paths/register scripts/aave/test-weth-position.ts
npx ts-node -r tsconfig-paths/register scripts/aave/check-aave-addresses-book.ts

# Database Operations
npx ts-node -r tsconfig-paths/register scripts/database/reset-database.ts
npx ts-node -r tsconfig-paths/register scripts/database/seed-providers.ts
npx ts-node -r tsconfig-paths/register scripts/database/add-indexes-simple.ts
npx ts-node -r tsconfig-paths/register scripts/database/check-db-positions.ts
npx ts-node -r tsconfig-paths/register scripts/database/check-pg-connection.ts
npx ts-node -r tsconfig-paths/register scripts/database/check-tables.ts

# Infrastructure Testing
npx ts-node -r tsconfig-paths/register scripts/infrastructure/test-provider-adapters.ts
npx ts-node -r tsconfig-paths/register scripts/infrastructure/test-provider-config.ts
npx ts-node -r tsconfig-paths/register scripts/infrastructure/test-network-config.ts
npx ts-node -r tsconfig-paths/register scripts/infrastructure/test-time-service.ts

# Integration Testing
npx ts-node -r tsconfig-paths/register scripts/integration/test-complete-flow.ts
npx ts-node -r tsconfig-paths/register scripts/integration/test-query-orchestrator.ts
npx ts-node -r tsconfig-paths/register scripts/integration/test-address-validation.ts
npx ts-node -r tsconfig-paths/register scripts/integration/test-data-format.ts

# Risk Assessment & Utilities
npx ts-node -r tsconfig-paths/register scripts/utilities/test-wallet-risk.ts
npx ts-node -r tsconfig-paths/register scripts/utilities/verify-contracts.ts
npx ts-node -r tsconfig-paths/register scripts/utilities/test-path-aliases.ts
```

### NPM Scripts
Use the predefined npm scripts for common operations:

```bash
# Protocol Testing
npm run test:aave                    # Aave V3 adapter integration test

# Integration Testing
npm run test:address-validation      # Address normalization and checksumming
npm run test:data-format            # Position data structure validation

# Database Operations
npm run db:seed-providers           # Seed providers table with RPC providers
```

## Environment Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+ running locally or remotely
- Ethereum RPC provider API keys (Alchemy, Infura, etc.)

### Configuration Steps

1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Required environment variables**:
   ```bash
   # Database
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oev_feed
   
   # RPC Providers (at least one required)
   ALCHEMY_API_KEY=your_alchemy_key
   INFURA_API_KEY=your_infura_key
   
   # Optional: Additional providers
   BLOCKDAEMON_API_KEY=your_blockdaemon_key
   QUICKNODE_API_KEY=your_quicknode_key
   ```

3. **Database setup**:
   ```bash
   # Ensure PostgreSQL is running
   # Run migrations to create schema
   npm run typeorm:migration:run
   
   # Seed providers (optional)
   npm run db:seed-providers
   ```

## Quick Start Guide

### Complete Workflow Example

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env with your API keys

# 2. Reset database for a fresh start
npx ts-node -r tsconfig-paths/register scripts/database/reset-database.ts

# 3. Discover users with positions at risk
npx ts-node -r tsconfig-paths/register scripts/discovery/aave-v3-user-discovery.ts --network ethereum --from-date 2025-01-01

# 4. Process discovered users and fetch positions
npx ts-node -r tsconfig-paths/register scripts/aave/aave-v3-position-processor.ts --network ethereum --max-users 100 --batch-size 20

# 5. Assess wallet risk
npx ts-node -r tsconfig-paths/register scripts/utilities/test-wallet-risk.ts

# 6. Verify database data 
npx ts-node -r tsconfig-paths/register scripts/database/check-db-positions.ts
```

## 🚀 Minimum Commands for Demo/Showcase

### Script 1: User Discovery (Fastest)

```bash
npx ts-node -r tsconfig-paths/register scripts/discovery/aave-v3-user-discovery.ts --network ethereum --from-date 2025-01-26 --to-date 2025-01-26 --max-days 1 --max-health-factor 1.5
```

**Parameters explained:**
- `--from-date 2025-01-26` - Start from a recent date
- `--to-date 2025-01-26` - Only 1 day of data
- `--max-days 1` - Limit to 1 day of block scanning
- `--max-health-factor 1.5` - Only find users with HF <= 1.5 (very risky positions, fewer results)

This will only scan around ~7,200 blocks (1 day) and only return users with very risky positions.

---

### Script 2: Position Processor (Fastest)

```bash
npx ts-node -r tsconfig-paths/register scripts/aave/aave-v3-position-processor.ts --network ethereum --max-users 2 --batch-size 1
```

### Parameter Reference Guide

| Script | Parameter | Effect |
|--------|-----------|--------|
| Discovery | `--from-date` | Start date (YYYY-MM-DD) |
| Discovery | `--to-date` | End date (YYYY-MM-DD) |
| Discovery | `--max-days` | Max days to scan |
| Discovery | `--max-health-factor` | Max health factor filter (default: 5, lower = riskier = fewer results) |
| Processor | `--max-users` | Limit users to process |
| Processor | `--batch-size` | Users per batch |
| Processor | `--skip-processed` | Skip already processed users |

### Testing Individual Components

```bash
# Test protocol adapter
npx ts-node -r tsconfig-paths/register scripts/aave/test-aave-v3-adapter.ts

# Test provider configuration 
npx ts-node -r tsconfig-paths/register scripts/infrastructure/test-provider-config.ts

# Test complete integration flow
npx ts-node -r tsconfig-paths/register scripts/integration/test-complete-flow.ts
```

## Key Features

### 🔄 Protocol Integration Tests
Aave V2 and V3 adapter tests include:
- **Full Database Persistence**: Automatic user creation, position saving, data verification
- **Risk Assessment**: Real-time risk calculation using RiskAssessmentService
- **Provider Tracking**: Automated provider and request monitoring
- **Clean Output**: NestJS Logger with structured, minimal logging
- **End-to-End Validation**: Complete data flow from blockchain to database

### 🔍 User Discovery System
User discovery scripts provide:
- **Smart Filtering**: Finds users with positions at liquidation risk (health factor <= 5)
- **Date-Based Discovery**: Filter by position creation date
- **Batch Processing**: Efficient processing of large user sets
- **Database Integration**: Saves discovered users for position processing

### 📊 Risk Assessment Tools
Comprehensive risk analysis with:
- **Multi-Protocol Support**: Analyzes positions across Aave V2 & V3
- **Detailed Metrics**: Health factor, LTV, liquidation threshold, asset concentration
- **Risk Classification**: 5-tier system (LOW, MEDIUM, HIGH, CRITICAL, EXTREME)
- **Portfolio Analysis**: Overall wallet risk with weighted scoring
- **Professional Reporting**: Clean, structured console output

### 🗄️ Database Utilities
Database management tools:
- **Reset & Cleanup**: Truncates tables while preserving schema
- **Provider Seeding**: Populates providers table with RPC configurations
- **Performance Indexes**: Adds indexes to frequently queried fields
- **Validation Tools**: Checks data integrity and schema structure

## Architecture Notes

- **NestJS Patterns**: All scripts use proper dependency injection and module imports
- **Hexagonal Architecture**: Clean separation between domain, application, adapters, and infrastructure
- **Path Aliases**: Consistent use of `@domain/*`, `@adapters/*`, `@application/*`, `@infrastructure/*`
- **Type Safety**: Full TypeScript support with strict type checking
- **Real Data**: Scripts interact with actual blockchain contracts and live data
- **Environment-Driven**: All configuration via `.env` file

## Troubleshooting

### Common Issues

**Database Connection Errors**:
```bash
# Check PostgreSQL is running
npx ts-node -r tsconfig-paths/register scripts/database/check-pg-connection.ts

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

**RPC Provider Errors**:
```bash
# Test provider configuration
npx ts-node -r tsconfig-paths/register scripts/infrastructure/test-provider-config.ts

# Verify API keys are set
echo $ALCHEMY_API_KEY
```

**TypeScript Path Errors**:
```bash
# Validate path aliases
npx ts-node -r tsconfig-paths/register scripts/utilities/test-path-aliases.ts
```
