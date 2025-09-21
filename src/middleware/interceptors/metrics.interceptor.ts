/**
 * Metrics Interceptor
 * Provides automatic metrics collection using Prometheus
 */

import { Injectable, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Counter, Histogram, Gauge, register } from 'prom-client';
import { BaseInterceptor } from './base.interceptor';
import { MetricsConfig, defaultMiddlewareConfig } from '../config/middleware.config';
import { HttpMethods } from '../../domain/enums/httpMethods';

@Injectable()
export class MetricsInterceptor extends BaseInterceptor {
  private readonly httpRequestsTotal!: Counter<string>;
  private readonly httpRequestDuration!: Histogram<string>;
  private readonly httpRequestsInFlight!: Gauge<string>;

  constructor(
    @Inject('METRICS_CONFIG') private readonly config: MetricsConfig = defaultMiddlewareConfig.metrics,
  ) {
    super();

    if (!this.config.enabled) return;

    try {
      // HTTP requests total counter
      this.httpRequestsTotal = register.getSingleMetric('http_requests_total') as Counter<string> || new Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code', 'handler'],
        registers: [register],
      });

      // HTTP request duration histogram
      this.httpRequestDuration = register.getSingleMetric('http_request_duration_seconds') as Histogram<string> || new Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code', 'handler'],
        buckets: this.config.buckets,
        registers: [register],
      });

      // HTTP requests in-flight gauge
      this.httpRequestsInFlight = register.getSingleMetric('http_requests_in_flight') as Gauge<string> || new Gauge({
        name: 'http_requests_in_flight',
        help: 'Number of HTTP requests currently being processed',
        labelNames: ['method', 'route'],
        registers: [register],
      });
    } catch (error) {
      // If metrics are already registered, get them from the registry
      this.httpRequestsTotal = register.getSingleMetric('http_requests_total') as Counter<string>;
      this.httpRequestDuration = register.getSingleMetric('http_request_duration_seconds') as Histogram<string>;
      this.httpRequestsInFlight = register.getSingleMetric('http_requests_in_flight') as Gauge<string>;
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.config.enabled) {
      return next.handle();
    }

    const requestInfo = this.getRequestInfo(context);
    const handlerInfo = this.getHandlerInfo(context);
    const startTime = Date.now();

    // Skip metrics for excluded paths
    if (this.shouldExcludePath(requestInfo.path, this.config.excludePaths)) {
      return next.handle();
    }

    // Skip metrics for specific HTTP methods if configured
    if (!this.shouldCollectMetrics(requestInfo.method)) {
      return next.handle();
    }

    const labels = {
      method: requestInfo.method,
      route: requestInfo.path,
      handler: handlerInfo.fullName,
    };

    // Increment in-flight requests
    this.httpRequestsInFlight.inc({ method: requestInfo.method, route: requestInfo.path });

    return next.handle().pipe(
      tap((response) => {
        const duration = (Date.now() - startTime) / 1000; // Convert to seconds
        const statusCode = requestInfo.response.statusCode.toString();

        // Record metrics
        this.httpRequestsTotal.inc({
          method: requestInfo.method,
          route: requestInfo.path,
          status_code: statusCode,
          handler: handlerInfo.handlerName,
        });

        this.httpRequestDuration.observe(
          {
            method: requestInfo.method,
            route: requestInfo.path,
            status_code: statusCode,
            handler: handlerInfo.handlerName,
          },
          duration,
        );

        this.httpRequestsInFlight.dec({ method: requestInfo.method, route: requestInfo.path });
      }),
      catchError((error) => {
        const duration = (Date.now() - startTime) / 1000;
        const statusCode = this.getErrorStatusCode(error).toString();

        // Record metrics for errors
        this.httpRequestsTotal.inc({ ...labels, status_code: statusCode });
        this.httpRequestDuration.observe({ ...labels, status_code: statusCode }, duration);
        this.httpRequestsInFlight.dec(labels);

        throw error;
      }),
    );
  }

  private getErrorStatusCode(error: any): number {
    if (error.status) return error.status;
    if (error.statusCode) return error.statusCode;
    return 500; // Internal server error as default
  }

  /**
   * Check if metrics should be collected for a specific HTTP method
   */
  private shouldCollectMetrics(method: HttpMethods): boolean {
    if (!this.config.methodSpecificMetrics) {
      return true; // Default to collecting metrics for all methods
    }
    
    const methodConfig = this.config.methodSpecificMetrics[method];
    return methodConfig !== false; // Collect unless explicitly disabled
  }
}
