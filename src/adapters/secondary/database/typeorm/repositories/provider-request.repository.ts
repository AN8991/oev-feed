import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ProviderRequest } from '../entities/provider-request.entity';
/**
 * Repository service for ProviderRequest entity operations
 * Simplified to use direct TypeORM without port abstraction
 */
@Injectable()
export class ProviderRequestRepository {
  private readonly logger = new Logger(ProviderRequestRepository.name);

  constructor(
    @InjectRepository(ProviderRequest)
    private readonly repository: Repository<ProviderRequest>,
  ) {}

  /**
   * Create a new provider request record
   * @param data Provider request data
   * @returns Created provider request
   */
  async create(data: Partial<ProviderRequest>): Promise<ProviderRequest> {
    try {
      const request = this.repository.create(data);
      return await this.repository.save(request);
    } catch (error) {
      this.logger.error('Error creating provider request record', { 
        providerId: data.providerId,
        method: data.method,
        error 
      });
      throw error;
    }
  }

  /**
   * Find requests by provider ID
   * @param providerId Provider ID
   * @param limit Maximum number of records to return
   * @returns Array of provider requests
   */
  async findByProviderId(providerId: string, limit = 100): Promise<ProviderRequest[]> {
    try {
      return await this.repository.find({
        where: { providerId },
        order: { createdAt: 'DESC' },
        take: limit
      });
    } catch (error) {
      this.logger.error('Error finding provider requests', { providerId, error });
      throw error;
    }
  }

  /**
   * Get request statistics for a provider
   * @param providerId Provider ID
   * @param startTime Start time for the period
   * @param endTime End time for the period
   * @returns Statistics object
   */
  async getProviderStats(
    providerId: string, 
    startTime: Date, 
    endTime: Date
  ): Promise<{
    totalRequests: number;
    successCount: number;
    errorCount: number;
    rateLimitCount: number;
    averageResponseTime: number;
  }> {
    try {
      const requests = await this.repository.find({
        where: {
          providerId,
          createdAt: Between(startTime, endTime)
        }
      });

      const totalRequests = requests.length;
      const successCount = requests.filter(r => !r.isError).length;
      const errorCount = requests.filter(r => r.isError).length;
      const rateLimitCount = requests.filter(r => r.isRateLimit).length;
      
      // Calculate average response time for successful requests
      const successfulRequests = requests.filter(r => !r.isError);
      const totalResponseTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0);
      const averageResponseTime = successfulRequests.length > 0 
        ? totalResponseTime / successfulRequests.length 
        : 0;

      return {
        totalRequests,
        successCount,
        errorCount,
        rateLimitCount,
        averageResponseTime
      };
    } catch (error) {
      this.logger.error('Error getting provider statistics', { 
        providerId, 
        startTime, 
        endTime, 
        error 
      });
      throw error;
    }
  }

  /**
   * Get rate limit status for a provider
   * @param providerId Provider ID
   * @param timeWindowMs Time window in milliseconds to check for rate limits
   * @returns Number of requests in the time window
   */
  async getRateLimitStatus(providerId: string, timeWindowMs = 60000): Promise<number> {
    try {
      const startTime = new Date(Date.now() - timeWindowMs);
      
      const count = await this.repository.count({
        where: {
          providerId,
          createdAt: Between(startTime, new Date())
        }
      });

      return count;
    } catch (error) {
      this.logger.error('Error getting rate limit status', { 
        providerId, 
        timeWindowMs, 
        error 
      });
      throw error;
    }
  }

  /**
   * Delete old provider request records
   * @param olderThan Date threshold for deletion
   * @returns Number of deleted records
   */
  async deleteOldRecords(olderThan: Date): Promise<number> {
    try {
      const result = await this.repository.delete({
        createdAt: Between(new Date(0), olderThan)
      });
      
      return result.affected || 0;
    } catch (error) {
      this.logger.error('Error deleting old provider request records', { 
        olderThan, 
        error 
      });
      throw error;
    }
  }
}
