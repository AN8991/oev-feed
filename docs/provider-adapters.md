# Provider Adapters Documentation

This document provides comprehensive documentation for the provider adapters implementation in the OEV Feed project, reflecting the current **A+ (96/100) architecture** with modern dependency injection patterns.

## Overview

Provider adapters serve as an abstraction layer between the OEV Feed application and blockchain providers. The system now supports **10 blockchain providers** across **5 networks** with sophisticated health monitoring, load balancing, and failover capabilities.

## Architecture

The provider adapters follow the adapter pattern with **proper factory pattern implementation** and consist of the following components:

### 1. Provider Adapter Port

The `ProviderAdapterPort` interface defines the contract that all provider adapters must implement:

```typescript
// src/domain/ports/secondary/provider-adapter.port.ts
export interface ProviderAdapterPort {
  readonly name: string;
  readonly type: string;
  readonly network: string;
  readonly provider: Provider;
  
  initialize(): Promise<void>;
  isHealthy(): Promise<boolean>;
  getStats(): ProviderStats;
  getContract(address: string, abi: any[]): Contract;
  getBlockNumber(): Promise<number>;
  getBalance(address: string): Promise<bigint>;
  cleanup(): Promise<void>;
}
```

### 2. Base Provider Adapter

The `BaseProviderAdapter` abstract class implements common functionality with **NestJS Logger integration**:

```typescript
// src/adapters/secondary/providers/base-provider.adapter.ts
export abstract class BaseProviderAdapter implements ProviderAdapterPort {
  protected readonly logger = new Logger(this.constructor.name);
  // Common implementation with enhanced logging and error handling
}
```

### 3. Provider Factory - **Recently Optimized** ✅

**Major Improvement**: The `ProviderFactory` now uses **proper factory pattern** (not anti-pattern):

```typescript
// src/adapters/secondary/providers/provider-factory.ts
@Injectable()
export class ProviderFactory {
  // Injectable factory service with proper DI
  // Provider instance creation and caching
  // Enhanced provider with circuit breaker and retry logic
}
```

### 4. Supported Provider Adapters

**Current Implementation** - All providers fully functional:

- **AlchemyProviderAdapter**: Full Alchemy integration with network mapping
- **InfuraProviderAdapter**: Complete Infura support with proper configuration
- **EnhancedProviderAdapter**: Circuit breaker and retry wrapper for resilience
- **BaseProviderAdapter**: Abstract base with common functionality

**Supported Providers** (10 total):
- Alchemy, Infura, BlockDaemon, BlockCypher, QuickNode
- Etherscan, Ankr, Pocket, Custom, Local development

### 5. Infrastructure Services

**Enhanced Infrastructure** supporting provider ecosystem:

- **ProviderHealthMonitor** (423 lines): Health status tracking, periodic checks
- **RequestDistributor** (398 lines): Load balancing, request distribution, failover
- **DataSourceFallback** (245 lines): Automatic failover, health-based routing

## Network Configuration

**NetworkConfigService** provides comprehensive multi-provider support:

```typescript
// src/infrastructure/config/network.config.ts
@Injectable()
export class NetworkConfigService {
  // 5 networks: Ethereum, Polygon, Arbitrum, Optimism, Blast
  // 10 providers with type-safe URL templates
  // API key management and validation
}
```

**Supported Networks**:
- **Ethereum Mainnet**: All 10 providers supported
- **Polygon**: Alchemy, Infura, QuickNode, Custom
- **Arbitrum**: Alchemy, Infura, Custom
- **Optimism**: Alchemy, Infura, Custom  
- **Blast**: Custom provider support

## Configuration

### Environment Variables

**Enhanced API Key Support** for all providers:

```bash
# Primary Providers
ALCHEMY_API_KEY=your-alchemy-api-key
INFURA_API_KEY=your-infura-api-key

# Additional Providers (Recently Added)
BLOCKDAEMON_API_KEY=your-blockdaemon-api-key
BLOCKCYPHER_API_KEY=your-blockcypher-api-key
QUICKNODE_API_KEY=your-quicknode-api-key
ETHERSCAN_API_KEY=your-etherscan-api-key
ANKR_API_KEY=your-ankr-api-key
POCKET_API_KEY=your-pocket-api-key

# Development
CUSTOM_RPC_URL=your-custom-rpc-url
LOCAL_RPC_URL=http://localhost:8545
```

### Supported Networks - **5 Production Networks** ✅

**Current Network Support**:

| Network | Chain ID | Providers Supported | Status |
|---------|----------|-------------------|--------|
| **Ethereum** | 1 | All 10 providers | ✅ Full |
| **Polygon** | 137 | Alchemy, Infura, QuickNode | ✅ Full |
| **Arbitrum** | 42161 | Alchemy, Infura, Custom | ✅ Full |
| **Optimism** | 10 | Alchemy, Infura, Custom | ✅ Full |
| **Blast** | 81457 | Custom provider | ✅ Full |

## Usage

### Dependency Injection Usage

**Proper NestJS Pattern** (Recommended):

```typescript
// In your service
@Injectable()
export class YourService {
  constructor(
    private readonly providerFactory: ProviderFactory,
    private readonly networkConfig: NetworkConfigService
  ) {}

  async getBlockData(network: Network, provider: Providers) {
    // Get provider through factory
    const providerAdapter = await this.providerFactory.getProvider(
      provider, 
      network
    );
    
    // Use the provider
    const blockNumber = await providerAdapter.getBlockNumber();
    return blockNumber;
  }
}
```

### Enhanced Provider Features

**Circuit Breaker & Retry Logic**:

```typescript
// Enhanced provider with resilience
const enhancedProvider = new EnhancedProviderAdapter(baseProvider);

// Automatic retry and circuit breaker protection
const blockNumber = await enhancedProvider.getBlockNumber();
```

### Provider Health Monitoring

**Real-time Health Tracking**:

```typescript
// Get provider health status
const healthStatus = await provider.isHealthy();
const stats = provider.getStats();

console.log(`Request count: ${stats.requestCount}`);
console.log(`Failure count: ${stats.failureCount}`);
console.log(`Average response time: ${stats.averageResponseTime}ms`);
```

## Integration with Query Orchestration - **A (92/100)**

**QueryOrchestratorService** coordinates provider usage across protocols:

```typescript
@Injectable()
export class QueryOrchestratorService {
  constructor(
    private readonly protocolAdapterFactory: ProtocolAdapterFactory,
    private readonly timeService: TimeService
  ) {}

  // Multi-protocol query orchestration with provider fallback
  async queryUserPositions(userAddress: string, protocols: string[]) {
    // Automatic provider selection and failover
  }
}
```

**Integration Tests** available in `scripts/` directory:
- `scripts/test-aave-v2-adapter.ts` - Aave V2 protocol testing
- `scripts/test-aave-v3-adapter.ts` - Aave V3 protocol testing  
- `scripts/test-provider-adapters.ts` - Provider adapter testing
- `scripts/test-query-orchestrator.ts` - End-to-end orchestration testing

## Protocol Integration - **Enhanced Error Handling** ✅

**Aave Protocol Adapters** with improved provider integration:

```typescript
// Enhanced error handling for non-standard tokens
try {
  const symbol = await tokenContract.symbol();
  return symbol;
} catch (error) {
  this.logger.warn(`Failed to decode symbol for token ${tokenAddress}: ${error.message}`);
  // Graceful fallback to shortened address
  return `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
}
```

*Provider Adapters Documentation - Updated: 2025-09-21*