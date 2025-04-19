import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { ProviderHealth } from '../entities/provider-health.entity';
import { AppDataSource } from '@infrastructure/config';
import { logger, LogCategoryger, LogCategory } from '@infrastructure/utils';
import { ProviderHealthRepositoryPort } from '@domain/ports/secondary';

/**
 * Repository for ProviderHealth entity operations
 * Implements the ProviderHealthRepositoryPort from the domain layer
 */
export class ProviderHealthRepository implements ProviderHealthRepositoryPort<ProviderHealth> {
  private repository: Repository<ProviderHealth>;

  constructor() {
    this.repository = AppDataSource.getRepository(ProviderHealth);
  }

  /**
   * Find or create provider health record
   * @param providerId Provider ID
   * @param network Network name
   * @returns Provider health record
   */
  async findOrCreate(providerId: string, network: string): Promise<ProviderHealth> {
    try {
      let health = await this.repository.findOne({
        where: { providerId, network }
      });

      if (!health) {
        health = this.repository.create({
          providerId,
          network,
          isHealthy: true,
          successCount: 0,
          errorCount: 0,
          rateLimitCount: 0,
          averageResponseTime: 0,
          uptime: 100,
          lastCheckTime: new Date(),
          metrics: {}
        });
        await this.repository.save(health);
      }

      return health;
    } catch (error) {
      logger.error('Error finding or creating provider health record', LogCategory.PROVIDER, { 
        providerId, 
        network, 
        error 
      });
      throw error;
    }
  }

  /**
   * Update provider health status
   * @param providerId Provider ID
   * @param network Network name
   * @param updates Health status updates
   * @returns Updated provider health
   */
  async updateHealth(
    providerId: string,
    network: string,
    updates: Partial<ProviderHealth>
  ): Promise<ProviderHealth> {
    try {
      const health = await this.findOrCreate(providerId, network);
      
      // Apply updates
      Object.assign(health, {
        ...updates,
        lastCheckTime: new Date()
      });
      
      return await this.repository.save(health);
    } catch (error) {
      logger.error('Error updating provider health', LogCategory.PROVIDER, { 
        providerId, 
        network, 
        updates, 
        error 
      });
      throw error;
    }
  }

  /**
   * Record a successful request
   * @param providerId Provider ID
   * @param network Network name
   * @param responseTime Response time in ms
   * @returns Updated provider health
   */
  async recordSuccess(
    providerId: string,
    network: string,
    responseTime: number
  ): Promise<ProviderHealth> {
    try {
      const health = await this.findOrCreate(providerId, network);
      
      // Update metrics
      const newSuccessCount = health.successCount + 1;
      const totalRequests = newSuccessCount + health.errorCount;
      
      // Calculate new average response time
      const newAvgResponseTime = 
        (health.averageResponseTime * health.successCount + responseTime) / newSuccessCount;
      
      // Calculate new uptime
      const newUptime = (newSuccessCount / totalRequests) * 100;
      
      return await this.updateHealth(providerId, network, {
        isHealthy: true,
        successCount: newSuccessCount,
        averageResponseTime: newAvgResponseTime,
        uptime: newUptime
      });
    } catch (error) {
      logger.error('Error recording provider success', LogCategory.PROVIDER, { 
        providerId, 
        network, 
        responseTime, 
        error 
      });
      throw error;
    }
  }

  /**
   * Record a failed request
   * @param providerId Provider ID
   * @param network Network name
   * @param isRateLimit Whether the error is a rate limit error
   * @returns Updated provider health
   */
  async recordError(
    providerId: string,
    network: string,
    isRateLimit: boolean = false
  ): Promise<ProviderHealth> {
    try {
      const health = await this.findOrCreate(providerId, network);
      
      // Update metrics
      const newErrorCount = health.errorCount + 1;
      const newRateLimitCount = isRateLimit ? health.rateLimitCount + 1 : health.rateLimitCount;
      const totalRequests = health.successCount + newErrorCount;
      
      // Calculate new uptime
      const newUptime = (health.successCount / totalRequests) * 100;
      
      // Determine health status - consider unhealthy if error rate is too high
      const errorRate = newErrorCount / totalRequests;
      const isHealthy = errorRate < 0.3; // 30% error threshold
      
      return await this.updateHealth(providerId, network, {
        isHealthy,
        errorCount: newErrorCount,
        rateLimitCount: newRateLimitCount,
        uptime: newUptime
      });
    } catch (error) {
      logger.error('Error recording provider error', LogCategory.PROVIDER, { 
        providerId, 
        network, 
        isRateLimit, 
        error 
      });
      throw error;
    }
  }

  /**
   * Get all healthy providers for a network
   * @param network Network name
   * @returns Array of healthy provider records
   */
  async getHealthyProviders(network: string): Promise<ProviderHealth[]> {
    try {
      return await this.repository.find({
        where: { 
          network,
          isHealthy: true
        },
        relations: ['provider'],
        order: {
          uptime: 'DESC',
          averageResponseTime: 'ASC'
        }
      });
    } catch (error) {
      logger.error('Error getting healthy providers', LogCategory.PROVIDER, { 
        network, 
        error 
      });
      throw error;
    }
  }

  /**
   * Reset health metrics for a provider
   * @param providerId Provider ID
   * @param network Network name
   * @returns Reset provider health
   */
  async resetHealth(providerId: string, network: string): Promise<ProviderHealth> {
    try {
      return await this.updateHealth(providerId, network, {
        isHealthy: true,
        successCount: 0,
        errorCount: 0,
        rateLimitCount: 0,
        averageResponseTime: 0,
        uptime: 100,
        metrics: {}
      });
    } catch (error) {
      logger.error('Error resetting provider health', LogCategory.PROVIDER, { 
        providerId, 
        network, 
        error 
      });
      throw error;
    }
  }
}
