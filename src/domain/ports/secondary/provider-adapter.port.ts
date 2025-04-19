import { Provider, Contract } from 'ethers';

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  /**
   * API key for the provider
   */
  apiKey: string;
  
  /**
   * Network name (e.g., 'mainnet', 'optimism', 'arbitrum')
   */
  network: string;
  
  /**
   * Optional configuration parameters specific to the provider
   */
  options?: Record<string, any>;
}

/**
 * Rate limit status interface
 */
export interface RateLimitStatus {
  /**
   * Remaining requests in the current period
   */
  remaining: number;
  
  /**
   * Total requests allowed in the period
   */
  limit: number;
  
  /**
   * When the rate limit resets (timestamp in milliseconds)
   */
  resetTimestamp: number;
}

/**
 * Provider statistics
 */
export interface ProviderStats {
  /**
   * Total number of requests made
   */
  requestCount: number;
  
  /**
   * Total number of failed requests
   */
  failureCount: number;
  
  /**
   * Average response time in milliseconds
   */
  averageResponseTime: number;
  
  /**
   * Last request timestamp
   */
  lastRequestTimestamp: number;
  
  /**
   * Current rate limit status (if available)
   */
  rateLimitStatus?: RateLimitStatus;
  
  /**
   * Circuit breaker state (if available)
   */
  circuitBreakerState?: string;
  
  /**
   * Number of consecutive circuit breaker failures (if available)
   */
  circuitBreakerFailures?: number;
  
  /**
   * Timestamp when the circuit breaker will reset (if in open state)
   */
  circuitBreakerResetAt?: number | null;
  
  /**
   * Number of retry attempts made (if available)
   */
  retryAttempts?: number;
  
  /**
   * Number of successful retries (if available)
   */
  retrySuccesses?: number;
  
  /**
   * Number of failed retries (if available)
   */
  retryFailures?: number;
}

/**
 * Secondary port for blockchain provider adapters
 */
export interface ProviderAdapterPort {
  /**
   * Get the provider name
   */
  readonly name: string;
  
  /**
   * Get the provider type
   */
  readonly type: string;
  
  /**
   * Get the network
   */
  readonly network: string;
  
  /**
   * Get the underlying ethers provider
   */
  readonly provider: Provider;
  
  /**
   * Get the provider name
   * @returns Provider name
   */
  getName(): string;
  
  /**
   * Get the provider type
   * @returns Provider type
   */
  getType(): string;
  
  /**
   * Initialize the provider
   */
  initialize(): Promise<void>;
  
  /**
   * Check if the provider is healthy
   * @returns True if the provider is healthy, false otherwise
   */
  isHealthy(): Promise<boolean>;
  
  /**
   * Get provider statistics
   * @returns Provider statistics
   */
  getStats(): ProviderStats;
  
  /**
   * Create a contract instance
   * @param address Contract address
   * @param abi Contract ABI
   * @returns Contract instance
   */
  getContract(address: string, abi: any[]): Contract;
  
  /**
   * Get the current block number
   * @returns Current block number
   */
  getBlockNumber(): Promise<number>;
  
  /**
   * Get the balance of an address
   * @param address Address to get balance for
   * @returns Balance in wei
   */
  getBalance(address: string): Promise<bigint>;
  
  /**
   * Clean up resources
   */
  cleanup(): Promise<void>;
}
