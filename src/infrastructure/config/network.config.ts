/**
 * Network Configuration Service
 * 
 * Part of the infrastructure layer in hexagonal architecture
 * Handles network-specific configuration including RPC URLs, WebSocket connections,
 * and provider-specific settings for all supported networks and providers.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Network, NetworkInfo, NETWORK_INFO } from '../../domain/types/networks';
import { Providers } from '../../domain/enums/providers.enum';

/**
 * Complete network configuration including infrastructure details
 */
export interface NetworkConfig extends NetworkInfo {
  rpcUrl: string;
  wsUrl?: string;
  provider: Providers;
}

/**
 * Provider URL templates for different networks
 */
interface ProviderUrlConfig {
  httpTemplate: string;
  wsTemplate: string;
  apiKeyEnvVar: string;
}

@Injectable()
export class NetworkConfigService {
  private readonly logger = new Logger(NetworkConfigService.name);

  /**
   * Provider URL configurations for all supported providers
   */
  private readonly providerConfigs: Record<Providers, Record<Network, ProviderUrlConfig>> = {
    [Providers.ALCHEMY]: {
      [Network.ETHEREUM]: {
        httpTemplate: 'https://eth-mainnet.g.alchemy.com/v2/{apiKey}',
        wsTemplate: 'wss://eth-mainnet.g.alchemy.com/v2/{apiKey}',
        apiKeyEnvVar: 'ALCHEMY_API_KEY'
      },
      [Network.POLYGON]: {
        httpTemplate: 'https://polygon-mainnet.g.alchemy.com/v2/{apiKey}',
        wsTemplate: 'wss://polygon-mainnet.g.alchemy.com/v2/{apiKey}',
        apiKeyEnvVar: 'ALCHEMY_API_KEY'
      },
      [Network.ARBITRUM]: {
        httpTemplate: 'https://arb-mainnet.g.alchemy.com/v2/{apiKey}',
        wsTemplate: 'wss://arb-mainnet.g.alchemy.com/v2/{apiKey}',
        apiKeyEnvVar: 'ALCHEMY_API_KEY'
      },
      [Network.OPTIMISM]: {
        httpTemplate: 'https://opt-mainnet.g.alchemy.com/v2/{apiKey}',
        wsTemplate: 'wss://opt-mainnet.g.alchemy.com/v2/{apiKey}',
        apiKeyEnvVar: 'ALCHEMY_API_KEY'
      },
      [Network.BLAST]: {
        httpTemplate: 'https://blast-mainnet.g.alchemy.com/v2/{apiKey}',
        wsTemplate: 'wss://blast-mainnet.g.alchemy.com/v2/{apiKey}',
        apiKeyEnvVar: 'ALCHEMY_API_KEY'
      }
    },
    [Providers.INFURA]: {
      [Network.ETHEREUM]: {
        httpTemplate: 'https://mainnet.infura.io/v3/{apiKey}',
        wsTemplate: 'wss://mainnet.infura.io/ws/v3/{apiKey}',
        apiKeyEnvVar: 'INFURA_API_KEY'
      },
      [Network.POLYGON]: {
        httpTemplate: 'https://polygon-mainnet.infura.io/v3/{apiKey}',
        wsTemplate: 'wss://polygon-mainnet.infura.io/ws/v3/{apiKey}',
        apiKeyEnvVar: 'INFURA_API_KEY'
      },
      [Network.ARBITRUM]: {
        httpTemplate: 'https://arbitrum-mainnet.infura.io/v3/{apiKey}',
        wsTemplate: 'wss://arbitrum-mainnet.infura.io/ws/v3/{apiKey}',
        apiKeyEnvVar: 'INFURA_API_KEY'
      },
      [Network.OPTIMISM]: {
        httpTemplate: 'https://optimism-mainnet.infura.io/v3/{apiKey}',
        wsTemplate: 'wss://optimism-mainnet.infura.io/ws/v3/{apiKey}',
        apiKeyEnvVar: 'INFURA_API_KEY'
      },
      [Network.BLAST]: {
        httpTemplate: 'https://blast-mainnet.infura.io/v3/{apiKey}',
        wsTemplate: 'wss://blast-mainnet.infura.io/ws/v3/{apiKey}',
        apiKeyEnvVar: 'INFURA_API_KEY'
      }
    },
    [Providers.BLOCKDAEMON]: {
      [Network.ETHEREUM]: {
        httpTemplate: 'https://svc.blockdaemon.com/ethereum/mainnet/native?apikey={apiKey}',
        wsTemplate: 'wss://svc.blockdaemon.com/ethereum/mainnet/native/ws?apikey={apiKey}',
        apiKeyEnvVar: 'BLOCKDAEMON_API_KEY'
      },
      [Network.POLYGON]: {
        httpTemplate: 'https://svc.blockdaemon.com/polygon/mainnet/native?apikey={apiKey}',
        wsTemplate: 'wss://svc.blockdaemon.com/polygon/mainnet/native/ws?apikey={apiKey}',
        apiKeyEnvVar: 'BLOCKDAEMON_API_KEY'
      },
      [Network.ARBITRUM]: {
        httpTemplate: 'https://svc.blockdaemon.com/arbitrum/mainnet/native?apikey={apiKey}',
        wsTemplate: 'wss://svc.blockdaemon.com/arbitrum/mainnet/native/ws?apikey={apiKey}',
        apiKeyEnvVar: 'BLOCKDAEMON_API_KEY'
      },
      [Network.OPTIMISM]: {
        httpTemplate: 'https://svc.blockdaemon.com/optimism/mainnet/native?apikey={apiKey}',
        wsTemplate: 'wss://svc.blockdaemon.com/optimism/mainnet/native/ws?apikey={apiKey}',
        apiKeyEnvVar: 'BLOCKDAEMON_API_KEY'
      },
      [Network.BLAST]: {
        httpTemplate: 'https://svc.blockdaemon.com/blast/mainnet/native?apikey={apiKey}',
        wsTemplate: 'wss://svc.blockdaemon.com/blast/mainnet/native/ws?apikey={apiKey}',
        apiKeyEnvVar: 'BLOCKDAEMON_API_KEY'
      }
    },
    [Providers.BLOCKCYPHER]: {
      [Network.ETHEREUM]: {
        httpTemplate: 'https://api.blockcypher.com/v1/eth/main?token={apiKey}',
        wsTemplate: 'wss://socket.blockcypher.com/v1/eth/main?token={apiKey}',
        apiKeyEnvVar: 'BLOCKCYPHER_API_KEY'
      },
      [Network.POLYGON]: {
        httpTemplate: 'https://api.blockcypher.com/v1/matic/main?token={apiKey}',
        wsTemplate: 'wss://socket.blockcypher.com/v1/matic/main?token={apiKey}',
        apiKeyEnvVar: 'BLOCKCYPHER_API_KEY'
      },
      [Network.ARBITRUM]: {
        httpTemplate: 'https://api.blockcypher.com/v1/arb/main?token={apiKey}',
        wsTemplate: 'wss://socket.blockcypher.com/v1/arb/main?token={apiKey}',
        apiKeyEnvVar: 'BLOCKCYPHER_API_KEY'
      },
      [Network.OPTIMISM]: {
        httpTemplate: 'https://api.blockcypher.com/v1/opt/main?token={apiKey}',
        wsTemplate: 'wss://socket.blockcypher.com/v1/opt/main?token={apiKey}',
        apiKeyEnvVar: 'BLOCKCYPHER_API_KEY'
      },
      [Network.BLAST]: {
        httpTemplate: 'https://api.blockcypher.com/v1/blast/main?token={apiKey}',
        wsTemplate: 'wss://socket.blockcypher.com/v1/blast/main?token={apiKey}',
        apiKeyEnvVar: 'BLOCKCYPHER_API_KEY'
      }
    },
    [Providers.QUICKNODE]: {
      [Network.ETHEREUM]: {
        httpTemplate: 'https://ethereum-mainnet.core.chainstack.com/{apiKey}',
        wsTemplate: 'wss://ethereum-mainnet.core.chainstack.com/{apiKey}',
        apiKeyEnvVar: 'QUICKNODE_API_KEY'
      },
      [Network.POLYGON]: {
        httpTemplate: 'https://polygon-mainnet.core.chainstack.com/{apiKey}',
        wsTemplate: 'wss://polygon-mainnet.core.chainstack.com/{apiKey}',
        apiKeyEnvVar: 'QUICKNODE_API_KEY'
      },
      [Network.ARBITRUM]: {
        httpTemplate: 'https://arbitrum-mainnet.core.chainstack.com/{apiKey}',
        wsTemplate: 'wss://arbitrum-mainnet.core.chainstack.com/{apiKey}',
        apiKeyEnvVar: 'QUICKNODE_API_KEY'
      },
      [Network.OPTIMISM]: {
        httpTemplate: 'https://optimism-mainnet.core.chainstack.com/{apiKey}',
        wsTemplate: 'wss://optimism-mainnet.core.chainstack.com/{apiKey}',
        apiKeyEnvVar: 'QUICKNODE_API_KEY'
      },
      [Network.BLAST]: {
        httpTemplate: 'https://blast-mainnet.core.chainstack.com/{apiKey}',
        wsTemplate: 'wss://blast-mainnet.core.chainstack.com/{apiKey}',
        apiKeyEnvVar: 'QUICKNODE_API_KEY'
      }
    },
    [Providers.ETHERSCAN]: {
      [Network.ETHEREUM]: {
        httpTemplate: 'https://api.etherscan.io/api?apikey={apiKey}',
        wsTemplate: '', // Etherscan doesn't provide WebSocket
        apiKeyEnvVar: 'ETHERSCAN_API_KEY'
      },
      [Network.POLYGON]: {
        httpTemplate: 'https://api.polygonscan.com/api?apikey={apiKey}',
        wsTemplate: '',
        apiKeyEnvVar: 'ETHERSCAN_API_KEY'
      },
      [Network.ARBITRUM]: {
        httpTemplate: 'https://api.arbiscan.io/api?apikey={apiKey}',
        wsTemplate: '',
        apiKeyEnvVar: 'ETHERSCAN_API_KEY'
      },
      [Network.OPTIMISM]: {
        httpTemplate: 'https://api-optimistic.etherscan.io/api?apikey={apiKey}',
        wsTemplate: '',
        apiKeyEnvVar: 'ETHERSCAN_API_KEY'
      },
      [Network.BLAST]: {
        httpTemplate: 'https://api.blastscan.io/api?apikey={apiKey}',
        wsTemplate: '',
        apiKeyEnvVar: 'ETHERSCAN_API_KEY'
      }
    },
    [Providers.ANKR]: {
      [Network.ETHEREUM]: {
        httpTemplate: 'https://rpc.ankr.com/eth/{apiKey}',
        wsTemplate: 'wss://rpc.ankr.com/eth/ws/{apiKey}',
        apiKeyEnvVar: 'ANKR_API_KEY'
      },
      [Network.POLYGON]: {
        httpTemplate: 'https://rpc.ankr.com/polygon/{apiKey}',
        wsTemplate: 'wss://rpc.ankr.com/polygon/ws/{apiKey}',
        apiKeyEnvVar: 'ANKR_API_KEY'
      },
      [Network.ARBITRUM]: {
        httpTemplate: 'https://rpc.ankr.com/arbitrum/{apiKey}',
        wsTemplate: 'wss://rpc.ankr.com/arbitrum/ws/{apiKey}',
        apiKeyEnvVar: 'ANKR_API_KEY'
      },
      [Network.OPTIMISM]: {
        httpTemplate: 'https://rpc.ankr.com/optimism/{apiKey}',
        wsTemplate: 'wss://rpc.ankr.com/optimism/ws/{apiKey}',
        apiKeyEnvVar: 'ANKR_API_KEY'
      },
      [Network.BLAST]: {
        httpTemplate: 'https://rpc.ankr.com/blast/{apiKey}',
        wsTemplate: 'wss://rpc.ankr.com/blast/ws/{apiKey}',
        apiKeyEnvVar: 'ANKR_API_KEY'
      }
    },
    [Providers.POCKET]: {
      [Network.ETHEREUM]: {
        httpTemplate: 'https://eth-mainnet.gateway.pokt.network/v1/lb/{apiKey}',
        wsTemplate: 'wss://eth-mainnet.gateway.pokt.network/v1/lb/{apiKey}',
        apiKeyEnvVar: 'POCKET_API_KEY'
      },
      [Network.POLYGON]: {
        httpTemplate: 'https://poly-mainnet.gateway.pokt.network/v1/lb/{apiKey}',
        wsTemplate: 'wss://poly-mainnet.gateway.pokt.network/v1/lb/{apiKey}',
        apiKeyEnvVar: 'POCKET_API_KEY'
      },
      [Network.ARBITRUM]: {
        httpTemplate: 'https://arbitrum-one.gateway.pokt.network/v1/lb/{apiKey}',
        wsTemplate: 'wss://arbitrum-one.gateway.pokt.network/v1/lb/{apiKey}',
        apiKeyEnvVar: 'POCKET_API_KEY'
      },
      [Network.OPTIMISM]: {
        httpTemplate: 'https://optimism-mainnet.gateway.pokt.network/v1/lb/{apiKey}',
        wsTemplate: 'wss://optimism-mainnet.gateway.pokt.network/v1/lb/{apiKey}',
        apiKeyEnvVar: 'POCKET_API_KEY'
      },
      [Network.BLAST]: {
        httpTemplate: 'https://blast-mainnet.gateway.pokt.network/v1/lb/{apiKey}',
        wsTemplate: 'wss://blast-mainnet.gateway.pokt.network/v1/lb/{apiKey}',
        apiKeyEnvVar: 'POCKET_API_KEY'
      }
    },
    [Providers.CUSTOM]: {
      [Network.ETHEREUM]: {
        httpTemplate: '{apiKey}', // Custom URL provided directly as apiKey
        wsTemplate: '',
        apiKeyEnvVar: 'CUSTOM_ETHEREUM_RPC_URL'
      },
      [Network.POLYGON]: {
        httpTemplate: '{apiKey}',
        wsTemplate: '',
        apiKeyEnvVar: 'CUSTOM_POLYGON_RPC_URL'
      },
      [Network.ARBITRUM]: {
        httpTemplate: '{apiKey}',
        wsTemplate: '',
        apiKeyEnvVar: 'CUSTOM_ARBITRUM_RPC_URL'
      },
      [Network.OPTIMISM]: {
        httpTemplate: '{apiKey}',
        wsTemplate: '',
        apiKeyEnvVar: 'CUSTOM_OPTIMISM_RPC_URL'
      },
      [Network.BLAST]: {
        httpTemplate: '{apiKey}',
        wsTemplate: '',
        apiKeyEnvVar: 'CUSTOM_BLAST_RPC_URL'
      }
    },
    [Providers.LOCAL]: {
      [Network.ETHEREUM]: {
        httpTemplate: 'http://localhost:8545',
        wsTemplate: 'ws://localhost:8546',
        apiKeyEnvVar: 'LOCAL_NODE_ENABLED' // Just a flag to enable local node
      },
      [Network.POLYGON]: {
        httpTemplate: 'http://localhost:8547',
        wsTemplate: 'ws://localhost:8548',
        apiKeyEnvVar: 'LOCAL_NODE_ENABLED'
      },
      [Network.ARBITRUM]: {
        httpTemplate: 'http://localhost:8549',
        wsTemplate: 'ws://localhost:8550',
        apiKeyEnvVar: 'LOCAL_NODE_ENABLED'
      },
      [Network.OPTIMISM]: {
        httpTemplate: 'http://localhost:8551',
        wsTemplate: 'ws://localhost:8552',
        apiKeyEnvVar: 'LOCAL_NODE_ENABLED'
      },
      [Network.BLAST]: {
        httpTemplate: 'http://localhost:8553',
        wsTemplate: 'ws://localhost:8554',
        apiKeyEnvVar: 'LOCAL_NODE_ENABLED'
      }
    }
  };

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get network information (domain data only)
   */
  getNetworkInfo(network: Network): NetworkInfo {
    return NETWORK_INFO[network];
  }

