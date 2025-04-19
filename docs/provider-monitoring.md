# Provider Monitoring System

This document describes the provider monitoring system implemented for the OEV Feed application. The monitoring system provides structured logging, metrics collection, health monitoring, and a real-time dashboard for provider operations.

## Components

The provider monitoring system consists of the following components:

### 1. Structured Logger

The structured logger (`structured-logger.ts`) provides a consistent logging interface with the following features:

- Log levels: ERROR, WARN, INFO, DEBUG, VERBOSE
- Log categories for better filtering (PROVIDER, NETWORK, CONFIG, PERFORMANCE, SECURITY, GENERAL)
- Contextual logging with provider, network, and operation information
- File-based logging with rotation
- Provider-specific log file for easier troubleshooting

Usage example:

```typescript
import { logger, LogCategory, LogLevel } from '../utils/structured-logger';

// Basic logging
logger.info('Provider initialized', LogCategory.PROVIDER, { provider: 'alchemy', network: 'mainnet' });

// Error logging
try {
  // Some operation
} catch (error) {
  logger.error('Operation failed', LogCategory.PROVIDER, { provider: 'alchemy' }, error);
}

// Provider operation logging
logger.logProviderOperation('Getting block number', LogLevel.DEBUG, {
  provider: 'alchemy',
  network: 'mainnet'
});

// Performance logging
logger.logProviderPerformance('getBlockNumber', 150, true, {
  provider: 'alchemy',
  network: 'mainnet'
});
```

### 2. Metrics Collector

The metrics collector (`metrics-collector.ts`) tracks and stores provider performance metrics:

- Request counts, durations, and failure rates
- Rate limit status
- Block heights
- Provider health scores
- Fallback events

Metrics are stored as JSON files in the `metrics` directory and can be accessed through the dashboard API.

Usage example:

```typescript
import { metrics, ProviderMetric } from '../utils/metrics-collector';

// Record a provider request
metrics.recordProviderRequest(
  'alchemy',
  'alchemy',
  'mainnet',
  'getBlockNumber',
  150,
  true
);

// Record provider rate limit
metrics.recordProviderRateLimit(
  'alchemy',
  'alchemy',
  'mainnet',
  950,
  Date.now() + 60000
);

// Record provider health
metrics.recordProviderHealth(
  'alchemy',
  'alchemy',
  'mainnet',
  true
);
```

### 3. Provider Health Monitor

The provider health monitor (`provider-health-monitor.ts`) evaluates and tracks provider health status:

- Regular health checks for all providers
- Health scoring based on response time, failure rate, and rate limits
- Health status classification (HEALTHY, DEGRADED, UNHEALTHY, UNKNOWN)
- Integration with metrics collection and logging

Usage example:

```typescript
import { providerHealthMonitor } from '../utils/provider-health-monitor';

// Start health monitoring
providerHealthMonitor.startMonitoring();

// Get health check results for a network
const healthResults = providerHealthMonitor.getNetworkHealthCheckResults('mainnet');
console.log(healthResults);

// Stop health monitoring
providerHealthMonitor.stopMonitoring();
```

### 4. Dashboard Service

The dashboard service (`dashboard-service.ts`) provides a web-based dashboard for monitoring provider health and performance:

- Real-time provider health status
- Performance metrics visualization
- Rate limit monitoring
- Block height tracking
- API endpoints for accessing monitoring data

To start the dashboard:

```typescript
import { dashboard } from '../utils/dashboard-service';

// Start the dashboard
await dashboard.start();
console.log('Dashboard running at http://localhost:3000');
```

## Integration with Provider Adapters

The monitoring system is integrated with the provider adapters through the `BaseProviderAdapter` class. Each provider operation automatically:

1. Logs the operation with context
2. Records metrics for the operation
3. Updates provider statistics
4. Updates rate limit status when applicable

The `ProviderFactory` uses health information to select the best provider for each network, considering:

- Provider health status
- Response time
- Failure rate
- Rate limit status
- Provider priority

## Testing the Monitoring System

A test script is provided to demonstrate the monitoring system:

```bash
npm run test:provider-monitoring
```

This script:

1. Starts the health monitor and dashboard
2. Tests each available network with the best provider
3. Collects metrics and health check results
4. Keeps the dashboard running for interactive exploration

## Dashboard Usage

Once the dashboard is running, you can access it at http://localhost:3000. The dashboard provides:

- Provider health overview
- Performance metrics charts
- Rate limit status
- Block height comparison
- API endpoints for programmatic access

## Configuration

The monitoring system can be configured through environment variables:

- `LOG_LEVEL`: Minimum log level to record (default: 'info')
- `DASHBOARD_PORT`: Port for the dashboard server (default: 3000)
- `DASHBOARD_HOST`: Host for the dashboard server (default: 'localhost')
- `HEALTH_CHECK_INTERVAL`: Interval in milliseconds for health checks (default: 60000)

## Extending the Monitoring System

The monitoring system can be extended to track additional metrics or integrate with external monitoring systems:

- Add new metric types to the `ProviderMetric` enum
- Implement custom health check logic in the `ProviderHealthMonitor` class
- Add new dashboard visualizations in the `DashboardService` class
- Integrate with external monitoring systems by forwarding logs and metrics
