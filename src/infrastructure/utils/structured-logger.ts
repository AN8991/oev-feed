/**
 * Structured Logger
 * 
 * Part of the infrastructure layer in hexagonal architecture
 * Provides logging capabilities across all layers of the application
 */

import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

/**
 * Log categories for better filtering
 */
export enum LogCategory {
  PROVIDER = 'provider',
  NETWORK = 'network',
  CONFIG = 'config',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  GENERAL = 'general',
  DATABASE = 'database'
}

/**
 * Log context interface
 */
export interface LogContext {
  /**
   * Provider name (if applicable)
   */
  provider?: string;
  
  /**
   * Provider type (if applicable)
   */
  providerType?: string;
  
  /**
   * Network name (if applicable)
   */
  network?: string;
  
  /**
   * Operation being performed
   */
  operation?: string;
  
  /**
   * Duration of operation in milliseconds
   */
  durationMs?: number;
  
  /**
   * Request ID for tracking related log entries
   */
  requestId?: string;
  
  /**
   * Additional context data
   */
  [key: string]: any;
}

// Import Winston types
import { Logger as WinstonLogger, format, transports, createLogger } from 'winston';

// Define provider filter
const providerFilter = format((info: any) => info.category === LogCategory.PROVIDER ? info : false);

/**
 * Structured logger class
 */
export class StructuredLogger {
  private static instance: StructuredLogger;
  private logDir: string;
  private logger: WinstonLogger;
  
  /**
   * Constructor
   */
  private constructor() {
    // Create logs directory if it doesn't exist
    this.logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    // Define transports array
    const logTransports = [
      // Console transport with colorization
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.printf(({ timestamp, level, message, category, context, ...rest }) => {
            const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
            const categoryStr = category ? `[${category}]` : '';
            return `${timestamp} ${level} ${categoryStr}: ${message}${contextStr}`;
          })
        )
      }),
      // File transport for all logs
      new transports.File({ 
        filename: path.join(this.logDir, 'combined.log'),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      }),
      // File transport for error logs
      new transports.File({ 
        filename: path.join(this.logDir, 'error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      }),
      // Provider-specific transport
      new transports.File({
        filename: path.join(this.logDir, 'provider.log'),
        level: 'debug',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true,
        format: format.combine(
          providerFilter(),
          format.timestamp(),
          format.json()
        )
      })
    ];
    
    // Create Winston logger with all transports
    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp(),
        format.json()
      ),
      defaultMeta: { service: 'oev-feed' },
      transports: logTransports
    });
  }
  
  /**
   * Get logger instance (singleton)
   */
  public static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }
  
  /**
   * Log a message with the specified level, category, and context
   * @param level Log level
   * @param message Message to log
   * @param category Log category
   * @param context Additional context
   */
  public log(level: LogLevel, message: string, category: LogCategory = LogCategory.GENERAL, context?: LogContext): void {
    // Winston expects the first argument to be a string
    this.logger.log(level, message, {
      category,
      context,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Log an info message
   * @param message Message to log
   * @param category Log category
   * @param context Additional context
   */
  public info(message: string, category: LogCategory = LogCategory.GENERAL, context?: LogContext): void {
    this.log(LogLevel.INFO, message, category, context);
  }
  
  /**
   * Log an error message
   * @param message Message to log
   * @param category Log category
   * @param context Additional context
   * @param error Error object
   */
  public error(message: string, category: LogCategory = LogCategory.GENERAL, context?: LogContext, error?: Error): void {
    const enhancedContext = { ...context };
    
    if (error) {
      enhancedContext.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }
    
    this.log(LogLevel.ERROR, message, category, enhancedContext);
  }
  
  /**
   * Log a warning message
   * @param message Message to log
   * @param category Log category
   * @param context Additional context
   */
  public warn(message: string, category: LogCategory = LogCategory.GENERAL, context?: LogContext): void {
    this.log(LogLevel.WARN, message, category, context);
  }
  
  /**
   * Log a debug message
   * @param message Message to log
   * @param category Log category
   * @param context Additional context
   */
  public debug(message: string, category: LogCategory = LogCategory.GENERAL, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, category, context);
  }
  
  /**
   * Log a verbose message
   * @param message Message to log
   * @param category Log category
   * @param context Additional context
   */
  public verbose(message: string, category: LogCategory = LogCategory.GENERAL, context?: LogContext): void {
    this.log(LogLevel.VERBOSE, message, category, context);
  }
  
  /**
   * Log provider operation
   * @param message Message to log
   * @param level Log level
   * @param context Provider context
   */
  public logProviderOperation(message: string, level: LogLevel = LogLevel.INFO, context: LogContext): void {
    this.log(level, message, LogCategory.PROVIDER, context);
  }
  
  /**
   * Log provider performance
   * @param operation Operation name
   * @param durationMs Duration in milliseconds
   * @param success Whether the operation was successful
   * @param context Provider context
   */
  public logProviderPerformance(operation: string, durationMs: number, success: boolean, context: LogContext): void {
    const enhancedContext = {
      ...context,
      operation,
      durationMs,
      success
    };
    
    this.log(
      success ? LogLevel.DEBUG : LogLevel.WARN,
      `Provider operation ${operation} ${success ? 'succeeded' : 'failed'} in ${durationMs}ms`,
      LogCategory.PERFORMANCE,
      enhancedContext
    );
  }
}

// Export singleton instance
export const logger = StructuredLogger.getInstance();
