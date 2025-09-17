/**
 * Circuit Breaker Interceptor
 * Provides circuit breaker pattern using opossum library
 */

import { Injectable, ExecutionContext, CallHandler, Inject, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import CircuitBreaker from 'opossum';
import { BaseInterceptor } from './base.interceptor';
import { CircuitBreakerConfig, defaultMiddlewareConfig } from '../config/middleware.config';

@Injectable()
export class CircuitBreakerInterceptor extends BaseInterceptor {
  private readonly logger = new Logger(CircuitBreakerInterceptor.name);
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(
    @Inject('CIRCUIT_BREAKER_CONFIG') private readonly config: CircuitBreakerConfig = defaultMiddlewareConfig.circuitBreaker,
  ) {
    super();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handlerInfo = this.getHandlerInfo(context);
    const circuitBreaker = this.getOrCreateCircuitBreaker(handlerInfo.fullName);

    // Wrap the handler execution in circuit breaker
    const wrappedHandler = () => {
      return new Promise((resolve, reject) => {
        const subscription = next.handle().pipe(
          catchError((error) => {
            reject(error);
            return throwError(error);
          })
        ).subscribe({
          next: (result) => resolve(result),
          error: (error) => reject(error),
        });
      });
    };

    return new Observable((observer) => {
      circuitBreaker.fire(wrappedHandler)
        .then((result) => {
          observer.next(result);
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }

  private getOrCreateCircuitBreaker(handlerName: string): CircuitBreaker {
    if (this.circuitBreakers.has(handlerName)) {
      return this.circuitBreakers.get(handlerName)!;
    }

    const options = {
      timeout: this.config.timeout,
      errorThresholdPercentage: this.config.errorThresholdPercentage,
      resetTimeout: this.config.resetTimeout,
      rollingCountTimeout: this.config.rollingCountTimeout,
      rollingCountBuckets: this.config.rollingCountBuckets,
      name: `${this.config.name}-${handlerName}`,
      group: this.config.group,
    };

    const circuitBreaker = new CircuitBreaker(async (fn: () => Promise<any>) => fn(), options);

    // Add event listeners for monitoring
    circuitBreaker.on('open', () => {
      this.logger.warn(`Circuit breaker opened for ${handlerName}`);
    });

    circuitBreaker.on('halfOpen', () => {
      this.logger.log(`Circuit breaker half-opened for ${handlerName}`);
    });

    circuitBreaker.on('close', () => {
      this.logger.log(`Circuit breaker closed for ${handlerName}`);
    });

    this.circuitBreakers.set(handlerName, circuitBreaker);
    return circuitBreaker;
  }
}
