# Middleware Implementation Guide

## Overview

This document describes the middleware implemented for cross-cutting concerns in the OEV Feed project.
## Architecture

### Core Interceptors

1. **BaseInterceptor** - Common utilities (correlation ID, path exclusions, handler metadata)
2. **LoggingInterceptor** - Comprehensive request/response logging with correlation IDs
3. **MetricsInterceptor** - Performance metrics collection (response time, request count)
4. **CircuitBreakerInterceptor** - Fault tolerance with automatic failure detection
5. **ErrorHandlingInterceptor** - Centralized error processing with consistent responses

### Modern Dependencies

- **Logging**: Comprehensive request/response logging with correlation IDs
- **Metrics**: Performance metrics collection (response time, request count, error rates)
- **Circuit Breaker**: Automatic failure detection and recovery
- **Error Handling**: Consistent error response formatting
- **HTTP Methods**: Enhanced method-specific logging and metrics

### Interceptor Order

```typescript
// Proper order: Error handling → Logging → Metrics → Circuit Breaker
providers: [
  { provide: APP_INTERCEPTOR, useClass: ErrorHandlingInterceptor },
  { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  { provide: APP_INTERCEPTOR, useClass: CircuitBreakerInterceptor },
]
```

## Usage Patterns - **Modern NestJS Patterns**

### Automatic Global Coverage

**All endpoints automatically protected**:

```typescript
@Controller('api')
export class MyController {
  @Get('data')
  getData() {
    // Automatic: logging, metrics, error handling, circuit breaker
    return { message: 'Hello World' };
  }
}
```

### Method-Level Control - **Custom Decorators**

**Fine-grained middleware control**:

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
  @Logging({ 
    level: 'warn', 
    includeArgs: true 
  })
  getCriticalData(@Query() params: any) {
    // Enhanced protection with custom configuration
    return this.criticalService.getData(params);
  }
}
```

## Configuration - **Environment-Driven**

### Environment Variables

**Production-Ready Configuration**:

```bash
# Logging Configuration
LOG_LEVEL=info
NODE_ENV=production

# Metrics Configuration  
METRICS_ENABLED=true
METRICS_PATH=/metrics

# Circuit Breaker Configuration
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_TIMEOUT=5000
CIRCUIT_BREAKER_ERROR_THRESHOLD=60

# HTTP Method-Specific Configuration
METHOD_SPECIFIC_LOGGING=true
METHOD_SPECIFIC_METRICS=true
```

### Centralized Configuration

**MiddlewareConfig** with method-specific options:

```typescript
// src/middleware/config/middleware.config.ts
export const defaultMiddlewareConfig = {
  logging: {
    enabled: true,
    level: 'info',
    methodSpecificLogging: {
      [HttpMethods.GET]: false,    // Reduce noise
      [HttpMethods.POST]: true,    // Log state changes
      [HttpMethods.PUT]: true,
      [HttpMethods.DELETE]: true,
    }
  },
  metrics: {
    enabled: true,
    path: '/metrics',
    methodSpecificMetrics: {
      [HttpMethods.GET]: true,
      [HttpMethods.POST]: true,
    }
  },
  circuitBreaker: {
    enabled: true,
    timeout: 5000,
    errorThresholdPercentage: 60,
  }
};
```

## Production Features - **Industry-Leading**

### Observability Stack

**Comprehensive Monitoring**:

```typescript
// Automatic metrics collection at /metrics endpoint
GET /metrics
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200",route="/api/positions"} 1234

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/positions",le="0.1"} 100
```

### Error Handling & Resilience

**Centralized Error Processing**:

```typescript
// Automatic error transformation
{
  "statusCode": 500,
  "message": "Internal server error",
  "timestamp": "2025-09-21T08:00:00.000Z",
  "path": "/api/positions",
  "correlationId": "req-123-456-789"
}
```

### Circuit Breaker Protection

**Automatic Failure Detection**:

```typescript
// Circuit breaker states: CLOSED → OPEN → HALF_OPEN
// Automatic recovery with configurable thresholds
// Per-handler instances for granular control
```

*Middleware Implementation Guide - Updated: 2025-09-21*
