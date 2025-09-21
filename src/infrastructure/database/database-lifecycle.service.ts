/**
 * Database Lifecycle Service
 * 
 * Handles database connection lifecycle using proper NestJS patterns
 * This service is part of the infrastructure layer and manages TypeORM DataSource
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseLifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseLifecycleService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  /**
   * NestJS lifecycle hook - called when module is initialized
   */
  async onModuleInit(): Promise<void> {
    if (this.dataSource.isInitialized) {
      this.logger.log('Database connection established successfully');
      this.logConnectionInfo();
      return;
    }

    this.logger.warn('Database connection not initialized - this should be handled by TypeORM module');
  }

  /**
   * NestJS lifecycle hook - called when module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    if (this.dataSource.isInitialized) {
      this.logger.log('Database connection will be closed by NestJS TypeORM module');
    }
  }

  /**
   * Get the TypeORM data source
   * @returns TypeORM data source
   */
  public getDataSource(): DataSource {
    if (!this.dataSource.isInitialized) {
      throw new Error('Database connection is not initialized');
    }
    return this.dataSource;
  }

  /**
   * Check if database is connected and healthy
   */
  public async isHealthy(): Promise<boolean> {
    try {
      if (!this.dataSource.isInitialized) {
        return false;
      }

      // Simple health check query
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database connection information
   */
  public getConnectionInfo(): {
    isInitialized: boolean;
    database?: string;
    host?: string;
    port?: number;
    type?: string;
  } {
    if (!this.dataSource.isInitialized) {
      return { isInitialized: false };
    }

    const options = this.dataSource.options;
    return {
      isInitialized: true,
      database: 'database' in options ? options.database as string : undefined,
      host: 'host' in options ? options.host as string : undefined,
      port: 'port' in options ? options.port as number : undefined,
      type: options.type,
    };
  }

  /**
   * Log connection information
   */
  private logConnectionInfo(): void {
    const info = this.getConnectionInfo();
    if (info.isInitialized) {
      this.logger.log(`Connected to ${info.type} database: ${info.database} at ${info.host}:${info.port}`);
    }
  }
}
