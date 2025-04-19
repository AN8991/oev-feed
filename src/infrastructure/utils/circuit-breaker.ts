/**
 * Circuit Breaker Implementation
 * 
 * Part of the infrastructure layer in hexagonal architecture
 * Provides circuit breaker pattern implementation for resilient service calls
 */

import { logger, LogCategory, LogContext } from './structured-logger';
import { metrics, ProviderMetric } from './metrics-collector';

// Type definition for setTimeout return type to avoid NodeJS.Timeout dependency
type TimeoutId = ReturnType<typeof setTimeout>;

/**
 * Circuit breaker states
 */
export enum CircuitState {
  /**
   * Circuit is closed, requests are allowed
   */
  CLOSED = 'closed',
  
  /**
   * Circuit is open, requests are blocked
   */
  OPEN = 'open',
  
  /**
   * Circuit is half-open, allowing a test request
   */
  HALF_OPEN = 'half-open'
}

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  /**
   * Failure threshold (number of failures) before opening the circuit
   * Default: 5
   */
  failureThreshold: number;
  
  /**
   * Success threshold (number of successes) required to close the circuit
   * Default: 2
   */
  successThreshold: number;
  
  /**
   * Timeout in milliseconds before transitioning from OPEN to HALF_OPEN
   * Default: 30000ms (30 seconds)
   */
  resetTimeoutMs: number;
  
  /**
   * Failure rate threshold (0-1) that will open the circuit
   * Default: 0.5 (50% failure rate)
   */
  failureRateThreshold: number;
  
  /**
   * Minimum number of requests before considering failure rate
   * Default: 10
   */
  minimumRequestThreshold: number;
}

/**
 * Default circuit breaker options
 */
