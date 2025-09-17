# Middleware Implementation Guide

## Overview

This document describes the middleware-based approach implemented for cross-cutting concerns in the OEV Feed project. The middleware system provides centralized logging, metrics collection, circuit breaking, and error handling using NestJS interceptors and battle-tested community packages.

## Architecture

### Core Components

1. **BaseInterceptor** - Common functionality for all interceptors
2. **LoggingInterceptor** - Structured logging with Pino
3. **MetricsInterceptor** - Prometheus metrics collection
4. **CircuitBreakerInterceptor** - Circuit breaker pattern using Opossum
5. **ErrorHandlingInterceptor** - Centralized error transformation

### Dependencies

- `nestjs-pino` - Structured logging
- `@willsoto/nestjs-prometheus` - Metrics collection
- `opossum` - Circuit breaker implementation
- `@nestjs/throttler` - Rate limiting

## Usage Patterns

### Basic Usage

All interceptors are registered globally and work automatically:

```typescript
// Automatic logging, metrics, and error handling
@Controller('api')
export class MyController {
  @Get('data')
  getData() {
    return { message: 'Hello World' };
  }
}
```

### Fine-Grained Control

Use decorators for method-specific configuration:

```typescript
@Controller('api')
export class MyController {
  @Get('critical')
  @CircuitBreaker({ 
    timeout: 2000, 
    errorThresholdPercentage: 50 
  })
  @Metrics({ 
    track: ['duration', 'success_rate'],
    customLabels: { operation: 'critical_data' }
  })
  @LogExecution({ 
    level: 'warn', 
    includeArgs: true 
  })
  getCriticalData(@Query() params: any) {
    // Implementation
  }
}
```

## Configuration

### Environment Variables

```bash
# Logging
LOG_LEVEL=info
NODE_ENV=development

# Metrics
METRICS_ENABLED=true
METRICS_PATH=/metrics

# Circuit Breaker
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_TIMEOUT=5000
CIRCUIT_BREAKER_ERROR_THRESHOLD=60
```

### Middleware Configuration

Configuration is centralized in `middleware.config.ts`:

```typescript
export const defaultMiddlewareConfig = {
  logging: {
    enabled: true,
    level: 'info',
    excludePaths: ['/health', '/metrics'],
    redactFields: ['password', 'token', 'apiKey'],
  },
  metrics: {
    enabled: true,
    excludePaths: ['/health'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  },
  circuitBreaker: {
    enabled: true,
    timeout: 5000,
    errorThresholdPercentage: 60,
    resetTimeout: 30000,
  },
};
```

## Available Decorators

### @CircuitBreaker(options)

Applies circuit breaker protection to a method:

```typescript
@CircuitBreaker({
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000
})
```

### @Metrics(options)

Configures metrics collection:

```typescript
@Metrics({
  track: ['duration', 'success_rate', 'error_rate'],
  customLabels: { service: 'user-service' }
})
```

### @LogExecution(options)

Controls logging behavior:

```typescript
@LogExecution({
  level: 'info',
  includeArgs: true,
  includeResult: false,
  message: 'Custom log message'
})
```

### Disable Middleware

Use these decorators to disable specific middleware:

```typescript
@NoCircuitBreaker()
@NoMetrics()
@NoLogging()
```

## Testing Endpoints

The system includes a demo controller at `/middleware-demo` with the following endpoints:

- `GET /middleware-demo/health` - Health check with all middleware
- `GET /middleware-demo/success` - Always succeeds
- `GET /middleware-demo/error` - Always fails (for error handling testing)
- `GET /middleware-demo/timeout/:delay` - Configurable delay for timeout testing
- `POST /middleware-demo/process` - Complex processing with all features
- `GET /middleware-demo/circuit-breaker-test` - Random failures for circuit breaker testing
- `GET /middleware-demo/metrics-demo/:category` - Different response times for metrics

## Monitoring

### Metrics Endpoint

Prometheus metrics are available at `/metrics`:

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/data",status_code="200",handler="getData"} 42

# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/data",status_code="200",handler="getData",le="0.1"} 35
```

### Structured Logs

All requests are logged with structured data:

```json
{
  "level": "info",
  "time": "2024-01-01T12:00:00.000Z",
  "msg": "HTTP Request",
  "correlationId": "req-123-456",
  "method": "GET",
  "path": "/api/data",
  "statusCode": 200,
  "duration": 45,
  "handler": "MyController.getData"
}
```

## Error Handling

Errors are automatically transformed and logged:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/data",
  "correlationId": "req-123-456"
}
```

## Best Practices

1. **Use decorators sparingly** - Global interceptors handle most cases
2. **Configure timeouts appropriately** - Based on expected response times
3. **Monitor circuit breaker events** - Set up alerts for open circuits
4. **Use correlation IDs** - For tracing requests across services
5. **Exclude health checks** - From metrics and logging to reduce noise
6. **Set appropriate log levels** - Debug for development, info for production

## Migration Guide

### From Custom Services

Replace custom logging/metrics services with decorators:

```typescript
// Before
@Injectable()
export class MyService {
  constructor(
    private logger: StructuredLogger,
    private metrics: MetricsCollector
  ) {}
  
  async processData() {
    this.logger.info('Processing started');
    const start = Date.now();
    // ... processing
    this.metrics.recordDuration('process_data', Date.now() - start);
  }
}

// After
@Injectable()
export class MyService {
  @LogExecution({ message: 'Processing data' })
  @Metrics({ track: ['duration'], customLabels: { operation: 'process_data' } })
  async processData() {
    // ... processing (logging and metrics handled automatically)
  }
}
```

## Troubleshooting

### Common Issues

1. **Circuit breaker not triggering** - Check error threshold and minimum calls
2. **Metrics not appearing** - Verify `/metrics` endpoint accessibility
3. **Logs not structured** - Check Pino configuration
4. **High memory usage** - Review metrics cardinality and retention

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

This provides detailed information about interceptor execution and configuration.
