/**
 * Circuit Breaker Decorator
 * Method-level decorator for circuit breaker protection
 */

import { SetMetadata } from '@nestjs/common';
import { CircuitBreakerConfig } from '../config/middleware.config';

export const CIRCUIT_BREAKER_KEY = 'circuitBreaker';

export interface CircuitBreakerOptions extends Partial<CircuitBreakerConfig> {
  enabled?: boolean;
}

/**
 * Apply circuit breaker protection to a method
 * @param options Circuit breaker configuration options
 */
export const CircuitBreaker = (options: CircuitBreakerOptions = {}) =>
  SetMetadata(CIRCUIT_BREAKER_KEY, { enabled: true, ...options });

/**
 * Disable circuit breaker for a specific method
 */
export const NoCircuitBreaker = () =>
  SetMetadata(CIRCUIT_BREAKER_KEY, { enabled: false });
