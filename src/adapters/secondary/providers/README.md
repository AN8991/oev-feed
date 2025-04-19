# Provider Adapters

This directory contains the implementation of blockchain provider adapters for the OEV Feed project. These adapters provide a unified interface for interacting with different blockchain provider services.

## Architecture

The provider adapters follow the adapter pattern and are structured as follows:

- `provider-adapter.port.ts`: Defines the contract for provider adapters
- `base-provider.adapter.ts`: Base implementation with common functionality
- `alchemy-provider.adapter.ts`: Alchemy-specific provider implementation
- `infura-provider.adapter.ts`: Infura-specific provider implementation
- `provider-factory.ts`: Factory for creating and managing provider instances

## Features

- **Provider Abstraction**: Unified interface for different blockchain providers
- **Automatic Fallback**: Automatic fallback to alternative providers if one fails
- **Provider Health Monitoring**: Track provider health and performance
- **Rate Limit Tracking**: Monitor API rate limits to avoid service disruptions
- **Smart Provider Selection**: Select the best provider based on health, performance, and rate limits

## Usage

### Basic Usage

```typescript
import { ProviderFactory } from './adapters/secondary/providers/provider-factory';

// Get a provider for a specific network
const provider = await ProviderFactory.getProvider('ethereum');

// Use the provider
const blockNumber = await provider.getBlockNumber();
const balance = await provider.getBalance('0x...');
```

### Advanced Usage

```typescript
import { ProviderFactory, ProviderType } from './adapters/secondary/providers/provider-factory';

// Get a specific provider type
const alchemyProvider = await ProviderFactory.getProvider('ethereum', {
  type: ProviderType.ALCHEMY,
  fallback: false
});

// Get the best provider based on health, performance, and rate limits
const bestProvider = await ProviderFactory.getBestProvider('ethereum');

// Get all available providers
const allProviders = await ProviderFactory.getAllProviders('ethereum');

// Set provider priority for fallback
ProviderFactory.setProviderPriority([ProviderType.ALCHEMY, ProviderType.INFURA]);

// Create a contract instance
const contract = provider.getContract(
  '0x...', // Contract address
  [...] // Contract ABI
);
```

## Configuration

Provider adapters require API keys to be set in environment variables:

- Alchemy: `ALCHEMY_API_KEY`
- Infura: `INFURA_API_KEY` or `INFURA_PROJECT_ID` and `INFURA_PROJECT_SECRET`

## Supported Networks

The provider adapters support the following networks:

- Ethereum: `ethereum`, `mainnet`
- Ethereum Testnets: `goerli`, `sepolia`
- Polygon: `polygon`, `polygon-mainnet`, `polygon-mumbai`
- Arbitrum: `arbitrum`, `arbitrum-mainnet`, `arbitrum-goerli`
- Optimism: `optimism`, `optimism-mainnet`, `optimism-goerli`

## Testing

A test script is provided to verify the functionality of the provider adapters:

```bash
# Run the test script
ts-node scripts/test-provider-adapters.ts
```

## Examples

See `src/examples/provider-adapter-usage.ts` for a complete example of how to use provider adapters in a protocol adapter.
