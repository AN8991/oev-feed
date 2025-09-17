import * as dotenv from 'dotenv';
import { join } from 'path';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { validate } from 'class-validator';
import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max, Length, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

// Load environment variables from .env file in project root, fallback to process.cwd()
dotenv.config({ path: join(process.cwd(), '.env') });

/**
 * Database configuration class
 */
export class DatabaseConfig {
  @IsString()
  @IsOptional()
  host: string = 'localhost';

  @IsNumber()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value, 10) || 5432)
  port: number = 5432;

  @IsString()
  @IsOptional()
  username: string = 'postgres';

  @IsString()
  @IsOptional()
  password: string = 'postgres';

  @IsString()
  @IsOptional()
  name: string = 'oev_feed';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  synchronize: boolean = false;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  logging: boolean = false;
}

/**
 * Provider configuration classes
 */
export class AlchemyConfig {
  @IsString()
  @Length(5, 100)
  @IsOptional()
  apiKey: string = '';

  @IsOptional()
  networks: Record<string, string> = {};

  @IsNumber()
  @Min(1)
  @Max(10000)
  @Transform(({ value }) => parseInt(value, 10) || 100)
  rateLimit: number = 100;
}

export class InfuraConfig {
  @IsString()
  @Length(5, 100)
  @IsOptional()
  apiKey: string = '';

  @IsOptional()
  networks: Record<string, string> = {};

  @IsNumber()
  @Min(1)
  @Max(10000)
  @Transform(({ value }) => parseInt(value, 10) || 100)
  rateLimit: number = 100;
}

export class ProvidersConfig {
  alchemy: AlchemyConfig = new AlchemyConfig();
  infura: InfuraConfig = new InfuraConfig();
}

/**
 * Metrics configuration class
 */
export class MetricsConfig {
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  enabled: boolean = false;

  @IsNumber()
  @Min(1000)
  @Max(65535)
  @Transform(({ value }) => parseInt(value, 10) || 9090)
  port: number = 9090;
}

/**
 * Main configuration class
 */
export class Config {
  @IsString()
  @IsIn(['development', 'production', 'test', 'staging'])
  @IsOptional()
  environment: string = 'development';

  @IsString()
  @IsIn(['error', 'warn', 'info', 'debug', 'verbose'])
  @IsOptional()
  logLevel: string = 'info';

  @IsString()
  @IsOptional()
  nodeEnv: string = 'development';

  @IsNumber()
  @IsOptional()
  @Min(1000)
  @Max(65535)
  port: number = 3000;

  database: DatabaseConfig = new DatabaseConfig();
  providers: ProvidersConfig = new ProvidersConfig();
  metrics: MetricsConfig = new MetricsConfig();
}

/**
 * Core Configuration Service using NestJS and class-validator
 * Handles application-level configuration (database, environment, logging, metrics)
 */
