import winston from 'winston';

/**
 * Enum for log categories
 */
export enum LogCategory {
  GENERAL = 'general',
  PROVIDER = 'provider',
  DATABASE = 'database',
  QUERY = 'query',
  ERROR = 'error',
  CONFIG = 'config',
  NETWORK = 'network',
  PERFORMANCE = 'performance'
}

/**
 * Create a logger instance with custom configuration
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'oev-feed' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport for errors
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    // File transport for combined logs
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});
