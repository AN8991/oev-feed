/**
 * Part of the infrastructure layer in hexagonal architecture
 * Provides fallback mechanisms between different data sources
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSourceType } from '../../domain/types/data-source.types';

//Data source fallback options
export interface DataSourceFallbackOptions {
  //Maximum number of retry attempts for each data source. Default: 3
  maxRetryAttempts: number;
  
  //Initial backoff delay in milliseconds. Default: 200ms
  initialBackoffMs: number;
  
  //Maximum backoff delay in milliseconds. Default: 10000ms (10 seconds)
  maxBackoffMs: number;
  
  //Context for logging
  context: {
    protocol?: string;
    network?: string;
    operation?: string;
  };
}

//Default options for data source fallback
const DEFAULT_OPTIONS: DataSourceFallbackOptions = {
  maxRetryAttempts: 3,
  initialBackoffMs: 200,
  maxBackoffMs: 10000,
  context: {}
};

//Data source fallback service
@Injectable()
export class DataSourceFallback {
  private readonly logger = new Logger(DataSourceFallback.name);
  private options: DataSourceFallbackOptions;
  
  constructor() {
    this.options = DEFAULT_OPTIONS;
  }
  
  /**
   * Execute an operation with data source fallback
   * 
   * @param sources Data source operations to try in order
   * @returns Result of the first successful operation
   * @throws Error if all data sources fail
   */
  public async execute<T>(
    sources: Record<DataSourceType, () => Promise<T>>
  ): Promise<{ result: T; source: DataSourceType }> {
    const sourceTypes = Object.keys(sources) as DataSourceType[];
    
    for (const sourceType of sourceTypes) {
      const operation = sources[sourceType];
      
      try {
        const result = await operation();
        this.logger.debug(`Data source ${sourceType} succeeded`);
        return { result, source: sourceType };
      } catch (error) {
        this.logger.error(`Data source ${sourceType} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    throw new Error('All data sources failed');
  }
  
}
