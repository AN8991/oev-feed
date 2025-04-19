import * as dotenv from 'dotenv';
import { join } from 'path';
import { z } from 'zod';

// Load environment variables from .env file in project root, fallback to process.cwd()
dotenv.config({ path: join(process.cwd(), '.env') });

// DEBUG: Print the DATABASE_URL and working directory before exporting config
console.log('DEBUG: process.env.DATABASE_URL =', process.env.DATABASE_URL);
console.log('DEBUG: process.cwd() =', process.cwd());

/**
 * Configuration schema using Zod for validation
 */
const ConfigSchema = z.object({
  environment: z.string().default('development'),
  logLevel: z.string().default('info'),
  database: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(5432),
    username: z.string().default('postgres'),
    password: z.string().default('postgres'),
    name: z.string().default('oev_feed'),
    synchronize: z.boolean().default(false),
    logging: z.boolean().default(false)
  }),
  providers: z.object({
    alchemy: z.object({
      apiKey: z.string().min(5, 'API key must be at least 5 characters long').default(''),
      networks: z.record(z.string()).default({}),
      rateLimit: z.number().default(100)
    }),
    infura: z.object({
      apiKey: z.string().min(5, 'API key must be at least 5 characters long').default(''),
      networks: z.record(z.string()).default({}),
      rateLimit: z.number().default(100)
    })
  }),
  metrics: z.object({
    enabled: z.boolean().default(false),
    port: z.number().default(9090)
  })
});

/**
 * Configuration type derived from the schema
 */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Unified Configuration Service
 * Combines features from the old config.ts and env.ts
 */
class ConfigService {
  private static instance: ConfigService;
  private config: Config;
  
  // API key validation regex patterns
  private apiKeyFormats: Record<string, RegExp> = {
    Alchemy: /^[A-Za-z0-9_-]{32}$/,  // 32 character alphanumeric key
    Infura: /^[0-9a-f]{32}$/,        // 32 character hexadecimal key
    Etherscan: /^[A-Z0-9]{10}$/,     // 10 character alphanumeric key
    GraphStudio: /^[A-Za-z0-9]{36}$/ // 36 character alphanumeric key
  };

  private constructor() {
    // Parse environment variables with validation
    this.config = this.parseConfig();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Parse and validate configuration from environment variables
   */
  private parseConfig(): Config {
    try {
      return ConfigSchema.parse({
        environment: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL,
        database: {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          name: process.env.DB_NAME,
          synchronize: process.env.DB_SYNCHRONIZE === 'true',
          logging: process.env.DB_LOGGING === 'true'
        },
        providers: {
          alchemy: {
            apiKey: process.env.ALCHEMY_API_KEY,
            networks: {
              mainnet: process.env.ALCHEMY_MAINNET_URL || '',
              goerli: process.env.ALCHEMY_GOERLI_URL || '',
              sepolia: process.env.ALCHEMY_SEPOLIA_URL || ''
            },
            rateLimit: process.env.ALCHEMY_RATE_LIMIT ? parseInt(process.env.ALCHEMY_RATE_LIMIT, 10) : undefined
          },
          infura: {
            apiKey: process.env.INFURA_API_KEY || process.env.INFURA_PROJECT_ID,
            networks: {
              mainnet: process.env.INFURA_MAINNET_URL || '',
              goerli: process.env.INFURA_GOERLI_URL || '',
              sepolia: process.env.INFURA_SEPOLIA_URL || ''
            },
            rateLimit: process.env.INFURA_RATE_LIMIT ? parseInt(process.env.INFURA_RATE_LIMIT, 10) : undefined
          }
        },
        metrics: {
          enabled: process.env.METRICS_ENABLED === 'true',
          port: process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT, 10) : undefined
        }
      });
    } catch (error) {
      console.error('Configuration validation error:', error);
      throw new Error('Failed to validate configuration');
    }
  }

  /**
   * Get the entire configuration object
   */
  public getConfig(): Config {
    return this.config;
  }

  /**
   * Get database configuration
   */
  public get database() {
    return this.config.database;
  }

  /**
   * Get Alchemy API key with validation
   */
  public getAlchemyApiKey(throwOnMissing: boolean = true): string {
    const apiKey = this.config.providers.alchemy.apiKey;
    
    if (!apiKey && throwOnMissing) {
      throw new Error('Alchemy API key is required. Please add ALCHEMY_API_KEY to your .env file.');
    }
    
    return apiKey;
  }

  /**
   * Get Infura API key with validation
   */
  public getInfuraApiKey(throwOnMissing: boolean = true): string {
    const apiKey = this.config.providers.infura.apiKey;
    
    if (!apiKey && throwOnMissing) {
      throw new Error('Infura API key is required. Please add INFURA_API_KEY to your .env file.');
    }
    
    return apiKey;
  }

  /**
   * Get Etherscan API key with validation
   */
  public getEtherscanApiKey(throwOnMissing: boolean = true): string {
    const apiKey = process.env.ETHERSCAN_API_KEY || '';
    
    if (!apiKey && throwOnMissing) {
      throw new Error('Etherscan API key is required. Please add ETHERSCAN_API_KEY to your .env file.');
    }
    
    return apiKey;
  }

