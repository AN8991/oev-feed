# OEV Feed Project Structure

## Hexagonal Architecture Implementation

This document outlines the current project structure. The codebase is organized according to the principles of hexagonal architecture with clear separation between domain, application, adapters, infrastructure, and shared layers.

> **Status:** ✅ **Application is fully operational** - All core services, controllers, and database integration are working. The application successfully starts and serves REST API endpoints.

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

## Key Domain Models

### Position Model

```typescript
export interface PositionModel {
  id: string;
  userId: string;
  protocol: string;
  network: string;
  collateral: CollateralAsset[];
  debt: DebtAsset[];
  healthFactor: number;
  liquidationThreshold: number;
  lastUpdated: Date;
}

export interface CollateralAsset {
  symbol: string;
  amount: string;
  valueUSD: string;
  liquidationThreshold: number;
}

export interface DebtAsset {
  symbol: string;
  amount: string;
  valueUSD: string;
  interestRate: number;
}
```

## Key Ports (Interfaces)

### Protocol Adapter Port

```typescript
import { PositionModel } from '@domain/models/position.model';

export interface ProtocolAdapterPort {
  /**
   * Get the protocol name
   */
  getProtocolName(): string;
  
  /**
   * Get the supported networks for this protocol
   */
  getSupportedNetworks(): string[];
  
  /**
   * Get positions for a specific user
   * 
   * @param userAddress User address to query positions for
   * @returns Array of positions
   */
  getPositionsByUser(userAddress: string): Promise<PositionModel[]>;
  
  /**
   * Get a specific position by ID
   * 
   * @param positionId Position ID
   * @returns Position or null if not found
   */
  getPositionById(positionId: string): Promise<PositionModel | null>;
  
  /**
   * Get all positions for a specific protocol and network
   * 
   * @param network Network to query (optional)
   * @returns Array of positions
   */
  getAllPositions(network?: string): Promise<PositionModel[]>;
}
```

## Key Adapter Implementations

### Aave Protocol Adapter

```typescript
import { ProtocolAdapterPort } from '@domain/ports/secondary/protocol-adapter.port';
import { PositionModel } from '@domain/models/position.model';
import { AavePositionDTO } from './aave-types';
import { PositionMapper } from '@application/mappers/position.mapper';

export class AaveProtocolAdapter implements ProtocolAdapterPort {
  private readonly protocolName = 'Aave';
  private readonly supportedNetworks: string[];
  private readonly positionMapper: PositionMapper;
  
  constructor(
    supportedNetworks: string[],
    private readonly providerFactory: ProviderFactory,
    private readonly configService: ConfigService
  ) {
    this.supportedNetworks = supportedNetworks;
    this.positionMapper = new PositionMapper();
  }
  
  getProtocolName(): string {
    return this.protocolName;
  }
  
  getSupportedNetworks(): string[] {
    return this.supportedNetworks;
  }
  
  async getPositionsByUser(userAddress: string): Promise<PositionModel[]> {
    // Implementation details
    return [];
  }
  
  async getPositionById(positionId: string): Promise<PositionModel | null> {
    // Implementation details
    return null;
  }
  
  async getAllPositions(network?: string): Promise<PositionModel[]> {
    // Implementation details
    return [];
  }
}
```

### Database Adapter

```typescript
import { DatabasePort } from '@domain/ports/secondary/database.port';
import { PositionModel } from '@domain/models/position.model';
import { UserModel } from '@domain/models/user.model';
import { PositionEntity } from '@adapters/secondary/database/typeorm/entities/position.entity';
import { UserEntity } from '@adapters/secondary/database/typeorm/entities/user.entity';
import { Repository } from 'typeorm';

export class TypeORMAdapter implements DatabasePort {
  constructor(
    private readonly userRepository: Repository<UserEntity>,
    private readonly positionRepository: Repository<PositionEntity>
  ) {}
  
  async getUserById(id: string): Promise<UserModel | null> {
    const userEntity = await this.userRepository.findOne({ where: { id } });
    if (!userEntity) return null;
    return this.mapUserEntityToDomain(userEntity);
  }
  
  async getUserByAddress(address: string): Promise<UserModel | null> {
    const userEntity = await this.userRepository.findOne({ where: { address } });
    if (!userEntity) return null;
    return this.mapUserEntityToDomain(userEntity);
  }
  
  async createUser(user: UserModel): Promise<UserModel> {
    const userEntity = this.mapUserDomainToEntity(user);
    const savedEntity = await this.userRepository.save(userEntity);
    return this.mapUserEntityToDomain(savedEntity);
  }
  
  async getPositionById(id: string): Promise<PositionModel | null> {
    const positionEntity = await this.positionRepository.findOne({ where: { id } });
    if (!positionEntity) return null;
    return this.mapPositionEntityToDomain(positionEntity);
  }
  
  async getPositionsByUser(userId: string): Promise<PositionModel[]> {
    const positionEntities = await this.positionRepository.find({ where: { userId } });
    return positionEntities.map(entity => this.mapPositionEntityToDomain(entity));
  }
  
  async savePosition(position: PositionModel): Promise<PositionModel> {
    const positionEntity = this.mapPositionDomainToEntity(position);
    const savedEntity = await this.positionRepository.save(positionEntity);
    return this.mapPositionEntityToDomain(savedEntity);
  }
  
  async updatePositions(positions: PositionModel[]): Promise<PositionModel[]> {
    const positionEntities = positions.map(pos => this.mapPositionDomainToEntity(pos));
    const savedEntities = await this.positionRepository.save(positionEntities);
    return savedEntities.map(entity => this.mapPositionEntityToDomain(entity));
  }
  
  // Mapping methods
  private mapUserEntityToDomain(entity: UserEntity): UserModel {
    // Implementation
    return {} as UserModel;
  }
  
  private mapUserDomainToEntity(model: UserModel): UserEntity {
    // Implementation
    return {} as UserEntity;
  }
  
  private mapPositionEntityToDomain(entity: PositionEntity): PositionModel {
    // Implementation
    return {} as PositionModel;
  }
  
  private mapPositionDomainToEntity(model: PositionModel): PositionEntity {
    // Implementation
    return {} as PositionEntity;
  }
}
```

