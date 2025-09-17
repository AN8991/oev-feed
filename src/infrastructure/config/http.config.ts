import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validate } from 'class-validator';
import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max, IsUrl, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Rate limit configuration class
 */
export class RateLimitConfig {
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  enabled: boolean = true;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @Transform(({ value }) => parseInt(value, 10) || 100)
  requests: number = 100;

  @IsNumber()
  @Min(1000)
  @Max(3600000)
  @Transform(({ value }) => parseInt(value, 10) || 60000)
  window: number = 60000;
}

/**
 * Circuit breaker configuration class
 */
export class CircuitBreakerConfig {
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  enabled: boolean = true;

  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10) || 5)
  failureThreshold: number = 5;

  @IsNumber()
  @Min(1000)
  @Max(300000)
  @Transform(({ value }) => parseInt(value, 10) || 30000)
  resetTimeout: number = 30000;
}

/**
 * API-specific rate limit configuration
 */
export class ApiRateLimitConfig {
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Transform(({ value }) => parseInt(value, 10) || 5)
  requests: number = 5;

  @IsNumber()
  @Min(1000)
  @Max(60000)
  @Transform(({ value }) => parseInt(value, 10) || 1000)
  window: number = 1000;
}

/**
 * Etherscan API configuration
 */
export class EtherscanApiConfig {
  @IsString()
  @IsUrl()
  @IsOptional()
  baseUrl: string = 'https://api.etherscan.io/api';

  @IsNumber()
  @Min(1000)
  @Max(60000)
  @Transform(({ value }) => parseInt(value, 10) || 15000)
  timeout: number = 15000;

  rateLimit: ApiRateLimitConfig = new ApiRateLimitConfig();
}

/**
 * Alchemy API configuration
 */
export class AlchemyApiConfig {
  @IsNumber()
  @Min(1000)
  @Max(60000)
  @Transform(({ value }) => parseInt(value, 10) || 10000)
  timeout: number = 10000;

  rateLimit: ApiRateLimitConfig = new ApiRateLimitConfig();
}

/**
 * Infura API configuration
 */
export class InfuraApiConfig {
  @IsNumber()
  @Min(1000)
  @Max(60000)
  @Transform(({ value }) => parseInt(value, 10) || 10000)
  timeout: number = 10000;

  rateLimit: ApiRateLimitConfig = new ApiRateLimitConfig();
}

/**
 * APIs configuration container
 */
export class ApisConfig {
  etherscan: EtherscanApiConfig = new EtherscanApiConfig();
  alchemy: AlchemyApiConfig = new AlchemyApiConfig();
  infura: InfuraApiConfig = new InfuraApiConfig();
}

/**
 * Main HTTP configuration class
 */
export class HttpConfig {
  @IsNumber()
  @Min(1000)
  @Max(300000)
  @Transform(({ value }) => parseInt(value, 10) || 30000)
  timeout: number = 30000;

  @IsNumber()
  @Min(0)
  @Max(20)
  @Transform(({ value }) => parseInt(value, 10) || 5)
  maxRedirects: number = 5;

  @IsNumber()
  @Min(0)
  @Max(10)
  @Transform(({ value }) => parseInt(value, 10) || 3)
  retries: number = 3;

  @IsNumber()
  @Min(100)
  @Max(10000)
  @Transform(({ value }) => parseInt(value, 10) || 1000)
  retryDelay: number = 1000;

  @IsNumber()
  @Min(1024)
  @Max(104857600)
  @Transform(({ value }) => parseInt(value, 10) || 10485760)
  maxContentLength: number = 10485760;

  rateLimit: RateLimitConfig = new RateLimitConfig();
  circuitBreaker: CircuitBreakerConfig = new CircuitBreakerConfig();
  apis: ApisConfig = new ApisConfig();
}

/**
 * HTTP Configuration Service
 * Handles HTTP client configuration, API settings, and rate limiting
 */
@Injectable()
export class HttpConfigService implements OnModuleInit {
  private readonly logger = new Logger(HttpConfigService.name);
  private httpConfig: HttpConfig;

  constructor(private readonly configService: ConfigService) {
    this.httpConfig = this.loadAndValidateConfig();
  }