const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeoutMs: 30000,
  failureRateThreshold: 0.5,
  minimumRequestThreshold: 10
};

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  /**
   * Current state of the circuit
   */
  state: CircuitState;
  
  /**
   * Number of consecutive failures
   */
  consecutiveFailures: number;
  
  /**
   * Number of consecutive successes
   */
  consecutiveSuccesses: number;
  
  /**
   * Total number of successful requests
   */
  totalSuccesses: number;
  
  /**
   * Total number of failed requests
   */
  totalFailures: number;
  
  /**
   * Timestamp when the circuit was last opened
   */
  lastOpenedAt: number | null;
  
  /**
   * Timestamp when the circuit was last closed
   */
  lastClosedAt: number | null;
  
  /**
   * Timestamp when the circuit was last half-opened
   */
  lastHalfOpenedAt: number | null;
  
  /**
   * Timestamp when the circuit will be reset (if in OPEN state)
   */
  resetAt: number | null;
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  /**
   * Circuit breaker name
   */
  private readonly name: string;
  
  /**
   * Circuit breaker options
   */
  private readonly options: CircuitBreakerOptions;
  
  /**
   * Current state of the circuit
   */
  private state: CircuitState = CircuitState.CLOSED;
  
  /**
   * Number of consecutive failures
   */
  private consecutiveFailures: number = 0;
  
  /**
   * Number of consecutive successes
   */
  private consecutiveSuccesses: number = 0;
  
  /**
   * Total number of successful requests
   */
  private totalSuccesses: number = 0;
  
  /**
   * Total number of failed requests
   */
  private totalFailures: number = 0;
  
  /**
   * Timestamp when the circuit was last opened
   */
  private lastOpenedAt: number | null = null;
  
  /**
   * Timestamp when the circuit was last closed
   */
  private lastClosedAt: number | null = Date.now();
  
  /**
   * Timestamp when the circuit was last half-opened
   */
  private lastHalfOpenedAt: number | null = null;
  
  /**
   * Timeout ID for resetting the circuit
   */
  private resetTimeout: TimeoutId | null = null;
  
  /**
   * Context for logging
   */
  private readonly context: Record<string, any>;
  
  /**
   * Constructor
   * 
   * @param name Circuit breaker name
   * @param options Circuit breaker options
   * @param context Context for logging
   */
  constructor(
    name: string,
    options: Partial<CircuitBreakerOptions> = {},
    context: Record<string, any> = {}
  ) {
    this.name = name;
    this.options = {
      ...DEFAULT_CIRCUIT_BREAKER_OPTIONS,
      ...options
    };
    this.context = context;
    
    logger.debug(
      `Circuit breaker "${name}" initialized`,
      LogCategory.PROVIDER,
      {
        ...context,
        options: this.options
      }
    );
  }
  
  /**
   * Execute a function with circuit breaker protection
   * @param operation Function to execute
   * @returns Promise that resolves with the result of the operation or rejects with an error
   */
  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      const error = new Error(`Circuit "${this.name}" is OPEN`);
      logger.debug(
        `Circuit "${this.name}" is OPEN, rejecting request`,
        LogCategory.PROVIDER,
        this.context
      );
      
      // Record rejected request metric
      metrics.recordCounter(
        ProviderMetric.CIRCUIT_BREAKER_REJECTION,
        1,
        {
          circuit_breaker: this.name,
          provider: this.context.provider || 'unknown',
          provider_type: this.context.providerType || 'unknown',
          network: this.context.network || 'unknown'
        }
      );
      
      throw error;
    }
    
    try {
      // Execute the operation
      const result = await operation();
      
      // Record success
      this.recordSuccess();
      
      return result;
    } catch (error) {
      // Record failure
      this.recordFailure(error as Error);
      
      // Re-throw the error
      throw error;
    }
  }
  
  /**
   * Handle successful operation
   */
  private recordSuccess(): void {
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.totalSuccesses++;
    
    // Check if we should transition from HALF_OPEN to CLOSED
    if (this.state === CircuitState.HALF_OPEN && 
        this.consecutiveSuccesses >= this.options.successThreshold) {
      this.transitionToClosed();
    }
  }
  
  /**
   * Handle failed operation
   * 
   * @param error Error that occurred
   */
  private recordFailure(error: Error): void {
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.totalFailures++;
    
    logger.debug(
      `Circuit breaker "${this.name}" recorded failure: ${error.message}`,
      LogCategory.PROVIDER,
      {
        ...this.context,
        error: error.message,
        consecutiveFailures: this.consecutiveFailures
      }
    );
    
    // Check if we should transition to OPEN
    if (this.shouldTransitionToOpen()) {
      this.transitionToOpen();
    }
  }
  
  /**
   * Check if the circuit should transition to OPEN state
   * 
   * @returns True if the circuit should transition to OPEN
   */
  private shouldTransitionToOpen(): boolean {
    // If already open, no need to transition
    if (this.state === CircuitState.OPEN) {
      return false;
    }
    
    // Check consecutive failures threshold
    return this.consecutiveFailures >= this.options.failureThreshold;
  }
  
  /**
   * Check if the circuit should transition to HALF_OPEN state
   * 
   * @returns True if the circuit should transition to HALF_OPEN
   */
  private shouldTransitionToHalfOpen(): boolean {
    // Only transition from OPEN to HALF_OPEN
    if (this.state !== CircuitState.OPEN) {
      return false;
    }
    
    // Check if reset timeout has elapsed
    if (!this.lastOpenedAt) {
      return false;
    }
    
    return Date.now() - this.lastOpenedAt >= this.options.resetTimeoutMs;
  }
  
  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    // Only transition if not already open
    if (this.state === CircuitState.OPEN) {
      return;
    }
    
    const previousState = this.state;
    this.state = CircuitState.OPEN;
    this.lastOpenedAt = Date.now();
    this.consecutiveSuccesses = 0;
    
    // Schedule reset to HALF_OPEN
    this.scheduleReset();
    
    logger.warn(
      `Circuit breaker "${this.name}" transitioned from ${previousState} to ${this.state}`,
      LogCategory.PROVIDER,
      {
        ...this.context,
        previousState,
        newState: this.state,
        failureThreshold: this.options.failureThreshold,
        consecutiveFailures: this.consecutiveFailures,
        resetTimeoutMs: this.options.resetTimeoutMs
      }
    );
    
    // Record state change metric
    metrics.recordCounter(
      ProviderMetric.CIRCUIT_BREAKER_STATE_CHANGE,
      1,
      {
        provider: this.context.provider || 'unknown',
        provider_type: this.context.providerType || 'unknown',
        network: this.context.network || 'unknown',
        previous_state: previousState,
        new_state: this.state
      }
    );
  }
  
  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    // Only transition if not already half-open
    if (this.state === CircuitState.HALF_OPEN) {
      return;
    }
    
    const previousState = this.state;
    this.state = CircuitState.HALF_OPEN;
    this.lastHalfOpenedAt = Date.now();
    this.consecutiveSuccesses = 0;
    
    // Clear existing timeout if any
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
    
    logger.info(
      `Circuit breaker "${this.name}" transitioned from ${previousState} to ${this.state}`,
      LogCategory.PROVIDER,
      {
        ...this.context,
        previousState,
        newState: this.state,
        successThreshold: this.options.successThreshold
      }
    );
    
    // Record state change metric
    metrics.recordCounter(
      ProviderMetric.CIRCUIT_BREAKER_STATE_CHANGE,
      1,
      {
        provider: this.context.provider || 'unknown',
        provider_type: this.context.providerType || 'unknown',
        network: this.context.network || 'unknown',
        previous_state: previousState,
        new_state: this.state
      }
    );
  }
  
  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    // Only transition if not already closed
    if (this.state === CircuitState.CLOSED) {
      return;
    }
    
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    this.lastClosedAt = Date.now();
    this.consecutiveFailures = 0;
    
    // Clear existing timeout if any
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
    
    logger.info(
      `Circuit breaker "${this.name}" transitioned from ${previousState} to ${this.state}`,
      LogCategory.PROVIDER,
      {
        ...this.context,
        previousState,
        newState: this.state,
        consecutiveSuccesses: this.consecutiveSuccesses
      }
    );
    
    // Record state change metric
    metrics.recordCounter(
      ProviderMetric.CIRCUIT_BREAKER_STATE_CHANGE,
      1,
      {
        provider: this.context.provider || 'unknown',
        provider_type: this.context.providerType || 'unknown',
        network: this.context.network || 'unknown',
        previous_state: previousState,
        new_state: this.state
      }
    );
  }
  
  /**
   * Reset the circuit breaker to its initial state
   */
  public reset(): void {
    // Clear existing timeout if any
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
    
    // Reset state
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastClosedAt = Date.now();
    this.lastOpenedAt = null;
    this.lastHalfOpenedAt = null;
    
    logger.info(
      `Circuit breaker "${this.name}" reset to CLOSED`,
      LogCategory.PROVIDER,
      this.context
    );
    
    // Record metrics
    metrics.recordCounter(
      ProviderMetric.CIRCUIT_BREAKER_RESET,
      1,
      {
        circuit_breaker: this.name,
        provider: this.context.provider || 'unknown',
        provider_type: this.context.providerType || 'unknown',
        network: this.context.network || 'unknown'
      }
    );
  }
  
  /**
   * Get circuit breaker statistics
   * 
   * @returns Circuit breaker statistics
   */
  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
      lastOpenedAt: this.lastOpenedAt,
      lastClosedAt: this.lastClosedAt,
      lastHalfOpenedAt: this.lastHalfOpenedAt,
      resetAt: this.lastOpenedAt ? this.lastOpenedAt + this.options.resetTimeoutMs : null
    };
  }
  
  /**
   * Force the circuit breaker to a specific state
   * 
   * @param state State to transition to
   */
  public forceState(state: CircuitState): void {
    switch (state) {
      case CircuitState.OPEN:
        this.transitionToOpen();
        break;
      case CircuitState.HALF_OPEN:
        this.transitionToHalfOpen();
        break;
      case CircuitState.CLOSED:
        this.transitionToClosed();
        break;
    }
  }
  
  /**
   * Schedule reset timeout
   */
  private scheduleReset(): void {
    this.resetTimeout = setTimeout(() => {
      if (this.state === CircuitState.OPEN) {
        this.transitionToHalfOpen();
      }
    }, this.options.resetTimeoutMs);
  }
}
