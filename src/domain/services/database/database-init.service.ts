/**
 * Database initialization service
 * Responsible for initializing the database connection using NestJS DI
 */

import 'reflect-metadata';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseInitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  /**
   * NestJS lifecycle hook - called when module is initialized
   */
  async onModuleInit(): Promise<void> {
    if (this.dataSource.isInitialized) {
      this.logger.debug('Database already initialized');
      return;
    }

    try {
      // DataSource is automatically initialized by @nestjs/typeorm
      this.logger.log('Database connection established via NestJS TypeORM');
    } catch (error) {
      this.logger.error(`Failed to initialize database connection: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * NestJS lifecycle hook - called when module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      return;
    }

    try {
      // DataSource is automatically destroyed by @nestjs/typeorm
      this.logger.log('Database connection will be closed by NestJS TypeORM');
    } catch (error) {
      this.logger.error(`Failed to close database connection: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get the TypeORM data source
   * @returns TypeORM data source
   */
  public getDataSource(): DataSource {
    if (!this.dataSource.isInitialized) {
      throw new Error('Database not initialized');
    }
    return this.dataSource;
  }

  /**
   * Legacy method for backward compatibility - use getDataSource() instead
   * @deprecated Use getDataSource() instead
   */
  public async initialize(): Promise<void> {
    this.logger.warn('initialize() is deprecated - database is automatically initialized by NestJS');
    return this.onModuleInit();
  }

  /**
   * Legacy method for backward compatibility - handled by NestJS lifecycle
   * @deprecated Database connection is automatically closed by NestJS
   */
  public async close(): Promise<void> {
    this.logger.warn('close() is deprecated - database connection is automatically managed by NestJS');
    return this.onModuleDestroy();
  }
}
