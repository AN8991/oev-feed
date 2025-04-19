/**
 * Database service for managing database operations
 */

import { AppDataSource } from '@infrastructure/config/typeorm.config';
import { logger, LogCategory } from '@infrastructure/utils/structured-logger';
import { ProviderError, ERROR_CODES } from '@shared/utils/errors';
import { DatabaseInitService } from '@domain/services/database/database-init.service';
import { Provider } from '@adapters/secondary/database/typeorm/entities/provider.entity';
import { ProviderRequest } from '@adapters/secondary/database/typeorm/entities/provider-request.entity';
import { ProviderHealth } from '@adapters/secondary/database/typeorm/entities/provider-health.entity';
import { PositionEntity } from '@adapters/secondary/database/typeorm/entities/position.entity';
import { PositionModel } from '@domain/models/position.model';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';

export class DatabaseService {
  private initialized = false;
  private providerRepo: Repository<Provider>;
  private providerRequestRepo: Repository<ProviderRequest>;
  private providerHealthRepo: Repository<ProviderHealth>;
  private positionRepo: Repository<PositionEntity>;
  private dbInitService: DatabaseInitService;

  constructor() {
    this.dbInitService = DatabaseInitService.getInstance();
    this.providerRepo = AppDataSource.getRepository(Provider);
    this.providerRequestRepo = AppDataSource.getRepository(ProviderRequest);
    this.providerHealthRepo = AppDataSource.getRepository(ProviderHealth);
    this.positionRepo = AppDataSource.getRepository(PositionEntity);
  }

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Use the database init service to initialize the connection
      await this.dbInitService.initialize();
      
      // Get repositories from the initialized data source
      const dataSource = this.dbInitService.getDataSource();
      this.providerRepo = dataSource.getRepository(Provider);
      this.providerRequestRepo = dataSource.getRepository(ProviderRequest);
      this.providerHealthRepo = dataSource.getRepository(ProviderHealth);
      this.positionRepo = dataSource.getRepository(PositionEntity);
      