## Application Services

### Query Orchestrator Service

```typescript
import { ProtocolAdapterPort } from '@domain/ports/secondary/protocol-adapter.port';
import { PositionModel } from '@domain/models/position.model';

export class QueryOrchestratorService {
  constructor(
    private readonly protocolAdapters: ProtocolAdapterPort[]
  ) {}
  
  async getUserPositionsAcrossProtocols(userAddress: string): Promise<PositionModel[]> {
    // Execute queries in parallel across all protocol adapters
    const positionPromises = this.protocolAdapters.map(adapter => 
      adapter.getPositionsByUser(userAddress)
    );
    
    // Wait for all queries to complete
    const positionsArrays = await Promise.all(positionPromises);
    
    // Flatten the arrays of positions
    return positionsArrays.flat();
  }
  
  async getUserPositionsByProtocol(userAddress: string, protocol: string): Promise<PositionModel[]> {
    // Find adapters for the specified protocol
    const protocolAdapters = this.protocolAdapters.filter(
      adapter => adapter.getProtocolName().toLowerCase() === protocol.toLowerCase()
    );
    
    if (protocolAdapters.length === 0) {
      throw new Error(`No adapters found for protocol: ${protocol}`);
    }
    
    // Execute queries in parallel across matching protocol adapters
    const positionPromises = protocolAdapters.map(adapter => 
      adapter.getPositionsByUser(userAddress)
    );
    
    // Wait for all queries to complete
    const positionsArrays = await Promise.all(positionPromises);
    
    // Flatten the arrays of positions
    return positionsArrays.flat();
  }
}
```

## Infrastructure Utilities

### Request Distributor

```typescript
import { Logger } from '@nestjs/common';
import { ProviderAdapterPort } from '@domain/ports/secondary/provider-adapter.port';
import { ProviderType } from '@domain/enums/provider-type.enum';

export enum SelectionStrategy {
  RATE_LIMIT = 'rate_limit',
  RESPONSE_TIME = 'response_time',
  HEALTH = 'health',
  RANDOM = 'random',
  LEAST_LOADED = 'least_loaded',
  ROUND_ROBIN = 'round_robin'
}

export interface RequestDistributorOptions {
  defaultStrategy: SelectionStrategy;
  excludeUnhealthy: boolean;
  minRateLimitRemaining: number;
}

export class RequestDistributor {
  private strategy: SelectionStrategy;
  private options: RequestDistributorOptions;
  private roundRobinCounter: Map<string, number> = new Map();
  private lastSelectedProviderType: Map<string, ProviderType> = new Map();
  private excludedProviders: Map<string, Set<ProviderType>> = new Map();
  
  constructor(options: Partial<RequestDistributorOptions> = {}) {
    // Implementation details
  }
  
  public setStrategy(strategy: SelectionStrategy): void {
    // Implementation details
  }
  
  public selectProvider(
    providers: Map<ProviderType, ProviderAdapterPort>,
    network: string
  ): { provider: ProviderAdapterPort; type: ProviderType } {
    // Implementation details
    return {} as any;
  }
  
  // Other methods...
}
```

## Database Entities

### User Entity

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PositionEntity } from '@adapters/secondary/database/typeorm/entities/position.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column({ unique: true })
  address: string;
  
  @Column({ nullable: true })
  email: string;
  
  @Column({ default: false })
  isActive: boolean;
  
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
  
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
  
  @OneToMany(() => PositionEntity, position => position.user)
  positions: PositionEntity[];
}
```

### Position Entity

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '@adapters/secondary/database/typeorm/entities/user.entity';

@Entity('positions')
export class PositionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  userId: string;
  
  @ManyToOne(() => UserEntity, user => user.positions)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
  
  @Column()
  protocol: string;
  
  @Column()
  network: string;
  
  @Column('jsonb')
  collateral: any[];
  
  @Column('jsonb')
  debt: any[];
  
  @Column('decimal', { precision: 18, scale: 2 })
  healthFactor: number;
  
  @Column('decimal', { precision: 18, scale: 2 })
  liquidationThreshold: number;
  
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;
}
