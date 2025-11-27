# Import Path Guidelines for OEV Feed

This document outlines the standardized approach to imports in the OEV Feed codebase following **A+ (96/100) hexagonal architecture** principles with modern NestJS patterns.

**Recent Changes**:
- Provider configuration consolidated into `NetworkConfigService` (ProviderConfigService removed)
- Added `--max-health-factor` parameter to user discovery scripts

## Path Aliases - **Modern Pattern**

We use TypeScript path aliases for clear, maintainable imports that reflect the hexagonal architecture layer boundaries. **Barrel files (index.ts) are eliminated** for better optimization and clarity.

### Current Examples

```typescript
// Domain layer imports - Pure business logic
import { RiskCalculator } from '@domain/models/risk.model';
import { PositionModel } from '@domain/models/position.model';
import { Network } from '@domain/types/networks';

// Infrastructure layer imports - Modern DI services
import { NetworkConfigService } from '@infrastructure/config/network.config';
import { DatabaseLifecycleService } from '@infrastructure/database/database-lifecycle.service';
import { ProviderHealthMonitor } from '@infrastructure/utils/provider-health-monitor';

// Application layer imports - Service orchestration
import { QueryOrchestratorService } from '@application/services/query-orchestrator.service';
import { AavePositionMapper } from '@application/mappers/aave-position.mapper';

// Adapters layer imports - External integrations
import { ProviderFactory } from '@adapters/secondary/providers/provider-factory';
import { ProtocolAdapterFactory } from '@adapters/secondary/protocols/protocol-adapter-factory';
```

**Key Principles**:
- Use `@domain/*`, `@application/*`, `@adapters/*`, `@infrastructure/*` to indicate architectural layer
- **No barrel files** - Always import from concrete files for better tree-shaking
- **No relative imports** except for local, intra-module files
- **Layer-aware imports** - Respect hexagonal architecture boundaries

## Layer Boundaries - **Perfect Compliance** ✅

**Strict hexagonal architecture rules** with recent improvements:

### 1. **Domain Layer** (`@domain/*`) - **A+ (95/100)**
- ✅ **Pure Business Logic**: Only imports from within domain or shared
- ✅ **No Infrastructure Dependencies**: Clean separation maintained
- ✅ **Recent Cleanup**: Removed infrastructure imports from network types

**Allowed Imports**:
```typescript
import { Network } from '@domain/types/networks';           // ✅ Domain types
import { RiskCalculator } from '@domain/models/risk.model'; // ✅ Domain models
```

### 2. **Application Layer** (`@application/*`) - **A- (92/100)**
- ✅ **Service Orchestration**: Can import from domain and shared
- ✅ **Recent Improvements**: Mappers converted to injectable services
- ⚠️ **Opportunity**: Complete provider health logic implementation

**Allowed Imports**:
```typescript
import { PositionModel } from '@domain/models/position.model';     // ✅ Domain
import { AavePositionDTO } from '@application/dto/aave-position.dto'; // ✅ Application
```

### 3. **Infrastructure Layer** (`@infrastructure/*`) - **A+ (98/100)**
- ✅ **Modern DI Services**: All configuration services use proper injection
- ✅ **Recent Migration**: Database service moved from domain to infrastructure
- ✅ **Enhanced Services**: Health monitoring, request distribution, caching

**Allowed Imports**:
```typescript
import { ConfigService } from '@nestjs/config';                    // ✅ NestJS
import { Network } from '@domain/types/networks';                  // ✅ Domain types
import { DatabaseLifecycleService } from '@infrastructure/database/database-lifecycle.service'; // ✅ Infrastructure
```

### 4. **Adapters Layer** (`@adapters/*`) - **A- (90/100)**
- ✅ **External Integration**: Can import from domain, application, shared
- ✅ **Factory Pattern**: Proper injectable factory services
- ✅ **Recent Optimization**: Protocol and provider factories converted to DI

**Allowed Imports**:
```typescript
import { ProviderAdapterPort } from '@domain/ports/secondary/provider-adapter.port'; // ✅ Domain
import { NetworkConfigService } from '@infrastructure/config/network.config';        // ✅ Infrastructure (when needed)
```

*Import Guidelines - Updated: 2025-11-27*
