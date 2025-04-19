/**
 * Database initialization service
 * Responsible for initializing the database connection
 */

import 'reflect-metadata';
import { AppDataSource } from '@infrastructure/config/typeorm.config';
import { logger, LogCategory } from '@infrastructure/utils/structured-logger';

export class DatabaseInitService {
  private static instance: DatabaseInitService;
  private initialized = false;

  /**
   * Get the singleton instance
   * @returns DatabaseInitService instance
   */
  public static getInstance(): DatabaseInitService {
    if (!DatabaseInitService.instance) {
      DatabaseInitService.instance = new DatabaseInitService();
    }
    return DatabaseInitService.instance;
  }

  /**
   * Initialize the database connection
   * @returns Promise that resolves when the database is initialized
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug('Database already initialized', LogCategory.DATABASE);
      return;
    }

    try {
      // Initialize TypeORM data source
      await AppDataSource.initialize();
      
      this.initialized = true;
      logger.info('Database connection established', LogCategory.DATABASE);
    } catch (error) {
      logger.error(
        'Failed to initialize database connection:',
        LogCategory.DATABASE,
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get the TypeORM data source
   * @returns TypeORM data source
   */
  public getDataSource() {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }
    return AppDataSource;
  }

  /**
   * Close the database connection
   * @returns Promise that resolves when the database connection is closed
   */
  public async close(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await AppDataSource.destroy();
      this.initialized = false;
      logger.info('Database connection closed', LogCategory.DATABASE);
    } catch (error) {
      logger.error(
        'Failed to close database connection:',
        LogCategory.DATABASE,
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }
}
