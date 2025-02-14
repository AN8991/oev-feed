import winston from 'winston';

// Universal logging utility with server-side support
const log = {
  // Log informational messages with optional metadata
  info: (message: string, meta?: any) => {
    const logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        })
      ],
    });
    logger.info(message, meta);
  },

  // Log error messages with optional metadata
  error: (message: string, meta?: any) => {
    const logger = winston.createLogger({
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        })
      ],
    });
    logger.error(message, meta);
  },

  // Log warning messages with optional metadata
  warn: (message: string, meta?: any) => {
    const logger = winston.createLogger({
      level: 'warn',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        })
      ],
    });
    logger.warn(message, meta);
  },

  // Log debug messages with optional metadata
  debug: (message: string, meta?: any) => {
    const logger = winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        })
      ],
    });
    logger.debug(message, meta);
  }
};

export { log };