  /**
   * Validate configuration on module initialization
   */
  async onModuleInit(): Promise<void> {
    const result = await validate(this.httpConfig);
    if (result.length > 0) {
      throw new Error(
        `HTTP configuration validation failed: ${JSON.stringify(
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
   * Load and validate HTTP configuration from environment variables
   */
  private loadAndValidateConfig(): HttpConfig {
    const config = new HttpConfig();
    
    // Global HTTP settings
    config.timeout = this.configService.get<number>('HTTP_TIMEOUT', 30000);
    config.maxRedirects = this.configService.get<number>('HTTP_MAX_REDIRECTS', 5);
    config.retries = this.configService.get<number>('HTTP_RETRIES', 3);
    config.retryDelay = this.configService.get<number>('HTTP_RETRY_DELAY', 1000);
    config.maxContentLength = this.configService.get<number>('HTTP_MAX_CONTENT_LENGTH', 10485760);
    
    // Rate limiting
    config.rateLimit.enabled = this.configService.get<string>('HTTP_RATE_LIMIT_ENABLED') === 'true';
    config.rateLimit.requests = this.configService.get<number>('HTTP_RATE_LIMIT_REQUESTS', 100);
    config.rateLimit.window = this.configService.get<number>('HTTP_RATE_LIMIT_WINDOW', 60000);
    
    // Circuit breaker
    config.circuitBreaker.enabled = this.configService.get<string>('HTTP_CIRCUIT_BREAKER_ENABLED') === 'true';
    config.circuitBreaker.failureThreshold = this.configService.get<number>('HTTP_CIRCUIT_BREAKER_FAILURE_THRESHOLD', 5);
    config.circuitBreaker.resetTimeout = this.configService.get<number>('HTTP_CIRCUIT_BREAKER_RESET_TIMEOUT', 30000);
    
    // Etherscan API
    config.apis.etherscan.baseUrl = this.configService.get<string>('ETHERSCAN_BASE_URL', 'https://api.etherscan.io/api');
    config.apis.etherscan.timeout = this.configService.get<number>('ETHERSCAN_TIMEOUT', 15000);
    config.apis.etherscan.rateLimit.requests = this.configService.get<number>('ETHERSCAN_RATE_LIMIT_REQUESTS', 5);
    config.apis.etherscan.rateLimit.window = this.configService.get<number>('ETHERSCAN_RATE_LIMIT_WINDOW', 1000);
    
    // Alchemy API
    config.apis.alchemy.timeout = this.configService.get<number>('ALCHEMY_TIMEOUT', 10000);
    config.apis.alchemy.rateLimit.requests = this.configService.get<number>('ALCHEMY_RATE_LIMIT_REQUESTS', 300);
    config.apis.alchemy.rateLimit.window = this.configService.get<number>('ALCHEMY_RATE_LIMIT_WINDOW', 1000);
    
    // Infura API
    config.apis.infura.timeout = this.configService.get<number>('INFURA_TIMEOUT', 10000);
    config.apis.infura.rateLimit.requests = this.configService.get<number>('INFURA_RATE_LIMIT_REQUESTS', 100);
    config.apis.infura.rateLimit.window = this.configService.get<number>('INFURA_RATE_LIMIT_WINDOW', 1000);
    
    return config;
  }

  /**
   * Get complete HTTP configuration
   */
  getHttpConfig(): HttpConfig {
    return this.httpConfig;
  }

  /**
   * Get global HTTP configuration for HttpModule
   */
  getGlobalHttpConfig() {
    return {
      timeout: this.httpConfig.timeout,
      maxRedirects: this.httpConfig.maxRedirects,
      maxContentLength: this.httpConfig.maxContentLength,
      validateStatus: (status: number) => status >= 200 && status < 300,
    };
  }

  /**
   * Get rate limit configuration
   */
  getRateLimitConfig(): RateLimitConfig {
    return this.httpConfig.rateLimit;
  }

  /**
   * Get circuit breaker configuration
   */
  getCircuitBreakerConfig(): CircuitBreakerConfig {
    return this.httpConfig.circuitBreaker;
  }

  /**
   * Get Etherscan API configuration
   */
  getEtherscanConfig(): EtherscanApiConfig {
    return this.httpConfig.apis.etherscan;
  }

  /**
   * Get Alchemy API configuration
   */
  getAlchemyConfig(): AlchemyApiConfig {
    return this.httpConfig.apis.alchemy;
  }

  /**
   * Get Infura API configuration
   */
  getInfuraConfig(): InfuraApiConfig {
    return this.httpConfig.apis.infura;
  }

  /**
   * Get Etherscan-specific HTTP configuration
   */
  getEtherscanHttpConfig() {
    return {
      baseURL: this.httpConfig.apis.etherscan.baseUrl,
      timeout: this.httpConfig.apis.etherscan.timeout,
      retries: this.httpConfig.retries,
      retryDelay: this.httpConfig.retryDelay,
      rateLimit: this.httpConfig.apis.etherscan.rateLimit,
    };
  }

  /**
   * Get Alchemy-specific HTTP configuration
   */
  getAlchemyHttpConfig() {
    return {
      timeout: this.httpConfig.apis.alchemy.timeout,
      retries: this.httpConfig.retries,
      retryDelay: this.httpConfig.retryDelay,
      rateLimit: this.httpConfig.apis.alchemy.rateLimit,
    };
  }

  /**
   * Get Infura-specific HTTP configuration
   */
  getInfuraHttpConfig() {
    return {
      timeout: this.httpConfig.apis.infura.timeout,
      retries: this.httpConfig.retries,
      retryDelay: this.httpConfig.retryDelay,
      rateLimit: this.httpConfig.apis.infura.rateLimit,
    };
  }

  /**
   * Get HTTP timeout
   */
  get timeout(): number {
    return this.httpConfig.timeout;
  }

  /**
   * Get max redirects
   */
  get maxRedirects(): number {
    return this.httpConfig.maxRedirects;
  }

  /**
   * Get max content length
   */
  get maxContentLength(): number {
    return this.httpConfig.maxContentLength;
  }

  /**
   * Check if rate limiting is enabled
   */
  get isRateLimitEnabled(): boolean {
    return this.httpConfig.rateLimit.enabled;
  }

  /**
   * Check if circuit breaker is enabled
   */
  get isCircuitBreakerEnabled(): boolean {
    return this.httpConfig.circuitBreaker.enabled;
  }

  /**
   * Get configuration for specific API provider
   */
  getApiConfig(provider: 'etherscan' | 'alchemy' | 'infura') {
    switch (provider) {
      case 'etherscan':
        return this.getEtherscanConfig();
      case 'alchemy':
        return this.getAlchemyConfig();
      case 'infura':
        return this.getInfuraConfig();
      default:
        throw new Error(`Unknown API provider: ${provider}`);
    }
  }
}
