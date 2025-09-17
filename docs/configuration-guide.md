# Configuration Guide

## Overview

The OEV Feed application uses a unified configuration system built on top of NestJS's `@nestjs/config` with comprehensive validation using `class-validator`. This approach provides type safety, startup validation, and centralized configuration management.

## Configuration Structure

### Environment Variables

All configuration is driven by environment variables. Create a `.env` file in the project root:

```bash
# Application Configuration
NODE_ENV=development
PORT=3000
APP_NAME=OEV Feed
APP_VERSION=1.0.0
ENABLE_SWAGGER=true
ENABLE_METRICS=true
LOG_LEVEL=info

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=oev_feed
DB_SYNCHRONIZE=false
DB_LOGGING=false
DB_MAX_CONNECTIONS=10
DB_CONNECTION_TIMEOUT=30000

# HTTP Configuration
HTTP_TIMEOUT=30000
HTTP_MAX_REDIRECTS=3
HTTP_RETRIES=3
HTTP_RATE_LIMIT_REQUESTS=1000
HTTP_RATE_LIMIT_WINDOW=60000
HTTP_CIRCUIT_BREAKER_ENABLED=true
HTTP_CIRCUIT_BREAKER_THRESHOLD=5

# Provider Configuration
ALCHEMY_API_KEY=your_alchemy_key
INFURA_API_KEY=your_infura_key
ETHERSCAN_API_KEY=your_etherscan_key
SUPPORTED_NETWORKS=ethereum,polygon,arbitrum
PROVIDER_HEALTH_CHECK_INTERVAL=10000

# Protocol Configuration
AAVE_V2_ETHEREUM_POOL=0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9
AAVE_V2_ETHEREUM_DATA_PROVIDER=0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d
AAVE_V3_ETHEREUM_POOL=0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
AAVE_V3_ETHEREUM_DATA_PROVIDER=0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3
```

## Configuration Classes

### AppConfig
Application-level settings including environment, port, and feature flags.

**Properties:**
- `nodeEnv`: Environment (development, production, test)
- `port`: Application port (1000-65535)
- `appName`: Application name
- `version`: Application version
- `enableSwagger`: Enable Swagger documentation
- `enableMetrics`: Enable Prometheus metrics
- `logLevel`: Logging level

### DatabaseConfig
PostgreSQL database connection settings.

**Properties:**
- `host`: Database host
- `port`: Database port (1-65535)
- `username`: Database username
- `password`: Database password
- `name`: Database name
- `synchronize`: Auto-sync schema (use false in production)
- `logging`: Enable query logging
- `maxConnections`: Maximum connection pool size (1-100)
- `connectionTimeout`: Connection timeout in ms (1000-60000)

### HttpConfig
HTTP client configuration with circuit breaker and rate limiting.

**Properties:**
- `timeout`: Request timeout in ms (1000-300000)
- `maxRedirects`: Maximum redirects (0-10)
- `retries`: Retry attempts (0-10)
- `rateLimitRequests`: Requests per window (100-10000)
- `rateLimitWindow`: Rate limit window in ms (1000-3600000)
- `circuitBreakerEnabled`: Enable circuit breaker
- `circuitBreakerThreshold`: Failure threshold (1-100)

### ProviderConfig
External API provider settings.

**Properties:**
- `alchemyApiKey`: Alchemy API key
- `infuraApiKey`: Infura API key
- `etherscanApiKey`: Etherscan API key
- `supportedNetworks`: Comma-separated network list
- `healthCheckInterval`: Health check interval in ms (1000-60000)

### ProtocolConfig
Protocol-specific contract addresses and settings.

**Properties:**
- `aaveV2EthereumPool`: Aave V2 pool address
- `aaveV2EthereumDataProvider`: Aave V2 data provider address
- `aaveV3EthereumPool`: Aave V3 pool address
- `aaveV3EthereumDataProvider`: Aave V3 data provider address

## Usage

### Injecting Configuration

```typescript
import { Injectable } from '@nestjs/common';
import { UnifiedConfigService } from '@infrastructure/config/unified.config';

@Injectable()
export class MyService {
  constructor(private readonly configService: UnifiedConfigService) {}

  someMethod() {
    // Get complete configuration
    const config = this.configService.getConfig();
    
    // Get specific configuration sections
    const appConfig = this.configService.getAppConfig();
    const dbConfig = this.configService.getDatabaseConfig();
    const httpConfig = this.configService.getHttpConfig();
    
    // Environment checks
    if (this.configService.isProduction()) {
      // Production-specific logic
    }
    
    // Protocol configuration
    const aaveConfig = this.configService.getProtocolAdapterConfig('aave-v2', 'ethereum');
  }
}
```

### Validation

Configuration is automatically validated on application startup. Invalid configuration will prevent the application from starting with detailed error messages.

**Validation Features:**
- Type checking (string, number, boolean)
- Range validation (min/max values)
- Length validation for strings
- URL format validation
- Enum validation for specific values
- Required field validation

## Environment-Specific Configuration

### Development
```bash
NODE_ENV=development
DB_SYNCHRONIZE=true
DB_LOGGING=true
LOG_LEVEL=debug
ENABLE_SWAGGER=true
```

### Production
```bash
NODE_ENV=production
DB_SYNCHRONIZE=false
DB_LOGGING=false
LOG_LEVEL=warn
ENABLE_SWAGGER=false
HTTP_CIRCUIT_BREAKER_ENABLED=true
```

### Testing
```bash
NODE_ENV=test
DB_NAME=oev_feed_test
DB_SYNCHRONIZE=true
LOG_LEVEL=error
ENABLE_METRICS=false
```

## Migration from Legacy Configuration

The unified configuration system replaces multiple configuration classes:

**Replaced Classes:**
- `ConfigService` → `UnifiedConfigService`
- `HttpConfigService` → `UnifiedConfigService.getHttpConfig()`
- `DatabaseConfig` → `UnifiedConfigService.getDatabaseConfig()`

**Migration Steps:**
1. Update imports to use `UnifiedConfigService`
2. Replace method calls with new configuration methods
3. Update environment variable names if needed
4. Remove old configuration files

## Best Practices

1. **Environment Variables**: Always use environment variables for configuration
2. **Validation**: Rely on startup validation to catch configuration errors early
3. **Type Safety**: Use the typed configuration methods instead of raw environment access
4. **Secrets**: Never commit API keys or passwords to version control
5. **Documentation**: Keep this guide updated when adding new configuration options

## Troubleshooting

### Common Issues

**Configuration Validation Failed**
- Check environment variable names and formats
- Ensure required variables are set
- Verify numeric values are within valid ranges

**Database Connection Failed**
- Verify database credentials and connectivity
- Check if database exists
- Ensure PostgreSQL is running

**HTTP Requests Failing**
- Verify API keys are set correctly
- Check network connectivity
- Review circuit breaker settings

### Debug Configuration

Enable debug logging to see configuration values:

```bash
LOG_LEVEL=debug
```

The application will log the validated configuration on startup (sensitive values are redacted).