  /**
   * Get complete network configuration including RPC URLs
   */
  getNetworkConfig(network: Network, provider: Providers = Providers.INFURA): NetworkConfig {
    const networkInfo = this.getNetworkInfo(network);
    const providerConfig = this.providerConfigs[provider]?.[network];

    if (!providerConfig) {
      throw new Error(`Provider ${provider} is not supported for network ${network}`);
    }

    const apiKey = this.configService.get<string>(providerConfig.apiKeyEnvVar);
    if (!apiKey) {
      throw new Error(`API key not found for ${provider}. Please set ${providerConfig.apiKeyEnvVar} environment variable.`);
    }

    const rpcUrl = providerConfig.httpTemplate.replace('{apiKey}', apiKey);
    const wsUrl = providerConfig.wsTemplate ? providerConfig.wsTemplate.replace('{apiKey}', apiKey) : undefined;

    return {
      ...networkInfo,
      rpcUrl,
      wsUrl,
      provider
    };
  }

  /**
   * Get all supported networks
   */
  getSupportedNetworks(): Network[] {
    return Object.values(Network);
  }

  /**
   * Get all supported providers for a network
   */
  getSupportedProviders(network: Network): Providers[] {
    return Object.keys(this.providerConfigs)
      .filter(provider => this.providerConfigs[provider as Providers][network])
      .map(provider => provider as Providers);
  }

  /**
   * Check if a network-provider combination is supported
   */
  isSupported(network: Network, provider: Providers): boolean {
    return !!(this.providerConfigs[provider]?.[network]);
  }

  /**
   * Get fallback RPC URL from environment variables (for custom configurations)
   */
  getFallbackRpcUrl(network: Network): string | undefined {
    const envKey = `${network.toUpperCase()}_RPC_URL`;
    return this.configService.get<string>(envKey);
  }
}
