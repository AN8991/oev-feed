# Provider Adapters Documentation

This document provides comprehensive documentation for the provider adapters implementation in the OEV Feed project.

## Overview

Provider adapters serve as an abstraction layer between the OEV Feed application and blockchain providers like Alchemy and Infura. They provide a unified interface for interacting with different blockchain networks and handle provider-specific details such as rate limiting, network mapping, and error handling.

## Architecture

The provider adapters follow the adapter pattern and consist of the following components:

### 1. Provider Adapter Port

The `ProviderAdapterPort` interface defines the contract that all provider adapters must implement. It specifies the methods and properties that are required for interacting with blockchain providers.

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

The `BaseProviderAdapter` abstract class implements common functionality for all provider adapters, such as initialization, health checking, and statistics tracking.

```typescript
// src/adapters/secondary/providers/base-provider.adapter.ts
export abstract class BaseProviderAdapter implements ProviderAdapterPort {
  // Common implementation for all provider adapters
}
```

### 3. Specific Provider Adapters

Specific provider adapters extend the base adapter and implement provider-specific logic:

- `AlchemyProviderAdapter`: Implements Alchemy-specific functionality
- `InfuraProviderAdapter`: Implements Infura-specific functionality

### 4. Provider Factory

The `ProviderFactory` class is responsible for creating and managing provider instances. It provides methods for getting providers, switching between providers, and selecting the best provider based on health and performance.

```typescript
// src/adapters/secondary/providers/provider-factory.ts
export class ProviderFactory {
  static getProvider(network: string, options?: {...}): Promise<ProviderAdapterPort>;
  static getBestProvider(network: string): Promise<ProviderAdapterPort>;
  static getAllProviders(network: string): Promise<Map<ProviderType, ProviderAdapterPort>>;
  // Other factory methods
}
```

## Importing Provider Adapters

- Use path aliases to import provider adapters directly from their concrete file.
- Do **not** use barrel files or index.ts for provider adapter imports.

**Example:**

```typescript
import { BlastProviderAdapter } from '@adapters/provider/blast-provider-adapter';
```

- This approach ensures clarity about the adapter's location and architectural layer.
- Avoid relative imports unless working within the same module.

## Configuration

### Environment Variables

Provider adapters require API keys to be set in environment variables:

```
# Alchemy API Key
ALCHEMY_API_KEY=your-alchemy-api-key

# Infura API Key (either use API key or project ID/secret)
INFURA_API_KEY=your-infura-api-key

# Alternatively, use Infura project ID and secret
INFURA_PROJECT_ID=your-infura-project-id
INFURA_PROJECT_SECRET=your-infura-project-secret
```

### Supported Networks

The provider adapters support the following networks:

| Network Name | Aliases |
|--------------|---------|
| Ethereum Mainnet | `ethereum`, `mainnet` |
| Ethereum Goerli | `goerli` |
| Ethereum Sepolia | `sepolia` |
| Polygon Mainnet | `polygon`, `polygon-mainnet` |
| Polygon Mumbai | `polygon-mumbai` |
| Arbitrum Mainnet | `arbitrum`, `arbitrum-mainnet` |
| Arbitrum Goerli | `arbitrum-goerli` |
| Optimism Mainnet | `optimism`, `optimism-mainnet` |
| Optimism Goerli | `optimism-goerli` |

## Usage Examples

### Basic Usage

```typescript
import { ProviderFactory } from '@adapters/secondary/providers/provider-factory';

// Get a provider for a specific network
const provider = await ProviderFactory.getProvider('ethereum');

// Use the provider
const blockNumber = await provider.getBlockNumber();
const balance = await provider.getBalance('0x...');

// Create a contract instance
const contract = provider.getContract(
  '0x...', // Contract address
  [...] // Contract ABI
);

// Call contract methods
const result = await contract.someMethod();
```

### Using Specific Provider Types

```typescript
import { ProviderFactory, ProviderType } from '@adapters/secondary/providers/provider-factory';

// Get a specific provider type
const alchemyProvider = await ProviderFactory.getProvider('ethereum', {
  type: ProviderType.ALCHEMY,
  fallback: false
});

// Get an Infura provider
const infuraProvider = await ProviderFactory.getProvider('ethereum', {
  type: ProviderType.INFURA,
  fallback: false
});
```

### Getting the Best Provider

```typescript
// Get the best provider based on health, performance, and rate limits
const bestProvider = await ProviderFactory.getBestProvider('ethereum');
```

### Setting Provider Priority

```typescript
// Set provider priority for fallback
ProviderFactory.setProviderPriority([ProviderType.ALCHEMY, ProviderType.INFURA]);
```

### Getting All Available Providers

```typescript
// Get all available providers for a network
const allProviders = await ProviderFactory.getAllProviders('ethereum');

// Use specific providers as needed
for (const [type, provider] of allProviders.entries()) {
  console.log(`Provider ${type}: ${provider.name}`);
}
```

### Provider Statistics

