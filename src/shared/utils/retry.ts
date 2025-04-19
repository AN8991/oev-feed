/**
 * Retry Utility
 * 
 * Part of the shared layer in hexagonal architecture
 * Provides retry functionality for operations that may fail transiently
 */

import { logger, LogCategory, LogContext } from '@infrastructure/utils/structured-logger';

// Configuration options for retry mechanism
export interface RetryOptions {
  maxAttempts?: number;     // Maximum number of retry attempts
  delay?: number;           // Initial delay between retries (ms)
  backoffFactor?: number;   // Multiplier for exponential backoff
  shouldRetry?: (error: unknown) => boolean; // Custom retry condition
  onRetry?: (attempt: number, error: unknown) => void; // Callback on retry
  context?: LogContext;     // Context for logging
}

/**
 * Retry a function with configurable retry strategy
 * 
 * @param fn Function to execute and potentially retry
 * @param options Configuration options for retry behavior
 * @returns Promise resolving to the function result
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  // Set default retry configuration
  const {
    maxAttempts = 3,
    delay = 1000,
    backoffFactor = 2,
    shouldRetry = () => true,
    onRetry = () => {},
    context = { operation: 'retry' }
  } = options;

  let lastError: unknown;
  let currentDelay = delay;

  // Attempt to execute the function with retries
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Log retry attempt
      logger.debug(
        `Retry attempt ${attempt}/${maxAttempts} failed`,
        LogCategory.NETWORK,
        {
          ...context,
          error: error instanceof Error ? error.message : String(error),
          attempt,
          maxAttempts,
          delay: currentDelay
        }
      );
      
      // Stop retrying if max attempts reached or custom retry condition fails
      if (attempt === maxAttempts || !shouldRetry(error)) {
        logger.warn(
          `Retry exhausted after ${attempt} attempts`,
          LogCategory.NETWORK,
          {
            ...context,
            error: error instanceof Error ? error.message : String(error)
          }
        );
        throw error;
      }

      // Execute onRetry callback
      onRetry(attempt, error);

      // Wait before next retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffFactor;
    }
  }

  throw lastError;
}

/**
 * Creates a retryable version of a function
 * 
 * @param fn Function to make retryable
 * @param options Retry configuration options
 * @returns A wrapped function that will retry on failure
 */
export function createRetryableFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return ((...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return retry(() => fn(...args), options);
  });
}
