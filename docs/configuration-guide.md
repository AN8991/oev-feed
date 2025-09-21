# Configuration Guide

## Overview

The OEV Feed application uses **modern DI-based configuration services** with comprehensive validation using `class-validator`. This approach provides type safety, startup validation, and centralized configuration management.

**Current Status**: with modern NestJS patterns

## Configuration Architecture

### Configuration Services

**Modern Injectable Services**:

1. **TypeOrmConfigService** - Database configuration with connection pooling
2. **NetworkConfigService** - Multi-provider network configuration (10 providers, 5 networks)
3. **SubgraphService** - Multi-network subgraph endpoint management
4. **DatabaseLifecycleService** - Database lifecycle with health checks

## Environment Variables

**Complete Configuration** for production deployment:

```bash
# Application Configuration
NODE_ENV=production
PORT=3000
APP_NAME=OEV Feed
APP_VERSION=1.0.0
LOG_LEVEL=info

# Database Configuration - Enhanced
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=oev_feed
DB_SYNCHRONIZE=false
DB_LOGGING=false
DB_MAX_CONNECTIONS=10
DB_MIN_CONNECTIONS=1
DB_ACQUIRE_TIMEOUT=30000
DB_IDLE_TIMEOUT=30000
DATABASE_URL=postgresql://user:pass@host:5432/db

# Provider Configuration - 10 Providers Supported
ALCHEMY_API_KEY=your_alchemy_key
INFURA_API_KEY=your_infura_key
BLOCKDAEMON_API_KEY=your_blockdaemon_key
BLOCKCYPHER_API_KEY=your_blockcypher_key
QUICKNODE_API_KEY=your_quicknode_key
ETHERSCAN_API_KEY=your_etherscan_key
ANKR_API_KEY=your_ankr_key
POCKET_API_KEY=your_pocket_key
CUSTOM_RPC_URL=your_custom_rpc
LOCAL_RPC_URL=http://localhost:8545

# Network Configuration - 5 Networks
SUPPORTED_NETWORKS=ethereum,polygon,arbitrum,optimism,blast

# Subgraph Configuration
GRAPH_STUDIO_API_KEY=your_graph_studio_key

# Protocol Configuration - Enhanced
AAVE_V2_ETHEREUM_POOL=0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9
AAVE_V2_ETHEREUM_DATA_PROVIDER=0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d
AAVE_V3_ETHEREUM_POOL=0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
AAVE_V3_ETHEREUM_DATA_PROVIDER=0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3

# Middleware Configuration - Industry-Leading
METRICS_ENABLED=true
METRICS_PATH=/metrics
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_TIMEOUT=5000
METHOD_SPECIFIC_LOGGING=true
METHOD_SPECIFIC_METRICS=true
```

## Modern Configuration Services - **Injectable Pattern** ✅

### TypeOrmConfigService

**Production-ready database configuration**:

```typescript
@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    // Connection pooling, SSL support, environment-specific configurations
    // Complete entity registration with all 9 TypeORM entities
  }
}
```

### NetworkConfigService

**Multi-provider network configuration**:

```typescript
@Injectable()
export class NetworkConfigService {
  // 5 networks: Ethereum, Polygon, Arbitrum, Optimism, Blast
  // 10 providers with type-safe URL templates
  // API key management and validation
  
  getNetworkConfig(network: Network, provider: Providers): NetworkConfig {
    // Type-safe provider URL templates with API key management
  }
}
```

### SubgraphService

**Multi-network subgraph management**:

```typescript
@Injectable()
export class SubgraphService {
  // Aave V2/V3 support across all networks
  // Configuration validation and health checking
  
  getSubgraphEndpoint(protocol: string, version: string, network: string): SubgraphEndpoint {
    // Multi-version Aave support with validation
  }
}
```

## Usage Patterns - **Dependency Injection**

### Service Injection

**Proper NestJS Pattern**:

```typescript
@Injectable()
export class YourService {
  constructor(
    private readonly networkConfig: NetworkConfigService,
    private readonly subgraphService: SubgraphService,
    private readonly databaseService: DatabaseLifecycleService
  ) {}

  async initialize() {
    // Use injected configuration services
    const networkInfo = this.networkConfig.getNetworkInfo(Network.ETHEREUM);
    const isHealthy = await this.databaseService.isHealthy();
  }
}
```

### Configuration Validation

**Startup Validation** with class-validator:

```typescript
// Automatic validation on application startup
// Type-safe configuration with proper error messages
// Environment-specific validation rules
```

*Configuration Guide - Updated: 2025-09-21*