      this.initialized = true;
      logger.info('Database service initialized', LogCategory.DATABASE);
    } catch (error) {
      // Log the full error object for debugging
      logger.error(
        'Failed to initialize database service',
        LogCategory.DATABASE,
        error instanceof Error ? {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          }
        } : { error: String(error) }
      );
      // Rethrow with appended error message for compatibility
      throw new Error(
        'Database initialization failed: ' +
        (error instanceof Error ? error.message : String(error))
      );
    }
  }

  /**
   * Get all providers
   * @param activeOnly Whether to return only active providers
   * @returns Array of providers
   */
  async getProviders(activeOnly = true): Promise<Provider[]> {
    await this.ensureInitialized();
    
    if (activeOnly) {
      return this.providerRepo.find({ where: { isActive: true } });
    }
    
    return this.providerRepo.find();
  }

  /**
   * Get provider by name
   * @param name Provider name
   * @returns Provider or null if not found
   */
  async getProviderByName(name: string): Promise<Provider | null> {
    await this.ensureInitialized();
    return this.providerRepo.findOne({ where: { name } });
  }

  /**
   * Create a new provider
   * @param data Provider data
   * @returns Created provider
   */
  async createProvider(data: Partial<Provider>): Promise<Provider> {
    await this.ensureInitialized();
    const provider = this.providerRepo.create(data);
    return this.providerRepo.save(provider);
  }

  /**
   * Update a provider
   * @param id Provider ID
   * @param data Updated provider data
   * @returns Updated provider
   */
  async updateProvider(id: string, data: Partial<Provider>): Promise<Provider> {
    await this.ensureInitialized();
    await this.providerRepo.update(id, data);
    const updated = await this.providerRepo.findOne({ where: { id } });
    
    if (!updated) {
      throw new Error(`Provider with ID ${id} not found`);
    }
    
    return updated;
  }

  /**
   * Record a provider request
   * @param data Request data
   * @returns Created request record
   */
  async recordProviderRequest(data: Partial<ProviderRequest>): Promise<ProviderRequest> {
    await this.ensureInitialized();
    const request = this.providerRequestRepo.create(data);
    return this.providerRequestRepo.save(request);
  }

  /**
   * Record a successful provider request
   * @param providerId Provider ID
   * @param network Network name
   * @param method Method name
   * @param params Method parameters
   * @param responseTime Response time in ms
   * @param metadata Additional metadata
   * @returns Created request record
   */
  async recordSuccessfulRequest(
    providerId: string,
    network: string,
    method: string,
    params: any,
    responseTime: number,
    metadata?: Record<string, any>
  ): Promise<ProviderRequest> {
    await this.ensureInitialized();
    
    // Record the request
    const request = this.providerRequestRepo.create({
      providerId,
      network,
      method,
      params,
      responseTime,
      isError: false,
      metadata
    });
    
    await this.providerRequestRepo.save(request);
    
    // Update provider health
    await this.updateProviderHealth(providerId, network, true, false);
    
    return request;
  }

  /**
   * Record a failed provider request
   * @param providerId Provider ID
   * @param network Network name
   * @param method Method name
   * @param params Method parameters
   * @param error Error that occurred
   * @param responseTime Response time in ms
   * @param metadata Additional metadata
   * @returns Created request record
   */
  async recordFailedRequest(
    providerId: string,
    network: string,
    method: string,
    params: any,
    error: unknown,
    responseTime: number,
    metadata?: Record<string, any>
  ): Promise<ProviderRequest> {
    await this.ensureInitialized();
    
    // Determine if this is a rate limit error
    const isRateLimit = error instanceof ProviderError 
      ? error.isRateLimit 
      : this.isRateLimitError(error);
    
    // Get error message and type
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = error instanceof ProviderError 
      ? error.code 
      : this.isRateLimitError(error) 
        ? ERROR_CODES.PROVIDER_RATE_LIMIT 
        : ERROR_CODES.PROVIDER_UNAVAILABLE;
    
    // Record the request
    const request = this.providerRequestRepo.create({
      providerId,
      network,
      method,
      params,
      responseTime,
      isError: true,
      errorMessage,
      errorType,
      isRateLimit,
      metadata
    });
    
    await this.providerRequestRepo.save(request);
    
    // Update provider health
    await this.updateProviderHealth(providerId, network, false, isRateLimit);
    
    return request;
  }

  /**
   * Update provider health status
   * @param providerId Provider ID
   * @param network Network name
   * @param success Whether the request was successful
   * @param isRateLimit Whether the error was a rate limit error
   */
  private async updateProviderHealth(
    providerId: string,
    network: string,
    success: boolean,
    isRateLimit: boolean
  ): Promise<void> {
    // Find existing health record or create new one
    let health = await this.providerHealthRepo.findOne({
      where: { providerId, network }
    });
    
    if (!health) {
      health = this.providerHealthRepo.create({
        providerId,
        network,
        successCount: 0,
        errorCount: 0,
        rateLimitCount: 0,
        lastCheckTime: new Date(),
        isHealthy: true
      });
    }
    
    // Update health metrics
    if (success) {
      health.successCount += 1;
      // Store consecutive errors in metrics JSON field if needed
      health.metrics = health.metrics || {};
      health.metrics.consecutiveErrors = 0;
      health.isHealthy = true;
    } else {
      health.errorCount += 1;
      // Store consecutive errors in metrics JSON field
      health.metrics = health.metrics || {};
      health.metrics.consecutiveErrors = (health.metrics.consecutiveErrors || 0) + 1;
      
      if (isRateLimit) {
        health.rateLimitCount += 1;
      }
      
      // Mark as unhealthy if too many consecutive errors
      if (health.metrics.consecutiveErrors >= 3) {
        health.isHealthy = false;
      }
    }
    
    health.lastCheckTime = new Date();
    
    // Save updated health record
    await this.providerHealthRepo.save(health);
  }

  /**
   * Get provider health status
   * @param providerId Provider ID
   * @param network Network name
   * @returns Provider health record
   */
  async getProviderHealth(providerId: string, network: string): Promise<ProviderHealth> {
    await this.ensureInitialized();
    
    const health = await this.providerHealthRepo.findOne({
      where: { providerId, network }
    });
    
    if (!health) {
      // Create new health record if not found
      const newHealth = this.providerHealthRepo.create({
        providerId,
        network,
        successCount: 0,
        errorCount: 0,
        rateLimitCount: 0,
        lastCheckTime: new Date(),
        isHealthy: true,
        metrics: {}
      });
      
      return this.providerHealthRepo.save(newHealth);
    }
    
    return health;
  }

  /**
   * Get all healthy providers for a network
   * @param network Network name
   * @returns Array of healthy provider records
   */
  async getHealthyProviders(network: string): Promise<ProviderHealth[]> {
    await this.ensureInitialized();
    
    return this.providerHealthRepo.find({
      where: { network, isHealthy: true },
      relations: ['provider']
    });
  }

  /**
   * Get provider request statistics
   * @param providerId Provider ID
   * @param startTime Start time for the period
   * @param endTime End time for the period
   * @returns Statistics object
   */
  async getProviderStats(
    providerId: string, 
    startTime: Date = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    endTime: Date = new Date()
  ): Promise<{
    totalRequests: number;
    successCount: number;
    errorCount: number;
    rateLimitCount: number;
    averageResponseTime: number;
  }> {
    await this.ensureInitialized();
    
    // Get all requests for the provider in the time period
    const requests = await this.providerRequestRepo.find({
      where: {
        providerId,
        createdAt: Between(startTime, endTime)
      }
    });
    
    // Calculate statistics
    const totalRequests = requests.length;
    const successCount = requests.filter(r => !r.isError).length;
    const errorCount = requests.filter(r => r.isError).length;
    const rateLimitCount = requests.filter(r => r.isRateLimit).length;
    
    // Calculate average response time
    const totalResponseTime = requests.reduce((sum, req) => sum + req.responseTime, 0);
    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    
    return {
      totalRequests,
      successCount,
      errorCount,
      rateLimitCount,
      averageResponseTime
    };
  }

  /**
   * Check if a provider is rate limited
   * @param providerId Provider ID
   * @param rateLimit Rate limit threshold
   * @param timeWindowMs Time window in milliseconds
   * @returns True if rate limited
   */
  async isProviderRateLimited(
    providerId: string, 
    rateLimit: number, 
    timeWindowMs = 60000
  ): Promise<boolean> {
    await this.ensureInitialized();
    
    const startTime = new Date(Date.now() - timeWindowMs);
    
    // Count requests in the time window
    const requestCount = await this.providerRequestRepo.count({
      where: {
        providerId,
        createdAt: MoreThanOrEqual(startTime)
      }
    });
    
    return requestCount >= rateLimit;
  }

  /**
   * Reset provider health
   * @param providerId Provider ID
   * @param network Network name
   * @returns Reset provider health
   */
  async resetProviderHealth(providerId: string, network: string): Promise<ProviderHealth> {
    await this.ensureInitialized();
    
    const health = await this.getProviderHealth(providerId, network);
    
    // Reset health metrics
    health.errorCount = 0;
    health.metrics = health.metrics || {};
    health.metrics.consecutiveErrors = 0;
    health.rateLimitCount = 0;
    health.isHealthy = true;
    health.lastCheckTime = new Date();
    
    return this.providerHealthRepo.save(health);
  }

  /**
   * Save user positions to the database
   * @param positions Array of PositionModel
   */
  async savePositions(positions: PositionModel[]): Promise<void> {
    await this.ensureInitialized();
    if (!positions || positions.length === 0) return;
    // Upsert by id
    await this.positionRepo.save(positions.map(pos => ({ ...pos })));
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Check if an error is a rate limit error
   * @param error Error to check
   * @returns True if rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    if (!error) return false;
    
    const errorMessage = error instanceof Error ? error.message?.toLowerCase() : String(error).toLowerCase();
    
    return (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('compute units') ||
      errorMessage.includes('429') ||
      errorMessage.includes('exceeded')
    );
  }
}
