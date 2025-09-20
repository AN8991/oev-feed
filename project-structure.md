# OEV Feed Project Structure

## Hexagonal Architecture Implementation

This document outlines the current project structure. The codebase is organized according to the principles of hexagonal architecture with clear separation between domain, application, adapters, infrastructure, and shared layers.

> **Note:** All imports use relative paths. The application uses NestJS with TypeORM for database operations and follows hexagonal architecture principles.

```
src/
│
├── domain/                           # Inner Hexagon - Core Domain Logic
│   ├── models/                       # Domain Models
│   │   ├── position.model.ts         # Protocol-agnostic Position model
│   │   ├── risk.model.ts             # Risk assessment model with RiskCalculator
│   │   ├── user.model.ts             # User model
│   ├── services/                     # Domain Services
│   │   ├── positions.service.ts      # Position business logic
│   │   ├── risk-analysis.service.ts  # Risk analysis logic
│   │   ├── providers.service.ts      # Provider management
│   │   ├── events.service.ts         # Event management
│   │   ├── database/                 # Database Services
│   │   │   ├── database-init.service.ts # Database initialization (uses NestJS Logger)
│   ├── utils/                        # Domain Utilities
│   │   ├── address-utils.ts          # Address normalization and validation
│   │   ├── numeric-utils.ts          # Numeric formatting and calculations
│   │   ├── contract-verification.ts  # Contract verification utilities
│   ├── types/                        # Domain Types & DTOs
│   │   ├── event.dto.ts              # Event DTOs
│   │   ├── provider.dto.ts           # Provider DTOs
│   │   ├── position.dto.ts           # Position DTOs
│   │   ├── protocols.ts              # Protocol type definitions
│   ├── ports/                        # Ports (Interfaces)
│   │   ├── primary/                  # Inbound Ports
│   │   │   ├── position-query.port.ts
│   │   │   ├── position-command.port.ts
│   │   │   ├── risk-assessment.port.ts
│   │   ├── secondary/                # Outbound Ports
│   │   │   ├── protocol-adapter.port.ts
│   │   │   ├── database.port.ts
│   │   │   ├── notification.port.ts
│   │   │   ├── repositories/         # Repository Ports
│   │   │   │   ├── provider-repository.port.ts
│   │   │   │   ├── provider-request-repository.port.ts
│   │   │   │   ├── provider-health-repository.port.ts
│   │   │   │   ├── position-repository.port.ts
│   ├── enums/                        # Domain Enumerations
│   │   ├── provider-type.enum.ts     # Provider types
│   └── index.ts
│
├── application/                      # Application Services
│   ├── services/                     # Application Services
│   │   ├── query-orchestrator.service.ts # Coordinates protocol queries (uses NestJS Logger)
│   ├── dto/                          # Data Transfer Objects
│   │   ├── position.dto.ts           # Position DTOs
│   │   ├── risk.dto.ts               # Risk DTOs
│   │   ├── user.dto.ts               # User DTOs
│   ├── mappers/                      # Data Mappers
│   │   ├── position.mapper.ts        # Position data transformation
│   │   ├── protocol.mapper.ts        # Protocol data normalization
│   └── index.ts
│
├── adapters/                         # Outer Hexagon - Adapters
│   ├── primary/                      # Primary (Driving) Adapters
│   │   ├── rest/                     # REST API Controllers
│   │   │   ├── controllers/          # REST Controllers
│   │   │   │   ├── positions.controller.ts
│   │   │   │   ├── providers.controller.ts
│   │   │   │   ├── events.controller.ts
│   │   │   │   ├── risk-assessment.controller.ts
│   ├── secondary/                    # Secondary (Driven) Adapters
│   │   ├── providers/                # Provider Adapters
│   │   │   ├── alchemy-provider.adapter.ts
│   │   │   ├── infura-provider.adapter.ts
│   │   │   │   ├── enhanced-provider.adapter.ts  # Enhanced provider with retry logic (uses NestJS Logger)
│   │   │   ├── provider-factory.ts
│   │   ├── protocols/                # Protocol Adapters
│   │   │   ├── aave-v2/
│   │   │   ├── aave-v3/
│   │   │   ├── silo/
│   │   │   ├── database/                 # Database Adapters
│   │   │   │   ├── typeorm/              # TypeORM Implementation
│   │   │   │   │   ├── entities/         # TypeORM Entities
│   │   │   │   │   │   ├── base.entity.ts
│   │   │   │   │   │   ├── user.entity.ts
│   │   │   │   │   │   ├── position.entity.ts
│   │   │   │   │   │   ├── provider.entity.ts
│   │   │   │   │   │   ├── provider-request.entity.ts
│   │   │   │   │   │   ├── provider-health.entity.ts
│   │   │   │   │   │   ├── block.entity.ts
│   │   │   │   │   │   ├── transaction.entity.ts
│   │   │   │   │   │   ├── oev-event.entity.ts
│   │   │   │   │   │   ├── oev-opportunity.entity.ts
│   │   │   │   ├── repositories/     # TypeORM Repositories
│   │   │   │   │   ├── provider.repository.ts
│   │   │   │   │   ├── provider-request.repository.ts
│   │   │   │   │   ├── provider-health.repository.ts
│   │   │   │   │   ├── position.repository.ts
│   │   │   │   │   └── repository-factory.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── index.ts
│
├── infrastructure/                   # Infrastructure Utilities & Config
│   ├── config/                       # Configuration services
│   │   ├── config.ts                 # Main configuration service (uses NestJS validation)
│   │   ├── http.config.ts            # HTTP configuration service (uses NestJS validation)
│   │   ├── typeorm.config.ts         # TypeORM database configuration
│   ├── utils/                        # Infrastructure utilities
│   │   ├── provider-health-monitor.ts # Provider health monitoring (uses NestJS Logger)
│   │   ├── request-distributor.ts    # Request distribution (uses NestJS Logger)
│   │   ├── dashboard-service.ts      # Monitoring dashboard
│   │   ├── data-source-fallback.ts   # Data source fallback (uses NestJS Logger)
│   │   ├── time-range.utils.ts       # Time range utilities
│   └── index.ts
│
├── shared/                           # Shared Utilities & Types
│   ├── utils/                        # Shared utilities
│   │   ├── errors.ts
│   │   ├── retry.ts
│   │   ├── exponential-backoff.ts
│   │   ├── logger.ts (deprecated)
│   │   ├── rateLimit.ts (deprecated)
│   ├── types/                        # Shared types
│   │   ├── winston.d.ts
│   └── index.ts
│
├── scripts/                          # Migration and utility scripts
│   ├── migrate-imports.js            # Import migration tool
│   ├── path-migration-example.ts     # Example import conversion
│   └── ...
│
├── docs/                             # Documentation
│   ├── import-guidelines.md
│   ├── provider-adapters.md
│   ├── provider-monitoring.md
│   └── ...
│
├── config/                           # Application Configuration
│   ├── env.ts                        # Environment variables
│   ├── contracts.ts                  # Contract addresses
│   ├── subgraphs.ts                  # Subgraph endpoints
│   ├── config.ts                     # Configuration service
│   └── index.ts
│
└── index.ts                          # Application entry point
```