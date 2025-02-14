import { log } from './logger';

// Custom error for rate limit exceeded scenarios
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Check if an error is related to rate limiting
export function isRateLimitError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorString = error.toString().toLowerCase();
  
  return (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('compute units') ||
    errorString.includes('429') ||
    errorString.includes('rate limit') ||
    errorString.includes('too many requests')
  );
}

// Handle rate limit errors by logging and throwing a custom error
export function handleRateLimit(error: any): never {
  log.error('Rate limit exceeded', { error });
  throw new RateLimitError('API rate limit exceeded. Please try again later.');
}
