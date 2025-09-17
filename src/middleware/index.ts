/**
 * Middleware Module Exports
 * Centralized exports for all middleware components
 */

// Module
export { MiddlewareModule } from './middleware.module';

// Interceptors
export { BaseInterceptor } from './interceptors/base.interceptor';
export { LoggingInterceptor } from './interceptors/logging.interceptor';
export { MetricsInterceptor } from './interceptors/metrics.interceptor';
export { CircuitBreakerInterceptor } from './interceptors/circuit-breaker.interceptor';
export { ErrorHandlingInterceptor } from './interceptors/error-handling.interceptor';

// Decorators
export { CircuitBreaker, NoCircuitBreaker, CIRCUIT_BREAKER_KEY } from './decorators/circuit-breaker.decorator';
export { Metrics, NoMetrics, METRICS_KEY } from './decorators/metrics.decorator';
export { LogExecution, NoLogging, LOGGING_KEY } from './decorators/logging.decorator';

// Configuration
export * from './config/middleware.config';

// Types
export type { CircuitBreakerOptions } from './decorators/circuit-breaker.decorator';
export type { MetricsOptions } from './decorators/metrics.decorator';
export type { LoggingOptions } from './decorators/logging.decorator';
