# OEV Feed - DeFi Lending Protocol Data Aggregator

A backend service that aggregates and monitors user lending and borrowing data from various DeFi protocols using **Hexagonal Architecture** for maintainable, protocol-agnostic design.

## 🎯 Project Overview

OEV Feed tracks user positions across multiple DeFi lending protocols, providing real-time position data including collateral, debt amounts, and health factors. The system is designed for scalability and protocol independence.

## 🔗 Supported Protocols

### **Currently Supported**
- **Aave V2** (Ethereum)
- **Aave V3** (Ethereum)

### **Planned Support**
- **Silo Finance** (Arbitrum)
- **Compound** (Ethereum)
- **Curve** (Multi-chain)
- **Ironclad Finance**
- **Lendle Protocol**
- **Orbit Protocol**

## ✨ Features

- **Multi-protocol position tracking** - Unified interface across DeFi protocols
- **Real-time health monitoring** - Track liquidation risks and health factors
- **Protocol-agnostic architecture** - Easy integration of new protocols
- **Provider redundancy** - Alchemy/Infura fallback mechanisms
- **Comprehensive testing** - Unit tests + blockchain integration tests
- **Event-driven infrastructure** - Circuit breakers, health monitoring, request distribution
- **GraphQL & REST APIs** - Flexible data access patterns
- **WebSocket support** - Real-time position updates

## 🏗️ Architecture

**Hexagonal (Ports and Adapters) Architecture:**
- **Domain Layer** - Protocol-agnostic business logic and models
- **Application Layer** - Query orchestration, DTOs, mappers
- **Adapter Layer** - Protocol adapters, database adapters, provider adapters
- **Infrastructure Layer** - Circuit breakers, health monitoring, logging

## 🛠️ Tech Stack

- **Backend**: TypeScript, Node.js
- **Database**: PostgreSQL with TypeORM
- **Blockchain**: ethers.js v6+
- **APIs**: GraphQL, REST, WebSocket
- **Providers**: Alchemy, Infura
- **Testing**: Jest (unit), ts-node (integration)
- **Architecture**: Hexagonal (Ports and Adapters)

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+
- PostgreSQL 14+
- Alchemy API key
- Infura API key (optional, for redundancy)

### **Installation**

```bash
# Clone the repository
git clone <repository-url>
cd oev-feed

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### **Database Setup**

```bash
# Create PostgreSQL database
createdb oev_feed

# Run database setup script
npm run setup:database
```

### **Environment Configuration**

Update `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/oev_feed

# Blockchain Providers
ALCHEMY_API_KEY=your_alchemy_api_key
INFURA_API_KEY=your_infura_api_key

# Application
NODE_ENV=development
PORT=3000
```

## 🧪 Testing

The project uses a **dual testing strategy**:

### **Unit Tests** (Fast, Mocked)
```bash
# Run all unit tests
npm run test:unit

# Run specific unit test
npm test -- test/unit/domain/models/position.model.test.ts

# Run with coverage
npm run test:unit -- --coverage
```

### **Integration Tests** (Blockchain, Real Data)
```bash
# Run all integration tests
npm run test:integration

# Run specific protocol tests
npm run test:aave

# Run database tests
npm run test:database

# Run all tests (unit + integration)
npm run test:all
```

### **Test Organization**
- **`test/unit/`** - Fast unit tests with mocked dependencies
- **`scripts/`** - Integration tests with real blockchain data
  - `scripts/aave/` - Aave protocol integration tests
  - `scripts/database/` - Database setup and connection tests
  - `scripts/infrastructure/` - Provider monitoring tests
  - `scripts/integration/` - End-to-end integration tests
  - `scripts/utilities/` - Development and validation tools

## 📁 Project Structure

```
src/
├── domain/              # Domain layer (business logic)
│   ├── models/         # Domain models and interfaces
│   ├── services/       # Domain services
│   ├── ports/          # Ports (interfaces)
│   └── types/          # Domain types
├── application/         # Application layer
│   ├── services/       # Application services
│   └── dto/           # Data transfer objects
├── adapters/           # Adapter layer
│   ├── primary/       # API adapters (REST, GraphQL)
│   └── secondary/     # External service adapters
└── infrastructure/     # Infrastructure utilities
    ├── config/        # Configuration management
    ├── logging/       # Structured logging
    └── monitoring/    # Health monitoring

scripts/                # Integration tests and utilities
test/                  # Unit tests
```

## 🔧 Development

### **Available Scripts**

```bash
# Development
npm run build          # Build TypeScript
npm run start          # Start application
npm run lint           # Run ESLint

# Testing
npm run test:unit      # Unit tests only
npm run test:integration # Integration tests only
npm run test:all       # All tests
npm run test:aave      # Aave protocol tests

# Utilities
npm run verify:contracts # Verify smart contract addresses
```

### **Key Implementation Notes**

- **Address Normalization** - All Ethereum addresses use `ethers.getAddress()` for checksum validation
- **Path Aliases** - Uses TypeScript path aliases (`@domain/*`, `@adapters/*`) for clean imports
- **Provider Fallback** - Automatic failover between Alchemy and Infura
- **Protocol Abstraction** - New protocols can be added without changing core business logic
- **Event-Driven Design** - Resilient infrastructure with circuit breakers and health monitoring

## 📚 Documentation

- **`architecture.md`** - Detailed architecture overview
- **`project-structure.md`** - Codebase organization guide
- **`implementation-spec.md`** - Implementation specifications
- **`scripts/README.md`** - Integration testing guide

## 🤝 Contributing

1. Follow the Hexagonal Architecture patterns
2. Add unit tests for domain/application logic
3. Add integration tests for new protocol adapters
4. Use TypeScript path aliases for imports
5. Ensure all tests pass before submitting PRs

## 📄 License

[Add your license information here]