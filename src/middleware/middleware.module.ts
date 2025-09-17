/**
 * Middleware Module
 * Configures and provides all middleware interceptors
 */

import { Module, Global } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { ThrottlerModule } from '@nestjs/throttler';

// Interceptors
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { CircuitBreakerInterceptor } from './interceptors/circuit-breaker.interceptor';
import { ErrorHandlingInterceptor } from './interceptors/error-handling.interceptor';

// Configuration
import { defaultMiddlewareConfig } from './config/middleware.config';

@Global()
@Module({
  imports: [
    // Pino Logger Configuration
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.NODE_ENV === 'development' ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        } : undefined,
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            headers: {
              'user-agent': req.headers['user-agent'],
              'x-correlation-id': req.headers['x-correlation-id'],
            },
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),

    // Prometheus Metrics Configuration
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),

    // Throttler Configuration
    ThrottlerModule.forRoot([{
      ttl: defaultMiddlewareConfig.throttler.ttl * 1000, // Convert to milliseconds
      limit: defaultMiddlewareConfig.throttler.limit,
    }]),
  ],
  providers: [
    // Configuration providers
    {
      provide: 'LOGGING_CONFIG',
      useValue: defaultMiddlewareConfig.logging,
    },
    {
      provide: 'METRICS_CONFIG',
      useValue: defaultMiddlewareConfig.metrics,
    },
    {
      provide: 'CIRCUIT_BREAKER_CONFIG',
      useValue: defaultMiddlewareConfig.circuitBreaker,
    },

    // Interceptor providers
    LoggingInterceptor,
    MetricsInterceptor,
    CircuitBreakerInterceptor,
    ErrorHandlingInterceptor,
  ],
  exports: [
    LoggingInterceptor,
    MetricsInterceptor,
    CircuitBreakerInterceptor,
    ErrorHandlingInterceptor,
    'LOGGING_CONFIG',
    'METRICS_CONFIG',
    'CIRCUIT_BREAKER_CONFIG',
  ],
})
export class MiddlewareModule {}
