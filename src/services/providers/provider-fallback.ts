import { ethers } from 'ethers';
import { Network } from '../../types/networks';
import { log } from '../../utils/logger';
import { retry } from '../../utils/retry';
import { ProviderManager } from './provider-manager';

// Configuration for provider fallback
export interface ProviderFallbackConfig {
  primaryProviderKey: string;
  fallbackProviderKeys: string[];
  maxRetries?: number;
  retryDelay?: number;
  retryBackoffFactor?: number;
}

export class ProviderFallbackService {
  private static instance: ProviderFallbackService;
  private providerManager: ProviderManager;
  private fallbackConfigs: Map<Network, ProviderFallbackConfig> = new Map();

  private constructor() {
    this.providerManager = ProviderManager.getInstance();
  }

  static getInstance(): ProviderFallbackService {
    if (!ProviderFallbackService.instance) {
      ProviderFallbackService.instance = new ProviderFallbackService();
    }
    return ProviderFallbackService.instance;
  }

  // Configure fallback strategy for a network
  configureFallback(network: Network, config: ProviderFallbackConfig): void {
    this.fallbackConfigs.set(network, config);
    log.info(`Configured provider fallback for ${network}`, { 
      primaryProvider: config.primaryProviderKey,
      fallbackProviders: config.fallbackProviderKeys
    });
  }

  // Get fallback configuration for a network
  getFallbackConfig(network: Network): ProviderFallbackConfig | undefined {
    return this.fallbackConfigs.get(network);
  }

  // Execute an operation with provider fallback.
  async executeWithFallback<T>(
    network: Network,
    operation: (provider: ethers.JsonRpcProvider) => Promise<T>,
    context: string = 'provider operation'
  ): Promise<T> {
    const fallbackConfig = this.fallbackConfigs.get(network);
    
    if (!fallbackConfig) {
      throw new Error(`No fallback configuration for network: ${network}`);
    }

    const { 
      primaryProviderKey, 
      fallbackProviderKeys, 
      maxRetries = 3,
      retryDelay = 1000,
      retryBackoffFactor = 2
    } = fallbackConfig;

    // Try with primary provider first
    try {
      log.info(`Attempting operation with primary provider`, { 
        network, 
        providerKey: primaryProviderKey,
        context
      });
      
      const primaryProvider = await this.providerManager.getProvider(primaryProviderKey);
      
      // Retry with primary provider
      return await retry(
        () => operation(primaryProvider),
        {
          maxAttempts: maxRetries,
          delay: retryDelay,
          backoffFactor: retryBackoffFactor,
          shouldRetry: (error) => this.isRetryableError(error)
        }
      );
    } catch (error) {
      log.warn(`Primary provider failed, trying fallbacks`, { 
        network, 
        primaryProviderKey,
        error,
        context
      });

      // Try each fallback provider in sequence
      for (const fallbackKey of fallbackProviderKeys) {
        try {
          log.info(`Attempting operation with fallback provider`, { 
            network, 
            providerKey: fallbackKey,
            context
          });
          
          const fallbackProvider = await this.providerManager.getProvider(fallbackKey);
          
          // Retry with fallback provider
          return await retry(
            () => operation(fallbackProvider),
            {
              maxAttempts: maxRetries,
              delay: retryDelay,
              backoffFactor: retryBackoffFactor,
              shouldRetry: (error) => this.isRetryableError(error)
            }
          );
        } catch (fallbackError) {
          log.warn(`Fallback provider failed`, { 
            network, 
            providerKey: fallbackKey,
            error: fallbackError,
            context
          });
          // Continue to next fallback
        }
      }

      // If we get here, all providers failed
      log.error(`All providers failed for operation`, { 
        network, 
        primaryProvider: primaryProviderKey,
        fallbackProviders: fallbackProviderKeys,
        error,
        context
      });
      
      // Type-check the error before accessing its properties
      const errorMessage = error instanceof Error 
        ? error.message 
        : String(error);
      
      throw new Error(`All providers failed for ${context} on ${network}: ${errorMessage}`);
    }
  }

  // Determine if an error is retryable
  private isRetryableError(error: unknown): boolean {
    // If error is not an object, we can't check its properties
    if (error === null || typeof error !== 'object') {
      return false;
    }
    
    // Type assertion to access properties safely
    const err = error as { code?: string | number; message?: string };
    
    // Network errors are typically retryable
    if (err.code === 'NETWORK_ERROR' || 
        err.code === 'TIMEOUT' || 
        err.code === 'SERVER_ERROR' ||
        err.message?.includes('timeout') ||
        err.message?.includes('connection') ||
        err.message?.includes('network')) {
      return true;
    }
    
    // Rate limiting errors
    if (err.code === 429 || 
        err.message?.includes('rate limit') ||
        err.message?.includes('too many requests')) {
      return true;
    }
    
    // Data source specific errors that might be transient
    if (err.message?.includes('syncing') ||
        err.message?.includes('not up to date') ||
        err.message?.includes('temporarily unavailable')) {
      return true;
    }
    
    // Default to not retrying for other errors
    return false;
  }
}
