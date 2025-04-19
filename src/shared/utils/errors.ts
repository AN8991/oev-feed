/**
 * Shared error handling utilities
 * 
 * Part of the shared layer in hexagonal architecture
 * Contains error classes and utilities used across multiple layers
 */

import { logger, LogCategory } from '@infrastructure/utils/structured-logger';

// Custom error for protocol-specific exceptions
export class ProtocolError extends Error {
  constructor(
    message: string,
    public readonly protocol: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ProtocolError';
    
    // Log the error
    logger.error(
      `Protocol Error (${protocol}): ${message}`,
      LogCategory.GENERAL,
      { protocol, code, originalError: originalError?.message }
    );
  }
}

// Custom error for network-related issues
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly network: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
    
    // Log the error
    logger.error(
      `Network Error (${network}): ${message}`,
      LogCategory.NETWORK,
      { network, originalError: originalError?.message }
    );
  }
}

// Custom error for subgraph query problems
export class SubgraphError extends Error {
  constructor(
    message: string,
    public readonly endpoint: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'SubgraphError';
    
    // Log the error
    logger.error(
      `Subgraph Error: ${message}`,
      LogCategory.NETWORK,
      { endpoint, originalError: originalError?.message }
    );
  }
}

// Custom error for provider-specific issues
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerName: string,
    public readonly providerType: string,
    public readonly code: string,
    public readonly isTransient: boolean = false,
    public readonly isRateLimit: boolean = false,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
    
    // Log the error
    logger.error(
      `Provider Error (${providerName}): ${message}`,
      LogCategory.PROVIDER,
      { 
        providerName, 
        providerType, 
        code, 
        isTransient, 
        isRateLimit,
        originalError: originalError?.message 
      }
    );
  }
}

// Standardized error codes for consistent error handling
export const ERROR_CODES = {
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE',
  SUBGRAPH_ERROR: 'SUBGRAPH_ERROR',
  CONTRACT_ERROR: 'CONTRACT_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  NO_POSITIONS: 'NO_POSITIONS',
  RATE_LIMIT: 'RATE_LIMIT',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  PROVIDER_RATE_LIMIT: 'PROVIDER_RATE_LIMIT',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  TEMPORARY_FAILURE: 'TEMPORARY_FAILURE',
  PERMANENT_FAILURE: 'PERMANENT_FAILURE',
} as const;

// Generate a formatted error message based on error type
export function getErrorMessage(error: Error): string {
  if (error instanceof ProtocolError) {
    return `Protocol Error (${error.protocol}): ${error.message}`;
  }
  if (error instanceof NetworkError) {
    return `Network Error (${error.network}): ${error.message}`;
  }
  if (error instanceof SubgraphError) {
    return `Subgraph Error: ${error.message}`;
  }
  if (error instanceof ProviderError) {
    return `Provider Error (${error.providerName}): ${error.message}`;
  }
  return error.message;
}

/**
 * Check if an error is related to rate limiting
 * @param error The error to check
 * @returns True if the error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof ProviderError) {
    return error.isRateLimit;
  }
  
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message?.toLowerCase() : String(error).toLowerCase();
  
  return (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('compute units') ||
    errorMessage.includes('429') ||
    errorMessage.includes('exceeded')
  );
}

/**
 * Check if an error is transient (temporary) and can be retried
 * @param error The error to check
 * @returns True if the error is transient
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof ProviderError) {
    return error.isTransient;
  }
  
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message?.toLowerCase() : String(error).toLowerCase();
  
  return (
    isRateLimitError(error) ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('network') ||
    errorMessage.includes('temporarily') ||
    errorMessage.includes('socket') ||
    errorMessage.includes('econnreset') ||
    errorMessage.includes('econnrefused')
  );
}
