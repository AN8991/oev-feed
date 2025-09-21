/// <reference types="node" />
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validate } from 'class-validator';
import { Providers } from '@/domain/enums/providers.enum';

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  /**
   * API key for the provider
   */
  apiKey: string;
  
  /**
   * Base URL for the provider (optional)
   */
  baseUrl?: string;
  
  /**
   * Rate limit configuration (optional)
   */
  rateLimit?: {
    /**
     * Maximum number of requests per time window
     */
    limit: number;
    
    /**
     * Time window in milliseconds
     */
    window: number;
  };
  
  /**
   * Timeout in milliseconds (optional)
   */
  timeout?: number;
  
  /**
   * Maximum number of retries (optional)
   */
  maxRetries?: number;
  
  /**
   * Additional provider-specific options (optional)
   */
  options?: Record<string, any>;
}

/**
 * Network configuration interface
 */
export interface NetworkConfig {
  /**
   * Network name
   */
  name: string;
  
  /**
   * Network aliases
   */
  aliases: string[];
  
  /**
   * Chain ID
   */
  chainId: number;
  
  /**
   * Network-specific provider configurations
   */
  providers: Partial<Record<Providers, ProviderConfig>>;
  
  /**
   * Default provider type for this network
   */
  defaultProvider?: Providers;
}

/**
 * Global provider configuration interface
 */
export interface GlobalProviderConfig {
  /**
   * Default provider type
   */
  defaultProviderType: Providers;
  
  /**
   * Provider priority for fallback
   */
  providerPriority: Providers[];
  
  /**
   * Default timeout in milliseconds
   */
  defaultTimeout: number;
  
  /**
   * Default maximum number of retries
   */
  defaultMaxRetries: number;
  
  /**
   * Enable provider caching
   */
  enableCaching: boolean;
  
  /**
   * Cache TTL in milliseconds
   */
  cacheTtl: number;
  
  /**
   * Enable automatic fallback
   */
  enableFallback: boolean;
  
  /**
   * Enable health checks
   */
  enableHealthChecks: boolean;
  
  /**
   * Health check interval in milliseconds
   */
  healthCheckInterval: number;
}

/**
 * Provider configuration service
 */
@Injectable()
export class ProviderConfigService implements OnModuleInit {
  private readonly logger = new Logger(ProviderConfigService.name);
  
  private networks: Map<string, NetworkConfig> = new Map();
  private globalConfig: GlobalProviderConfig;
  
  constructor(private readonly configService: ConfigService) {
    // Initialize with default global configuration
    this.globalConfig = {
      defaultProviderType: Providers.ALCHEMY,
      providerPriority: [Providers.ALCHEMY, Providers.INFURA],
      defaultTimeout: 30000,
      defaultMaxRetries: 3,
      enableCaching: true,
      cacheTtl: 3600000, // 1 hour
      enableFallback: true,
      enableHealthChecks: true,
      healthCheckInterval: 300000, // 5 minutes
    };
    
    // Initialize with default network configurations
    this.initializeDefaultNetworks();
  }

  /**
   * Initialize module - validate configuration
   */
  async onModuleInit(): Promise<void> {
    this.loadFromEnv();
    this.logger.log('Provider configuration service initialized');
  }
  