```typescript
// Get provider statistics
const stats = provider.getStats();

console.log(`Request count: ${stats.requestCount}`);
console.log(`Failure count: ${stats.failureCount}`);
console.log(`Average response time: ${stats.averageResponseTime}ms`);

// Check rate limit status if available
if (stats.rateLimitStatus) {
  console.log(`Rate limit: ${stats.rateLimitStatus.remaining}/${stats.rateLimitStatus.limit}`);
  console.log(`Reset time: ${new Date(stats.rateLimitStatus.resetTimestamp)}`);
}
```

## Integration with Protocol Adapters

Provider adapters can be integrated with protocol adapters to provide blockchain connectivity. Here's an example of how to use provider adapters in a protocol adapter:

```typescript
import { ProviderFactory } from '@adapters/secondary/providers/provider-factory';
import { normalizeAddress } from '@utils/address-utils';

class ProtocolAdapter {
  private readonly contractAddress: string;
  private readonly network: string;
  private provider: any;
  private contract: any;
  
  constructor(config: { contractAddress: string; network: string }) {
    this.contractAddress = normalizeAddress(config.contractAddress);
    this.network = config.network;
  }
  
  async initialize(): Promise<void> {
    // Get the best provider for the network
    this.provider = await ProviderFactory.getBestProvider(this.network);
    
    // Create contract instance
    this.contract = this.provider.getContract(
      this.contractAddress,
      [...] // ABI
    );
  }
  
  async getData(): Promise<any> {
    try {
      return await this.contract.someMethod();
    } catch (error) {
      // If provider fails, try with a different provider
      const alternativeProvider = await ProviderFactory.getProvider(this.network, {
        type: this.provider.type === 'alchemy' ? ProviderType.INFURA : ProviderType.ALCHEMY
      });
      
      // Create new contract with alternative provider
      const alternativeContract = alternativeProvider.getContract(
        this.contractAddress,
        [...] // ABI
      );
      
      // Try again with new provider
      return await alternativeContract.someMethod();
    }
  }
}
```

## Error Handling

Provider adapters include robust error handling to deal with common blockchain provider issues:

1. **Connection Errors**: If a provider fails to connect, the factory will automatically try alternative providers if fallback is enabled.

2. **Rate Limiting**: Provider adapters track rate limits and provide this information in the statistics.

3. **Network Issues**: If a network is temporarily unavailable, the provider will report as unhealthy and the factory will select an alternative provider.

Example of handling provider errors:

```typescript
try {
  const provider = await ProviderFactory.getProvider('ethereum', {
    fallback: true // Enable automatic fallback to alternative providers
  });
  
  const result = await provider.getBlockNumber();
} catch (error) {
  // This will only be thrown if all providers fail
  console.error('All providers failed:', error);
}
```

## Testing

The provider adapters include comprehensive unit and integration tests:

- **Unit Tests**: Test the functionality of provider adapters with mocked providers
- **Integration Tests**: Test the functionality of provider adapters with real blockchain providers

To run the tests:

```bash
# Run unit tests
npm test -- tests/adapters/secondary/providers/provider-adapters.test.ts

# Run integration tests (requires API keys)
npm test -- tests/adapters/secondary/providers/provider-adapters.integration.test.ts
```

## Best Practices

1. **Use the Provider Factory**: Always use the `ProviderFactory` to create and manage provider instances rather than creating them directly.

2. **Enable Fallback**: Enable fallback in production environments to ensure high availability.

3. **Monitor Provider Statistics**: Regularly check provider statistics to identify issues and optimize provider selection.

4. **Handle Provider Errors**: Implement proper error handling for provider operations, especially in critical paths.

5. **Clean Up Resources**: Call `cleanup()` when a provider is no longer needed to free up resources.

## Extending the System

### Adding a New Provider Type

To add a new provider type (e.g., QuickNode):

1. Create a new provider adapter class that extends `BaseProviderAdapter`
2. Implement provider-specific logic
3. Add the new provider type to the `ProviderType` enum
4. Update the `ProviderFactory` to support the new provider type

Example:

```typescript
// 1. Add to ProviderType enum
export enum ProviderType {
  ALCHEMY = 'alchemy',
  INFURA = 'infura',
  QUICKNODE = 'quicknode' // New provider type
}

// 2. Create new adapter class
export class QuickNodeProviderAdapter extends BaseProviderAdapter {
  // Implementation
}

// 3. Update factory
public static createProvider(type: ProviderType, config: ProviderConfig): ProviderAdapterPort {
  switch (type) {
    case ProviderType.ALCHEMY:
      return new AlchemyProviderAdapter(config);
    case ProviderType.INFURA:
      return new InfuraProviderAdapter(config);
    case ProviderType.QUICKNODE:
      return new QuickNodeProviderAdapter(config);
    default:
      throw new Error(`Unsupported provider type: ${type}`);
  }
}
```

## Conclusion

Provider adapters provide a flexible and robust way to interact with blockchain providers in the OEV Feed project. By abstracting provider-specific details and providing automatic fallback and provider selection, they help ensure high availability and optimal performance for blockchain operations.