@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly logger = new Logger(ConfigService.name);
  private config: Config;
  
  // API key validation regex patterns (moved to provider config service)
  private apiKeyFormats: Record<string, RegExp> = {
    GraphStudio: /^[A-Za-z0-9]{36}$/ // 36 character alphanumeric key
  };

  constructor(private readonly nestConfigService: NestConfigService) {
    this.config = this.parseConfig();
    this.logger.debug(`DATABASE_URL: ${process.env.DATABASE_URL}`);
    this.logger.debug(`Working directory: ${process.cwd()}`);
  }

  /**
   * Validate configuration on module initialization
   */
  async onModuleInit(): Promise<void> {
    const result = await validate(this.config);
    if (result.length > 0) {
      throw new Error(
        `Configuration validation failed: ${JSON.stringify(
          result.map((v) => ({
            property: v.property,
            constraints: v.constraints,
          })),
          null,
          2
        )}`
      );
    }
  }

  /**
   * Parse and validate configuration from environment variables
   */
  private parseConfig(): Config {
    const config = new Config();
    
    // Environment and logging
    config.environment = this.nestConfigService.get<string>('NODE_ENV', 'development');
    config.nodeEnv = this.nestConfigService.get<string>('NODE_ENV', 'development');
    config.logLevel = this.nestConfigService.get<string>('LOG_LEVEL', 'info');
    config.port = this.nestConfigService.get<number>('PORT', 3000);
    
    // Database configuration
    config.database.host = this.nestConfigService.get<string>('DB_HOST', 'localhost');
    config.database.port = this.nestConfigService.get<number>('DB_PORT', 5432);
    config.database.username = this.nestConfigService.get<string>('DB_USERNAME', 'postgres');
    config.database.password = this.nestConfigService.get<string>('DB_PASSWORD', 'postgres');
    config.database.name = this.nestConfigService.get<string>('DB_NAME', 'oev_feed');
    config.database.synchronize = this.nestConfigService.get<string>('DB_SYNCHRONIZE') === 'true';
    config.database.logging = this.nestConfigService.get<string>('DB_LOGGING') === 'true';
    
    // Alchemy configuration
    config.providers.alchemy.apiKey = this.nestConfigService.get<string>('ALCHEMY_API_KEY', '');
    config.providers.alchemy.networks = {
      mainnet: this.nestConfigService.get<string>('ALCHEMY_MAINNET_URL', ''),
      goerli: this.nestConfigService.get<string>('ALCHEMY_GOERLI_URL', ''),
      sepolia: this.nestConfigService.get<string>('ALCHEMY_SEPOLIA_URL', '')
    };
    config.providers.alchemy.rateLimit = this.nestConfigService.get<number>('ALCHEMY_RATE_LIMIT', 100);
    
    // Infura configuration
    config.providers.infura.apiKey = this.nestConfigService.get<string>('INFURA_API_KEY') || 
                                     this.nestConfigService.get<string>('INFURA_PROJECT_ID', '');
    config.providers.infura.networks = {
      mainnet: this.nestConfigService.get<string>('INFURA_MAINNET_URL', ''),
      goerli: this.nestConfigService.get<string>('INFURA_GOERLI_URL', ''),
      sepolia: this.nestConfigService.get<string>('INFURA_SEPOLIA_URL', '')
    };
    config.providers.infura.rateLimit = this.nestConfigService.get<number>('INFURA_RATE_LIMIT', 100);
    
    // Metrics configuration
    config.metrics.enabled = this.nestConfigService.get<string>('METRICS_ENABLED') === 'true';
    config.metrics.port = this.nestConfigService.get<number>('METRICS_PORT', 9090);
    
    return config;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Config {
    return this.config;
  }

  /**
   * Get database configuration
   */
  get database(): DatabaseConfig {
    return this.config.database;
  }

  /**
   * Get providers configuration
   */
  get providers(): ProvidersConfig {
    return this.config.providers;
  }

  /**
   * Get metrics configuration
   */
  get metrics(): MetricsConfig {
    return this.config.metrics;
  }

  /**
   * Get environment
   */
  get environment(): string {
    return this.config.environment;
  }

  /**
   * Get log level
   */
  get logLevel(): string {
    return this.config.logLevel;
  }

  /**
   * Get application port
   */
  get port(): number {
    return this.config.port;
  }

  /**
   * Check if running in production
   */
  get isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * Check if running in development
   */
  get isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  /**
   * Check if running in test mode
   */
  get isTest(): boolean {
    return this.config.environment === 'test';
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
      this.logger.warn('Alchemy API key is missing.');
      return false;
    }

    if (!this.validateApiKeyFormat(apiKey, 'Alchemy')) {
      this.logger.warn('Invalid Alchemy API key format.');
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
      this.logger.warn('Infura API key is missing.');
      return false;
    }

    if (!this.validateApiKeyFormat(apiKey, 'Infura')) {
      this.logger.warn('Invalid Infura API key format.');
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
      this.logger.warn('Etherscan API key is not set. Contract verification may fail.');
      return false;
    }

    if (!this.validateApiKeyFormat(apiKey, 'Etherscan')) {
      this.logger.warn('Invalid Etherscan API key format.');
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
      this.logger.warn('The Graph Studio API key is not set. Subgraph queries may fail.');
      return false;
    }

    if (!this.validateApiKeyFormat(apiKey, 'GraphStudio')) {
      this.logger.warn('Invalid Graph Studio API key format.');
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

// Note: ConfigService is now a NestJS injectable service
// It should be injected through dependency injection instead of using getInstance()
// The exports below are kept for backward compatibility but should be migrated to DI

// Temporary instance for backward compatibility - will be removed after migration
let legacyConfigService: ConfigService | null = null;

// Legacy export function for backward compatibility
export const getLegacyConfigService = (): ConfigService => {
  if (!legacyConfigService) {
    // Create a temporary instance with a mock NestConfigService for legacy support
    const mockNestConfigService = {
      get: <T>(key: string, defaultValue?: T): T => {
        const value = process.env[key];
        if (value === undefined) return defaultValue as T;
        
        // Try to parse numbers
        if (typeof defaultValue === 'number') {
          const parsed = parseInt(value, 10);
          return (isNaN(parsed) ? defaultValue : parsed) as T;
        }
        
        return value as T;
      }
    } as any;
    
    legacyConfigService = new ConfigService(mockNestConfigService);
  }
  return legacyConfigService;
};

// Export the config object for backward compatibility
export const config = getLegacyConfigService().getConfig();

// Export ENV for backward compatibility with code using the old env.ts
export const ENV = {
  getInstance: () => getLegacyConfigService(),
  getApiKey: (keyName: string) => {
    const service = getLegacyConfigService();
    switch (keyName) {
      case 'ALCHEMY_API_KEY':
        return service.getAlchemyApiKey();
      case 'INFURA_API_KEY':
        return service.getInfuraApiKey();
      case 'ETHERSCAN_API_KEY':
        return service.getEtherscanApiKey();
      case 'GRAPH_STUDIO_API_KEY':
        return service.getGraphStudioApiKey();
      default:
        return process.env[keyName] || '';
    }
  },
  get ALCHEMY_API_KEY() {
    return getLegacyConfigService().getAlchemyApiKey();
  },
  get INFURA_API_KEY() {
    return getLegacyConfigService().getInfuraApiKey();
  },
  get ETHERSCAN_API_KEY() {
    return getLegacyConfigService().getEtherscanApiKey();
  },
  get GRAPH_STUDIO_API_KEY() {
    return getLegacyConfigService().getGraphStudioApiKey();
  },
  validateAlchemyApiKey: () => getLegacyConfigService().validateAlchemyApiKey(),
  validateInfuraApiKey: () => getLegacyConfigService().validateInfuraApiKey(),
  validateEtherscanApiKey: () => getLegacyConfigService().validateEtherscanApiKey(),
  validateGraphStudioApiKey: () => getLegacyConfigService().validateGraphStudioApiKey(),
  validateAllApiKeys: () => getLegacyConfigService().validateAllApiKeys(),
  areCriticalApiKeysMissing: () => getLegacyConfigService().areCriticalApiKeysMissing(),
  getAlchemyApiKey: (throwOnMissing = true) => getLegacyConfigService().getAlchemyApiKey(throwOnMissing),
  getInfuraApiKey: (throwOnMissing = true) => getLegacyConfigService().getInfuraApiKey(throwOnMissing),
  getEtherscanApiKey: (throwOnMissing = true) => getLegacyConfigService().getEtherscanApiKey(throwOnMissing),
  getGraphStudioApiKey: (throwOnMissing = true) => getLegacyConfigService().getGraphStudioApiKey(throwOnMissing),
  validateApiKeyFormat: (apiKey: string, provider: string) => getLegacyConfigService().validateApiKeyFormat(apiKey, provider)
};