  /**
   * Initialize default network configurations
   */
  private initializeDefaultNetworks(): void {
    // Ethereum Mainnet
    this.addNetwork({
      name: 'ethereum',
      aliases: ['mainnet'],
      chainId: 1,
      providers: {
        [Providers.ALCHEMY]: {
          apiKey: this.configService.get<string>('ALCHEMY_API_KEY', ''),
          baseUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
          rateLimit: {
            limit: 330,
            window: 60000, // 1 minute
          },
          timeout: 30000,
          maxRetries: 3,
        },
        [Providers.INFURA]: {
          apiKey: this.configService.get<string>('INFURA_API_KEY') || this.configService.get<string>('INFURA_PROJECT_ID', ''),
          baseUrl: 'https://mainnet.infura.io/v3/',
          rateLimit: {
            limit: 100,
            window: 60000, // 1 minute
          },
          timeout: 30000,
          maxRetries: 3,
          options: {
            projectSecret: this.configService.get<string>('INFURA_PROJECT_SECRET', ''),
          },
        },
      },
      defaultProvider: Providers.ALCHEMY,
    });
    
    // Ethereum Goerli
    this.addNetwork({
      name: 'goerli',
      aliases: ['ethereum-goerli'],
      chainId: 5,
      providers: {
        [Providers.ALCHEMY]: {
          apiKey: process.env.ALCHEMY_API_KEY || '',
          baseUrl: 'https://eth-goerli.g.alchemy.com/v2/',
          rateLimit: {
            limit: 330,
            window: 60000, // 1 minute
          },
        },
        [Providers.INFURA]: {
          apiKey: process.env.INFURA_API_KEY || process.env.INFURA_PROJECT_ID || '',
          baseUrl: 'https://goerli.infura.io/v3/',
          rateLimit: {
            limit: 100,
            window: 60000, // 1 minute
          },
          options: {
            projectSecret: process.env.INFURA_PROJECT_SECRET || '',
          },
        },
      },
    });
    
    // Ethereum Sepolia
    this.addNetwork({
      name: 'sepolia',
      aliases: ['ethereum-sepolia'],
      chainId: 11155111,
      providers: {
        [Providers.ALCHEMY]: {
          apiKey: process.env.ALCHEMY_API_KEY || '',
          baseUrl: 'https://eth-sepolia.g.alchemy.com/v2/',
          rateLimit: {
            limit: 330,
            window: 60000, // 1 minute
          },
        },
        [Providers.INFURA]: {
          apiKey: process.env.INFURA_API_KEY || process.env.INFURA_PROJECT_ID || '',
          baseUrl: 'https://sepolia.infura.io/v3/',
          rateLimit: {
            limit: 100,
            window: 60000, // 1 minute
          },
          options: {
            projectSecret: process.env.INFURA_PROJECT_SECRET || '',
          },
        },
      },
    });
    
    // Polygon Mainnet
    this.addNetwork({
      name: 'polygon',
      aliases: ['polygon-mainnet'],
      chainId: 137,
      providers: {
        [Providers.ALCHEMY]: {
          apiKey: process.env.ALCHEMY_API_KEY || '',
          baseUrl: 'https://polygon-mainnet.g.alchemy.com/v2/',
          rateLimit: {
            limit: 330,
            window: 60000, // 1 minute
          },
        },
        [Providers.INFURA]: {
          apiKey: process.env.INFURA_API_KEY || process.env.INFURA_PROJECT_ID || '',
          baseUrl: 'https://polygon-mainnet.infura.io/v3/',
          rateLimit: {
            limit: 100,
            window: 60000, // 1 minute
          },
          options: {
            projectSecret: process.env.INFURA_PROJECT_SECRET || '',
          },
        },
      },
    });
    
    // Polygon Mumbai
    this.addNetwork({
      name: 'polygon-mumbai',
      aliases: ['mumbai'],
      chainId: 80001,
      providers: {
        [Providers.ALCHEMY]: {
          apiKey: process.env.ALCHEMY_API_KEY || '',
          baseUrl: 'https://polygon-mumbai.g.alchemy.com/v2/',
          rateLimit: {
            limit: 330,
            window: 60000, // 1 minute
          },
        },
        [Providers.INFURA]: {
          apiKey: process.env.INFURA_API_KEY || process.env.INFURA_PROJECT_ID || '',
          baseUrl: 'https://polygon-mumbai.infura.io/v3/',
          rateLimit: {
            limit: 100,
            window: 60000, // 1 minute
          },
          options: {
            projectSecret: process.env.INFURA_PROJECT_SECRET || '',
          },
        },
      },
    });
    
    // Arbitrum Mainnet
    this.addNetwork({
      name: 'arbitrum',
      aliases: ['arbitrum-mainnet'],
      chainId: 42161,
      providers: {
        [Providers.ALCHEMY]: {
          apiKey: process.env.ALCHEMY_API_KEY || '',
          baseUrl: 'https://arb-mainnet.g.alchemy.com/v2/',
          rateLimit: {
            limit: 330,
            window: 60000, // 1 minute
          },
        },
        [Providers.INFURA]: {
          apiKey: process.env.INFURA_API_KEY || process.env.INFURA_PROJECT_ID || '',
          baseUrl: 'https://arbitrum-mainnet.infura.io/v3/',
          rateLimit: {
            limit: 100,
            window: 60000, // 1 minute
          },
          options: {
            projectSecret: process.env.INFURA_PROJECT_SECRET || '',
          },
        },
      },
    });
    
    // Optimism Mainnet
    this.addNetwork({
      name: 'optimism',
      aliases: ['optimism-mainnet'],
      chainId: 10,
      providers: {
        [Providers.ALCHEMY]: {
          apiKey: process.env.ALCHEMY_API_KEY || '',
          baseUrl: 'https://opt-mainnet.g.alchemy.com/v2/',
          rateLimit: {
            limit: 330,
            window: 60000, // 1 minute
          },
        },
        [Providers.INFURA]: {
          apiKey: process.env.INFURA_API_KEY || process.env.INFURA_PROJECT_ID || '',
          baseUrl: 'https://optimism-mainnet.infura.io/v3/',
          rateLimit: {
            limit: 100,
            window: 60000, // 1 minute
          },
          options: {
            projectSecret: process.env.INFURA_PROJECT_SECRET || '',
          },
        },
      },
    });
  }
  
