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
  return error.message;
}
