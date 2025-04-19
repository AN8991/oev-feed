/**
 * Exponential Backoff Implementation
 * 
 * Part of the shared layer in hexagonal architecture
 * Provides retry functionality with exponential backoff for resilient operations
 */

import { logger, LogCategory, LogContext } from '@infrastructure/utils/structured-logger';
import { metrics, ProviderMetric } from '@infrastructure/utils/metrics-collector';

/**
 * Backoff strategy options
 */
export interface BackoffOptions {
  /**
   * Initial delay in milliseconds
   * Default: 100ms
   */
  initialDelayMs: number;
  
  /**
   * Maximum delay in milliseconds
   * Default: 30000ms (30 seconds)
   */
  maxDelayMs: number;
  
  /**
   * Backoff factor (how quickly the delay increases)
   * Default: 2 (exponential backoff)
   */
  factor: number;
  
  /**
   * Maximum number of retry attempts
   * Default: 5
   */
  maxAttempts: number;
  
  /**
   * Jitter to add randomness to the backoff (0-1)
   * Default: 0.1 (10% jitter)
   */
  jitter: number;
}

/**
 * Default backoff options
 */
const DEFAULT_BACKOFF_OPTIONS: BackoffOptions = {
  initialDelayMs: 100,
  maxDelayMs: 30000,
  factor: 2,
  maxAttempts: 5,
  jitter: 0.1
};

/**
 * Retry result
 */
export interface RetryResult<T> {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Result of the operation (if successful)
   */
  result?: T;
  
  /**
   * Error that occurred (if unsuccessful)
   */
  error?: Error;
  
  /**
   * Number of attempts made
   */
  attempts: number;
  
  /**
   * Total time elapsed in milliseconds
   */
  elapsedMs: number;
}

/**
 * Executes a function with exponential backoff retry logic
 * 
 * @param operation Function to execute
 * @param shouldRetry Function that determines if a retry should be attempted based on the error
 * @param options Backoff options
 * @param context Context for logging
 * @returns Promise that resolves with the retry result
 */
export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  shouldRetry: (error: Error) => boolean,
  options: Partial<BackoffOptions> = {},
  context: Record<string, any> = {}
): Promise<RetryResult<T>> {
  const backoffOptions: BackoffOptions = {
    ...DEFAULT_BACKOFF_OPTIONS,
    ...options
  };
  
  let attempts = 0;
  let lastError: Error | undefined;
  const startTime = Date.now();
  
  const logContext: LogContext = {
    ...context,
    operation: context.operation || 'backoff'
  };
  
  while (attempts < backoffOptions.maxAttempts) {
    try {
      // Increment attempt counter
      attempts++;
      
      // Execute the operation
      const result = await operation();
      
      // Log success
      logger.debug(
        `Operation succeeded after ${attempts} attempt(s)`,
        LogCategory.PROVIDER,
        {
          ...logContext,
          attempts,
          elapsedMs: Date.now() - startTime
        }
      );
      
      // Record metrics
      metrics.recordCounter(
        ProviderMetric.BACKOFF_ATTEMPTS,
        attempts,
        {
          provider: context.provider || 'unknown',
          provider_type: context.providerType || 'unknown',
          network: context.network || 'unknown',
          operation: context.operation || 'unknown',
          success: 'true'
        }
      );
      
      // Record success metric if we had to retry (attempts > 1)
      if (attempts > 1) {
        metrics.recordCounter(
          ProviderMetric.BACKOFF_SUCCESS,
          1,
          {
            provider: context.provider || 'unknown',
            provider_type: context.providerType || 'unknown',
            network: context.network || 'unknown',
            operation: context.operation || 'unknown',
            attempts: attempts.toString()
          }
        );
      }
      
      // Return successful result
      return {
        success: true,
        result,
        attempts,
        elapsedMs: Date.now() - startTime
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      if (!shouldRetry(lastError) || attempts >= backoffOptions.maxAttempts) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = calculateBackoffDelay(attempts, backoffOptions);
      
      // Log retry attempt
      logger.debug(
        `Retrying operation after ${delay}ms (attempt ${attempts}/${backoffOptions.maxAttempts})`,
        LogCategory.PROVIDER,
        {
          ...logContext,
          attempts,
          delay,
          error: lastError.message
        }
      );
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // Log failure
  if (lastError) {
    logger.error(
      `Operation failed after ${attempts} attempt(s)`,
      LogCategory.PROVIDER,
      {
        ...logContext,
        attempts,
        elapsedMs: Date.now() - startTime
      },
      lastError
    );
    
    // Record metrics
    metrics.recordCounter(
      ProviderMetric.BACKOFF_ATTEMPTS,
      attempts,
      {
        provider: context.provider || 'unknown',
        provider_type: context.providerType || 'unknown',
        network: context.network || 'unknown',
        operation: context.operation || 'unknown',
        success: 'false'
      }
    );
    
    // Record failure metric
    metrics.recordCounter(
      ProviderMetric.BACKOFF_FAILURE,
      1,
      {
        provider: context.provider || 'unknown',
        provider_type: context.providerType || 'unknown',
        network: context.network || 'unknown',
        operation: context.operation || 'unknown',
        attempts: attempts.toString(),
        error_type: lastError.name,
        error_message: lastError.message.substring(0, 100) // Truncate long messages
      }
    );
  }
  
  // Return failed result
  return {
    success: false,
    error: lastError,
    attempts,
    elapsedMs: Date.now() - startTime
  };
}

/**
 * Calculate backoff delay with jitter
 * 
 * @param attempt Current attempt number (1-based)
 * @param options Backoff options
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number, options: BackoffOptions): number {
  // Calculate base delay: initialDelay * (factor ^ (attempt - 1))
  const baseDelay = options.initialDelayMs * Math.pow(options.factor, attempt - 1);
  
  // Apply maximum delay constraint
  const cappedDelay = Math.min(baseDelay, options.maxDelayMs);
  
  // Apply jitter to prevent synchronized retries
  const jitterAmount = cappedDelay * options.jitter;
  const jitter = Math.random() * jitterAmount * 2 - jitterAmount; // Random value between -jitterAmount and +jitterAmount
  
  return Math.max(0, Math.floor(cappedDelay + jitter));
}

/**
 * Sleep for a specified duration
 * 
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determine if an error is related to rate limiting
 * 
 * @param error Error to check
 * @returns True if the error is related to rate limiting
 */
export function isRateLimitError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  return (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('exceeded') ||
    errorMessage.includes('throttle') ||
    errorMessage.includes('429')
  );
}

/**
 * Determine if an error is transient (temporary) and should be retried
 * 
 * @param error Error to check
 * @returns True if the error is transient
 */
export function isTransientError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  return (
    isRateLimitError(error) ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('network') ||
    errorMessage.includes('temporarily') ||
    errorMessage.includes('socket') ||
    errorMessage.includes('econnreset') ||
    errorMessage.includes('econnrefused')
  );
}