  /**
   * Add or update a network configuration
   * @param network Network configuration
   */
  public addNetwork(network: NetworkConfig): void {
    this.networks.set(network.name, network);
    
    // Add aliases
    for (const alias of network.aliases) {
      this.networks.set(alias, network);
    }
  }
  
  /**
   * Get network configuration
   * @param networkName Network name or alias
   * @returns Network configuration or undefined if not found
   */
  public getNetwork(networkName: string): NetworkConfig | undefined {
    return this.networks.get(networkName.toLowerCase());
  }
  
  /**
   * Get provider configuration for a specific network and provider type
   * @param networkName Network name or alias
   * @param providerType Provider type
   * @returns Provider configuration or undefined if not found
   */
  public getProviderConfig(networkName: string, providerType?: Providers): ProviderConfig | undefined {
    const network = this.getNetwork(networkName);
    
    if (!network) {
      return undefined;
    }
    
    const type = providerType || network.defaultProvider || this.globalConfig.defaultProviderType;
    return network.providers[type];
  }
  
  /**
   * Get global provider configuration
   * @returns Global provider configuration
   */
  public getGlobalConfig(): GlobalProviderConfig {
    return { ...this.globalConfig };
  }
  
  /**
   * Update global provider configuration
   * @param config Partial global provider configuration
   */
  public updateGlobalConfig(config: Partial<GlobalProviderConfig>): void {
    this.globalConfig = {
      ...this.globalConfig,
      ...config,
    };
  }
  
  /**
   * Get provider priority
   * @returns Provider priority array
   */
  public getProviderPriority(): Providers[] {
    return [...this.globalConfig.providerPriority];
  }
  
  /**
   * Set provider priority
   * @param priority Provider priority array
   */
  public setProviderPriority(priority: Providers[]): void {
    this.globalConfig.providerPriority = [...priority];
  }
  
  /**
   * Get all supported networks
   * @returns Array of network configurations (without duplicates for aliases)
   */
  public getAllNetworks(): NetworkConfig[] {
    const uniqueNetworks = new Set<string>();
    const networks: NetworkConfig[] = [];
    
    for (const [name, network] of this.networks.entries()) {
      if (!uniqueNetworks.has(network.name)) {
        uniqueNetworks.add(network.name);
        networks.push(network);
      }
    }
    
    return networks;
  }
  
