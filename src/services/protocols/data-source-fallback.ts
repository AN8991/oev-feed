import { log } from '../../utils/logger';
import { retry } from '../../utils/retry';
import { DataSourceType } from '../../types/protocols';

// Configuration for data source fallback
export interface DataSourceFallbackConfig {
  primarySource: DataSourceType;
  fallbackSources: DataSourceType[];
  maxRetries?: number;
  retryDelay?: number;
  retryBackoffFactor?: number;
}

export class DataSourceFallbackService {
  private static instance: DataSourceFallbackService;
  private fallbackConfigs: Map<string, DataSourceFallbackConfig> = new Map();

  private constructor() {}

  static getInstance(): DataSourceFallbackService {
    if (!DataSourceFallbackService.instance) {
      DataSourceFallbackService.instance = new DataSourceFallbackService();
    }
    return DataSourceFallbackService.instance;
  }

  // Configure fallback strategy for a protocol
  configureFallback(protocolKey: string, config: DataSourceFallbackConfig): void {
    this.fallbackConfigs.set(protocolKey, config);
    log.info(`Configured data source fallback for ${protocolKey}`, { 
      primarySource: config.primarySource,
      fallbackSources: config.fallbackSources
    });
  }

  // Get fallback configuration for a protocol
  getFallbackConfig(protocolKey: string): DataSourceFallbackConfig | undefined {
    return this.fallbackConfigs.get(protocolKey);
  }

  // Execute an operation with data source fallback
  async executeWithFallback<T>(
    protocolKey: string,
    operations: Record<DataSourceType, () => Promise<T>>,
    context: string = 'data source operation'
  ): Promise<T> {
    const fallbackConfig = this.fallbackConfigs.get(protocolKey);
    
    if (!fallbackConfig) {
      throw new Error(`No fallback configuration for protocol: ${protocolKey}`);
    }

    const { 
      primarySource, 
      fallbackSources, 
      maxRetries = 3,
      retryDelay = 1000,
      retryBackoffFactor = 2
    } = fallbackConfig;

    // Try with primary data source first
    try {
      log.info(`Attempting operation with primary data source`, { 
        protocol: protocolKey, 
        dataSource: primarySource,
        context
      });
      
      const primaryOperation = operations[primarySource];
      if (!primaryOperation) {
        throw new Error(`No operation defined for data source: ${primarySource}`);
      }
      
      // Retry with primary data source
      return await retry(
        primaryOperation,
        {
          maxAttempts: maxRetries,
          delay: retryDelay,
          backoffFactor: retryBackoffFactor,
          shouldRetry: (error) => this.isRetryableError(error)
        }
      );
    } catch (error) {
      log.warn(`Primary data source failed, trying fallbacks`, { 
        protocol: protocolKey, 
        primarySource,
        error,
        context
      });

      // Try each fallback data source in sequence
      for (const fallbackSource of fallbackSources) {
        try {
          log.info(`Attempting operation with fallback data source`, { 
            protocol: protocolKey, 
            dataSource: fallbackSource,
            context
          });
          
          const fallbackOperation = operations[fallbackSource];
          if (!fallbackOperation) {
            log.warn(`No operation defined for data source: ${fallbackSource}`, {
              protocol: protocolKey
            });
            continue;
          }
          
          // Retry with fallback data source
          return await retry(
            fallbackOperation,
            {
              maxAttempts: maxRetries,
              delay: retryDelay,
              backoffFactor: retryBackoffFactor,
              shouldRetry: (error) => this.isRetryableError(error)
            }
          );
        } catch (fallbackError) {
          log.warn(`Fallback data source failed`, { 
            protocol: protocolKey, 
            dataSource: fallbackSource,
            error: fallbackError,
            context
          });
          // Continue to next fallback
        }
      }

      // If we get here, all data sources failed
      log.error(`All data sources failed for operation`, { 
        protocol: protocolKey, 
        primarySource,
        fallbackSources,
        error,
        context
      });
      
      // Type-check the error before accessing its properties
      const errorMessage = error instanceof Error 
        ? error.message 
        : String(error);
      
      throw new Error(`All data sources failed for ${context} on ${protocolKey}: ${errorMessage}`);
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
