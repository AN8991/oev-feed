// Configuration options for retry mechanism
interface RetryOptions {
  maxAttempts?: number;     // Maximum number of retry attempts
  delay?: number;           // Initial delay between retries (ms)
  backoffFactor?: number;   // Multiplier for exponential backoff
  shouldRetry?: (error: any) => boolean; // Custom retry condition
}

// Retry a function with configurable retry strategy
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
  } = options;

  let lastError: any;
  let currentDelay = delay;

  // Attempt to execute the function with retries
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Stop retrying if max attempts reached or custom retry condition fails
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      // Wait before next retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffFactor;
    }
  }

  throw lastError;
}
