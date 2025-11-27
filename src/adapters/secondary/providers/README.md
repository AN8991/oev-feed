# Provider Adapters

This directory contains the implementation of blockchain provider adapters for the OEV Feed project. These adapters provide a unified interface for interacting with different blockchain provider services.

## Architecture

The provider adapters follow the adapter pattern with **proper NestJS dependency injection**:

- `provider-adapter.port.ts`: Defines the contract for provider adapters
- `base-provider.adapter.ts`: Base implementation with common functionality
- `alchemy-provider.adapter.ts`: Alchemy-specific provider implementation
- `infura-provider.adapter.ts`: Infura-specific provider implementation
- `provider-factory.ts`: Injectable factory for creating and managing provider instances

## Features

- **Provider Abstraction**: Unified interface for different blockchain providers
- **Automatic Fallback**: Automatic fallback to alternative providers if one fails
- **Provider Health Monitoring**: Track provider health and performance
- **Rate Limit Tracking**: Monitor API rate limits to avoid service disruptions
- **Smart Provider Selection**: Select the best provider based on health, performance, and rate limits
- **10 Provider Support**: Alchemy, Infura, Ankr, QuickNode, BlockDaemon, and much more

## Usage

### Modern Usage (Dependency Injection)

```typescript
import { Injectable } from '@nestjs/common';
import { ProviderFactory } from '@adapters/secondary/providers/provider-factory';
import { NetworkConfigService } from '@infrastructure/config/network.config';
import { Network } from '@domain/enums/networks.enum';
import { Providers } from '@domain/enums/providers.enum';

@Injectable()
export class YourService {
  constructor(
    private readonly providerFactory: ProviderFactory,
    private readonly networkConfig: NetworkConfigService
  ) {}

  async getBlockData(network: Network) {
    // Get provider through factory
    const provider = await this.providerFactory.getProvider(
      Providers.ALCHEMY,
      network
    );
    
    // Use the provider
    const blockNumber = await provider.getBlockNumber();
    return blockNumber;
  }
}
```

### Configuration

Provider configuration is managed by **NetworkConfigService** (consolidated from the legacy ProviderConfigService):

```typescript
// NetworkConfigService provides:
// - Rate limits, timeouts, retries per provider
// - Provider priority for fallback
// - API key management
// - Network-specific configurations

const config = this.networkConfig.getProviderConfig(Network.ETHEREUM, Providers.ALCHEMY);
const rateLimit = this.networkConfig.getRateLimit(Network.ETHEREUM, Providers.ALCHEMY);
const priority = this.networkConfig.getProviderPriority(Network.ETHEREUM, Providers.ALCHEMY);
```

## Environment Variables

Provider adapters require API keys to be set in environment variables:

```bash
# Primary Providers
ALCHEMY_API_KEY=your-alchemy-key
INFURA_API_KEY=your-infura-key

# Additional Providers
ANKR_API_KEY=your-ankr-key
QUICKNODE_API_KEY=your-quicknode-key
BLOCKDAEMON_API_KEY=your-blockdaemon-key
BLOCKCYPHER_API_KEY=your-blockcypher-key
ETHERSCAN_API_KEY=your-etherscan-key
POCKET_API_KEY=your-pocket-key

# Development
CUSTOM_RPC_URL=your-custom-rpc
LOCAL_RPC_URL=http://localhost:8545
```

## Supported Networks

| Network | Chain ID | Providers Supported |
|---------|----------|---------------------|
| Ethereum | 1 | All 10 providers |
| Polygon | 137 | Alchemy, Infura, QuickNode |
| Arbitrum | 42161 | Alchemy, Infura, Custom |
| Optimism | 10 | Alchemy, Infura, Custom |
| Blast | 81457 | Custom provider |

## Testing

```bash
# Run the provider adapters test
npx ts-node -r tsconfig-paths/register scripts/infrastructure/test-provider-adapters.ts

# Run the provider config test
npx ts-node -r tsconfig-paths/register scripts/infrastructure/test-provider-config.ts
```
