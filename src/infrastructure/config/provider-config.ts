/// <reference types="node" />
import { ProviderType } from '../../adapters/secondary/providers/provider-factory';

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
  providers: Partial<Record<ProviderType, ProviderConfig>>;
  
  /**
   * Default provider type for this network
   */
  defaultProvider?: ProviderType;
}

/**
 * Global provider configuration interface
 */
export interface GlobalProviderConfig {
  /**
   * Default provider type
   */
  defaultProviderType: ProviderType;
  
  /**
   * Provider priority for fallback
   */
  providerPriority: ProviderType[];
  
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
export class ProviderConfigService {
  private static instance: ProviderConfigService;
  
  private networks: Map<string, NetworkConfig> = new Map();
  private globalConfig: GlobalProviderConfig;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize with default global configuration
    this.globalConfig = {
      defaultProviderType: ProviderType.ALCHEMY,
      providerPriority: [ProviderType.ALCHEMY, ProviderType.INFURA],
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
   * Get singleton instance
   */
  public static getInstance(): ProviderConfigService {
    if (!ProviderConfigService.instance) {
      ProviderConfigService.instance = new ProviderConfigService();
    }
    
    return ProviderConfigService.instance;
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
        [ProviderType.ALCHEMY]: {
          apiKey: process.env.ALCHEMY_API_KEY || '',
          baseUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
          rateLimit: {
            limit: 330,
            window: 60000, // 1 minute
          },
          timeout: 30000,
          maxRetries: 3,
        },
        [ProviderType.INFURA]: {
          apiKey: process.env.INFURA_API_KEY || process.env.INFURA_PROJECT_ID || '',
          baseUrl: 'https://mainnet.infura.io/v3/',
          rateLimit: {
            limit: 100,
            window: 60000, // 1 minute
          },
          timeout: 30000,
          maxRetries: 3,
          options: {
            projectSecret: process.env.INFURA_PROJECT_SECRET || '',
          },
        },
      },
      defaultProvider: ProviderType.ALCHEMY,
    });
    
    // Ethereum Goerli
    this.addNetwork({
      name: 'goerli',
      aliases: ['ethereum-goerli'],
      chainId: 5,
      providers: {
        [ProviderType.ALCHEMY]: {
          apiKey: process.env.ALCHEMY_API_KEY || '',
          baseUrl: 'https://eth-goerli.g.alchemy.com/v2/',
          rateLimit: {
            limit: 330,
            window: 60000, // 1 minute
          },
        },
        [ProviderType.INFURA]: {
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
        [ProviderType.ALCHEMY]: {
          apiKey: process.env.ALCHEMY_API_KEY || '',
          baseUrl: 'https://eth-sepolia.g.alchemy.com/v2/',
          rateLimit: {
            limit: 330,
            window: 60000, // 1 minute
          },
        },
        [ProviderType.INFURA]: {
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
        [ProviderType.ALCHEMY]: {
          apiKey: process.env.ALCHEMY_API_KEY || '',
          baseUrl: 'https://polygon-mainnet.g.alchemy.com/v2/',
          rateLimit: {
            limit: 330,
            window: 60000, // 1 minute
          },
        },
        [ProviderType.INFURA]: {
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
        [ProviderType.ALCHEMY]: {
          apiKey: process.env.ALCHEMY_API_KEY || '',
          baseUrl: 'https://polygon-mumbai.g.alchemy.com/v2/',
          rateLimit: {
            limit: 330,
            window: 60000, // 1 minute
          },
        },
        [ProviderType.INFURA]: {
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
        [ProviderType.ALCHEMY]: {
          apiKey: process.env.ALCHEMY_API_KEY || '',
          baseUrl: 'https://arb-mainnet.g.alchemy.com/v2/',
          rateLimit: {
            limit: 330,
            window: 60000, // 1 minute
          },
        },
        [ProviderType.INFURA]: {
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
        [ProviderType.ALCHEMY]: {
          apiKey: process.env.ALCHEMY_API_KEY || '',
          baseUrl: 'https://opt-mainnet.g.alchemy.com/v2/',
          rateLimit: {
            limit: 330,
            window: 60000, // 1 minute
          },
        },
        [ProviderType.INFURA]: {
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
  public getProviderConfig(networkName: string, providerType?: ProviderType): ProviderConfig | undefined {
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
  public getProviderPriority(): ProviderType[] {
    return [...this.globalConfig.providerPriority];
  }
  
  /**
   * Set provider priority
   * @param priority Provider priority array
   */
  public setProviderPriority(priority: ProviderType[]): void {
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
    if (process.env.DEFAULT_PROVIDER_TYPE) {
      this.globalConfig.defaultProviderType = process.env.DEFAULT_PROVIDER_TYPE as ProviderType;
    }
    
    if (process.env.PROVIDER_PRIORITY) {
      try {
        const priority = JSON.parse(process.env.PROVIDER_PRIORITY);
        if (Array.isArray(priority)) {
          this.globalConfig.providerPriority = priority;
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }
    
    if (process.env.DEFAULT_TIMEOUT) {
      const timeout = parseInt(process.env.DEFAULT_TIMEOUT, 10);
      if (!isNaN(timeout)) {
        this.globalConfig.defaultTimeout = timeout;
      }
    }
    
    if (process.env.DEFAULT_MAX_RETRIES) {
      const maxRetries = parseInt(process.env.DEFAULT_MAX_RETRIES, 10);
      if (!isNaN(maxRetries)) {
        this.globalConfig.defaultMaxRetries = maxRetries;
      }
    }
    
    if (process.env.ENABLE_CACHING) {
      this.globalConfig.enableCaching = process.env.ENABLE_CACHING === 'true';
    }
    
    if (process.env.CACHE_TTL) {
      const cacheTtl = parseInt(process.env.CACHE_TTL, 10);
      if (!isNaN(cacheTtl)) {
        this.globalConfig.cacheTtl = cacheTtl;
      }
    }
    
    if (process.env.ENABLE_FALLBACK) {
      this.globalConfig.enableFallback = process.env.ENABLE_FALLBACK === 'true';
    }
    
    if (process.env.ENABLE_HEALTH_CHECKS) {
      this.globalConfig.enableHealthChecks = process.env.ENABLE_HEALTH_CHECKS === 'true';
    }
    
    if (process.env.HEALTH_CHECK_INTERVAL) {
      const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL, 10);
      if (!isNaN(interval)) {
        this.globalConfig.healthCheckInterval = interval;
      }
    }
    
    // Update network configurations from environment variables
    for (const network of this.getAllNetworks()) {
      for (const providerType of Object.keys(network.providers) as ProviderType[]) {
        const envKeyPrefix = `${network.name.toUpperCase()}_${providerType.toUpperCase()}`;
        
        // Update API key
        const apiKeyEnvVar = `${envKeyPrefix}_API_KEY`;
        if (process.env[apiKeyEnvVar]) {
          const providerConfig = network.providers[providerType];
          if (providerConfig) {
            providerConfig.apiKey = process.env[apiKeyEnvVar] || '';
          }
        }
        
        // Update base URL
        const baseUrlEnvVar = `${envKeyPrefix}_BASE_URL`;
        if (process.env[baseUrlEnvVar]) {
          const providerConfig = network.providers[providerType];
          if (providerConfig) {
            providerConfig.baseUrl = process.env[baseUrlEnvVar];
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
      console.error('Error loading configuration from file:', error);
    }
  }
}