  /**
   * Get all network names
   * @returns Array of network names
   */
  public getNetworkNames(): string[] {
    const uniqueNetworks = new Set<string>();
    
    for (const network of this.getAllNetworks()) {
      uniqueNetworks.add(network.name);
    }
    
    return Array.from(uniqueNetworks);
  }
  
  /**
   * Check if a network is supported
   * @param networkName Network name or alias
   * @returns True if the network is supported, false otherwise
   */
  public isNetworkSupported(networkName: string): boolean {
    return this.networks.has(networkName.toLowerCase());
  }
  
  /**
   * Load configuration from environment variables
   */
  public loadFromEnv(): void {
    // Update global config from environment variables
    const defaultProviderType = this.configService.get<string>('DEFAULT_PROVIDER_TYPE');
    if (defaultProviderType) {
      this.globalConfig.defaultProviderType = defaultProviderType as Providers;
    }
    
    const providerPriority = this.configService.get<string>('PROVIDER_PRIORITY');
    if (providerPriority) {
      try {
        const priority = JSON.parse(providerPriority);
        if (Array.isArray(priority)) {
          this.globalConfig.providerPriority = priority;
        }
      } catch (error) {
        this.logger.warn('Invalid PROVIDER_PRIORITY format, using defaults');
      }
    }
    
    this.globalConfig.defaultTimeout = this.configService.get<number>('DEFAULT_TIMEOUT', this.globalConfig.defaultTimeout);
    this.globalConfig.defaultMaxRetries = this.configService.get<number>('DEFAULT_MAX_RETRIES', this.globalConfig.defaultMaxRetries);
    this.globalConfig.enableCaching = this.configService.get<string>('ENABLE_CACHING') === 'true';
    this.globalConfig.cacheTtl = this.configService.get<number>('CACHE_TTL', this.globalConfig.cacheTtl);
    this.globalConfig.enableFallback = this.configService.get<string>('ENABLE_FALLBACK') === 'true';
    this.globalConfig.enableHealthChecks = this.configService.get<string>('ENABLE_HEALTH_CHECKS') === 'true';
    this.globalConfig.healthCheckInterval = this.configService.get<number>('HEALTH_CHECK_INTERVAL', this.globalConfig.healthCheckInterval);
    
    // Update network configurations from environment variables
    for (const network of this.getAllNetworks()) {
      for (const providerType of Object.keys(network.providers) as Providers[]) {
        const envKeyPrefix = `${network.name.toUpperCase()}_${providerType.toUpperCase()}`;
        
        // Update API key
        const apiKeyEnvVar = `${envKeyPrefix}_API_KEY`;
        const apiKeyValue = this.configService.get<string>(apiKeyEnvVar);
        if (apiKeyValue) {
          const providerConfig = network.providers[providerType];
          if (providerConfig) {
            providerConfig.apiKey = apiKeyValue;
          }
        }
        
        // Update base URL
        const baseUrlEnvVar = `${envKeyPrefix}_BASE_URL`;
        const baseUrlValue = this.configService.get<string>(baseUrlEnvVar);
        if (baseUrlValue) {
          const providerConfig = network.providers[providerType];
          if (providerConfig) {
            providerConfig.baseUrl = baseUrlValue;
          }
        }
      }
    }
  }
  
  /**
   * Load configuration from a JSON file
   * @param configPath Path to the JSON configuration file
   */
  public loadFromFile(configPath: string): void {
    try {
      // Dynamic import to avoid bundling issues
      const fs = require('fs');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Update global config
      if (config.globalConfig) {
        this.updateGlobalConfig(config.globalConfig);
      }
      
      // Update network configs
      if (config.networks && Array.isArray(config.networks)) {
        for (const network of config.networks) {
          this.addNetwork(network);
        }
      }
    } catch (error) {
      this.logger.error('Error loading configuration from file:', error);
    }
  }
}
