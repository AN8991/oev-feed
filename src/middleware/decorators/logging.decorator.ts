/**
 * Logging Decorator
 * Method-level decorator for logging control
 */

import { SetMetadata } from '@nestjs/common';

export const LOGGING_KEY = 'logging';

export interface LoggingOptions {
  enabled?: boolean;
  level?: 'debug' | 'info' | 'warn' | 'error';
  includeArgs?: boolean;
  includeResult?: boolean;
  message?: string;
}

/**
 * Configure logging for a method
 * @param options Logging configuration options
 */
export const LogExecution = (options: LoggingOptions = {}) =>
  SetMetadata(LOGGING_KEY, { 
    enabled: true, 
    level: 'info',
    includeArgs: false,
    includeResult: false,
    ...options 
  });

/**
 * Disable logging for a specific method
 */
export const NoLogging = () =>
  SetMetadata(LOGGING_KEY, { enabled: false });