  /**
   * Get Graph Studio API key with validation
   */
  public getGraphStudioApiKey(throwOnMissing: boolean = true): string {
    const apiKey = process.env.GRAPH_STUDIO_API_KEY || '';
    
    if (!apiKey && throwOnMissing) {
      throw new Error('The Graph Studio API key is required. Please add GRAPH_STUDIO_API_KEY to your .env file.');
    }
    
    return apiKey;
  }

  /**
   * Validate API key format
   */
  public validateApiKeyFormat(apiKey: string, provider: string): boolean {
    const format = this.apiKeyFormats[provider];
    return format ? format.test(apiKey) : false;
  }

  /**
   * Validate Alchemy API key
   */
  public validateAlchemyApiKey(): boolean {
    const apiKey = this.config.providers.alchemy.apiKey;
    
    if (!apiKey) {
      console.warn('⚠️ Alchemy API key is missing.');
      return false;
    }

    if (!this.validateApiKeyFormat(apiKey, 'Alchemy')) {
      console.warn('⚠️ Invalid Alchemy API key format.');
      return false;
    }

    return true;
  }

  /**
   * Validate Infura API key
   */
  public validateInfuraApiKey(): boolean {
    const apiKey = this.config.providers.infura.apiKey;
    
    if (!apiKey) {
      console.warn('⚠️ Infura API key is missing.');
      return false;
    }

    if (!this.validateApiKeyFormat(apiKey, 'Infura')) {
      console.warn('⚠️ Invalid Infura API key format.');
      return false;
    }

    return true;
  }

  /**
   * Validate Etherscan API key
   */
  public validateEtherscanApiKey(): boolean {
    const apiKey = this.getEtherscanApiKey(false);
    
    if (!apiKey) {
      console.warn('⚠️ Etherscan API key is not set. Contract verification may fail.');
      return false;
    }

    if (!this.validateApiKeyFormat(apiKey, 'Etherscan')) {
      console.warn('⚠️ Invalid Etherscan API key format.');
      return false;
    }

    return true;
  }

  /**
   * Validate Graph Studio API key
   */
  public validateGraphStudioApiKey(): boolean {
    const apiKey = this.getGraphStudioApiKey(false);
    
    if (!apiKey) {
      console.warn('⚠️ The Graph Studio API key is not set. Subgraph queries may fail.');
      return false;
    }

    if (!this.validateApiKeyFormat(apiKey, 'GraphStudio')) {
      console.warn('⚠️ Invalid Graph Studio API key format.');
      return false;
    }

    return true;
  }

  /**
   * Validate all API keys
   */
  public validateAllApiKeys(): Record<string, boolean> {
    return {
      Alchemy: this.validateAlchemyApiKey(),
      Infura: this.validateInfuraApiKey(),
      Etherscan: this.validateEtherscanApiKey(),
      GraphStudio: this.validateGraphStudioApiKey()
    };
  }

  /**
   * Check if any critical API keys are missing
   */
  public areCriticalApiKeysMissing(): boolean {
    const criticalKeys = [
      this.config.providers.alchemy.apiKey,
      this.config.providers.infura.apiKey
    ];

    return criticalKeys.some(key => !key);
  }
}

// Create and export the configuration service instance
export const configService = ConfigService.getInstance();

// Export the config object for backward compatibility
export const config = configService.getConfig();

// Export ENV for backward compatibility with code using the old env.ts
export const ENV = {
  getInstance: () => configService,
  getApiKey: (keyName: string) => {
    switch (keyName) {
      case 'ALCHEMY_API_KEY':
        return configService.getAlchemyApiKey();
      case 'INFURA_API_KEY':
        return configService.getInfuraApiKey();
      case 'ETHERSCAN_API_KEY':
        return configService.getEtherscanApiKey();
      case 'GRAPH_STUDIO_API_KEY':
        return configService.getGraphStudioApiKey();
      default:
        return process.env[keyName] || '';
    }
  },
  get ALCHEMY_API_KEY() {
    return configService.getAlchemyApiKey();
  },
  get INFURA_API_KEY() {
    return configService.getInfuraApiKey();
  },
  get ETHERSCAN_API_KEY() {
    return configService.getEtherscanApiKey();
  },
  get GRAPH_STUDIO_API_KEY() {
    return configService.getGraphStudioApiKey();
  },
  validateAlchemyApiKey: () => configService.validateAlchemyApiKey(),
  validateInfuraApiKey: () => configService.validateInfuraApiKey(),
  validateEtherscanApiKey: () => configService.validateEtherscanApiKey(),
  validateGraphStudioApiKey: () => configService.validateGraphStudioApiKey(),
  validateAllApiKeys: () => configService.validateAllApiKeys(),
  areCriticalApiKeysMissing: () => configService.areCriticalApiKeysMissing(),
  getAlchemyApiKey: (throwOnMissing = true) => configService.getAlchemyApiKey(throwOnMissing),
  getInfuraApiKey: (throwOnMissing = true) => configService.getInfuraApiKey(throwOnMissing),
  getEtherscanApiKey: (throwOnMissing = true) => configService.getEtherscanApiKey(throwOnMissing),
  getGraphStudioApiKey: (throwOnMissing = true) => configService.getGraphStudioApiKey(throwOnMissing),
  validateApiKeyFormat: (apiKey: string, provider: string) => configService.validateApiKeyFormat(apiKey, provider)
};
