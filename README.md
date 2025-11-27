# OEV Feed

A DeFi position monitoring and risk assessment platform built with NestJS following hexagonal architecture principles.

## Overview

OEV Feed monitors DeFi lending positions (currently Aave V2/V3) across multiple networks, providing:
- **Position Tracking**: Monitor collateral, debt, and health factors
- **Risk Assessment**: Real-time risk scoring and liquidation alerts
- **Multi-Provider Support**: 10 blockchain providers across 5 networks
- **Dashboard**: React-based visualization of portfolio and risk metrics

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- API keys for blockchain providers (Alchemy, Infura, Ankr, etc.)

### Installation

```bash
# Clone and install
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys and database credentials

# Create database
npx ts-node -r tsconfig-paths/register scripts/database/create-database.ts

# Build and start
npm run build
npm run start
```

### Data Population

```bash
# Discover users with at-risk positions
npx ts-node -r tsconfig-paths/register scripts/discovery/aave-v3-user-discovery.ts --network ethereum --from-date 2025-01-01

# Process positions and calculate risk
npx ts-node -r tsconfig-paths/register scripts/aave/aave-v3-position-processor.ts --network ethereum --max-users 100 --batch-size 20
```

### Dashboard

```bash
cd oev-feed-dashboard
npm install
npm run dev
```

## Architecture

- **Hexagonal Architecture**: Clean separation of domain, application, and infrastructure layers
- **NestJS Framework**: Modern TypeScript backend with dependency injection
- **Multi-Provider**: Support for Alchemy, Infura, Ankr, QuickNode, and more
- **Multi-Network**: Ethereum, Polygon, Arbitrum, Optimism, Blast

## Documentation

- **[src/README.md](src/README.md)**: How to run locally
- **[scripts/README.md](scripts/README.md)**: Data population scripts
- **[docs/](docs/)**: Architecture and configuration guides
- **[implementation-spec.md](implementation-spec.md)**: Detailed implementation specification

## API Endpoints

- `GET /api/v1/positions` - Get all positions
- `GET /api/v1/risk-assessment/user/:address` - Get user risk assessment
- `GET /api/v1/risk-assessment/positions/at-risk` - Get at-risk positions
- `GET /api/v1/providers` - Get provider status
- `GET /metrics` - Prometheus metrics

## Tech Stack

- **Backend**: NestJS, TypeORM, PostgreSQL
- **Frontend**: Next.js 16, React 19, TailwindCSS, Recharts
- **Blockchain**: Ethers.js, Aave Protocol
- **Monitoring**: Prometheus metrics, structured logging

## License

MIT