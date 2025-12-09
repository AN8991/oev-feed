import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../../adapters/secondary/database/typeorm/entities/provider.entity';
import { ProviderHealth } from '../../adapters/secondary/database/typeorm/entities/provider-health.entity';
import { ProviderMapper } from '../mappers/provider.mapper';
import { ProviderHealthMonitor, ProviderHealthStatus } from '../../infrastructure/utils/provider-health-monitor';
import { ProviderDto } from '../dto/provider.dto';

/**
 * Service that integrates provider health monitoring with the database
 * and provides comprehensive health status information
 */
@Injectable()
export class ProviderHealthIntegrationService {
  private readonly logger = new Logger(ProviderHealthIntegrationService.name);

  constructor(
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(ProviderHealth)
    private readonly providerHealthRepository: Repository<ProviderHealth>,
    private readonly providerMapper: ProviderMapper,
    private readonly providerHealthMonitor: ProviderHealthMonitor,
  ) {}

  /**
   * Get all providers with their current health status
   * @returns Array of provider DTOs with health information
   */
  async getAllProvidersWithHealth(): Promise<ProviderDto[]> {
    try {
      // Load providers with their health checks
      const providers = await this.providerRepository.find({
        relations: ['healthChecks'],
        order: { name: 'ASC' }
      });

      // Map to DTOs using the enhanced mapper
      const providerDtos = providers.map(provider => 
        this.providerMapper.toDtoWithHealthMetrics(provider)
      );

      this.logger.debug(`Retrieved ${providerDtos.length} providers with health metrics`);
      return providerDtos;

    } catch (error) {
      this.logger.error('Error retrieving providers with health:', error);
      throw error;
    }
  }

  /**
   * Get a specific provider with detailed health information
   * @param providerName Name of the provider
   * @returns Provider DTO with detailed health metrics
   */
  async getProviderWithHealth(providerName: string): Promise<ProviderDto | null> {
    try {
      const provider = await this.providerRepository.findOne({
        where: { name: providerName },
        relations: ['healthChecks']
      });

      if (!provider) {
        this.logger.warn(`Provider not found: ${providerName}`);
        return null;
      }

      return this.providerMapper.toDtoWithHealthMetrics(provider);

    } catch (error) {
      this.logger.error(`Error retrieving provider ${providerName} with health:`, error);
      throw error;
    }
  }

  /**
   * Update provider health metrics from monitoring system
   * @param providerName Name of the provider
   * @param network Network identifier
   * @param healthMetrics Health metrics to update
   */
  async updateProviderHealth(
    providerName: string,
    network: string,
    healthMetrics: {
      isHealthy: boolean;
      successCount: number;
      errorCount: number;
      rateLimitCount: number;
      averageResponseTime: number;
      uptime: number;
      customMetrics?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      // Find the provider
      const provider = await this.providerRepository.findOne({
        where: { name: providerName }
      });

      if (!provider) {
        this.logger.warn(`Provider not found for health update: ${providerName}`);
        return;
      }

      // Create or update health record
      let healthRecord = await this.providerHealthRepository.findOne({
        where: { 
          providerId: provider.id,
          network: network
        }
      });

      if (!healthRecord) {
        healthRecord = this.providerHealthRepository.create({
          providerId: provider.id,
          network: network,
          ...healthMetrics,
          lastCheckTime: new Date(),
          metrics: healthMetrics.customMetrics
        });
      } else {
        Object.assign(healthRecord, {
          ...healthMetrics,
          lastCheckTime: new Date(),
          metrics: healthMetrics.customMetrics
        });
      }

      await this.providerHealthRepository.save(healthRecord);
      
      this.logger.debug(`Updated health metrics for provider ${providerName} on ${network}`);

    } catch (error) {
      this.logger.error(`Error updating provider health for ${providerName}:`, error);
      throw error;
    }
  }

  /**
   * Perform real-time health check for all providers using ProviderHealthMonitor
   * and update the database with the results
   * @returns Summary of health check results
   */
  async performHealthCheckAndUpdate(): Promise<{
    totalProviders: number;
    healthyProviders: number;
    degradedProviders: number;
    unhealthyProviders: number;
    unknownProviders: number;
  }> {
    try {
      this.logger.log('Starting real-time provider health check');

      // Trigger real-time health checks via the monitor
      await this.providerHealthMonitor.checkAllProviders();

      // Get all health check results from the monitor (returns Map)
      const healthResultsMap = this.providerHealthMonitor.getAllHealthCheckResults();
      const healthResults = Array.from(healthResultsMap.values());

      let healthyCount = 0;
      let degradedCount = 0;
      let unhealthyCount = 0;
      let unknownCount = 0;

      // Process each health check result
      for (const result of healthResults) {
        try {
          // Update database with real-time health metrics
          const healthMetrics = {
            isHealthy: result.status === 'healthy',
            successCount: result.score > 50 ? 1 : 0,
            errorCount: result.error ? 1 : 0,
            rateLimitCount: result.rateLimit ? (result.rateLimit.limit - result.rateLimit.remaining) : 0,
            averageResponseTime: result.responseTime || 0,
            uptime: result.score,
            customMetrics: {
              blockNumber: result.blockNumber,
              lastCheckTimestamp: result.timestamp,
              rateLimit: result.rateLimit
            }
          };

          await this.updateProviderHealth(result.provider, result.network, healthMetrics);

          // Count by status
          switch (result.status) {
            case 'healthy':
              healthyCount++;
              break;
            case 'degraded':
              degradedCount++;
              break;
            case 'unhealthy':
              unhealthyCount++;
              break;
            default:
              unknownCount++;
              break;
          }

        } catch (error) {
          this.logger.error(`Error processing health result for ${result.provider}:`, error);
          unknownCount++;
        }
      }

      // Also check database providers that may not have real-time adapters
      const dbProviders = await this.providerRepository.find({
        where: { isActive: true }
      });

      // Count providers without real-time results as unknown
      const checkedProviders = new Set(healthResults.map(r => r.provider));
      for (const provider of dbProviders) {
        if (!checkedProviders.has(provider.name)) {
          unknownCount++;
        }
      }

      const summary = {
        totalProviders: Math.max(healthResults.length, dbProviders.length),
        healthyProviders: healthyCount,
        degradedProviders: degradedCount,
        unhealthyProviders: unhealthyCount,
        unknownProviders: unknownCount
      };

      this.logger.log('Real-time health check completed:', summary);
      return summary;

    } catch (error) {
      this.logger.error('Error performing real-time health check:', error);
      throw error;
    }
  }

  /**
   * Get provider health summary statistics
   * @returns Health summary with counts and percentages
   */
  async getHealthSummary(): Promise<{
    totalProviders: number;
    healthyCount: number;
    degradedCount: number;
    unhealthyCount: number;
    unknownCount: number;
    healthyPercentage: number;
    averageHealthScore: number;
  }> {
    try {
      const providers = await this.getAllProvidersWithHealth();
      
      let healthyCount = 0;
      let degradedCount = 0;
      let unhealthyCount = 0;
      let unknownCount = 0;
      let totalHealthScore = 0;

      providers.forEach(provider => {
        totalHealthScore += provider.healthScore;
        
        switch (provider.status) {
          case 'healthy':
            healthyCount++;
            break;
          case 'degraded':
          case 'warning':
            degradedCount++;
            break;
          case 'unhealthy':
          case 'error':
            unhealthyCount++;
            break;
          default:
            unknownCount++;
            break;
        }
      });

      const totalProviders = providers.length;
      const healthyPercentage = totalProviders > 0 ? (healthyCount / totalProviders) * 100 : 0;
      const averageHealthScore = totalProviders > 0 ? totalHealthScore / totalProviders : 0;

      return {
        totalProviders,
        healthyCount,
        degradedCount,
        unhealthyCount,
        unknownCount,
        healthyPercentage: Math.round(healthyPercentage * 100) / 100,
        averageHealthScore: Math.round(averageHealthScore * 100) / 100
      };

    } catch (error) {
      this.logger.error('Error getting health summary:', error);
      throw error;
    }
  }

  /**
   * Get providers that need attention (unhealthy or degraded)
   * @returns Array of provider DTOs that need attention
   */
  async getProvidersNeedingAttention(): Promise<ProviderDto[]> {
    try {
      const allProviders = await this.getAllProvidersWithHealth();
      
      return allProviders.filter(provider => 
        ['unhealthy', 'degraded', 'error', 'warning', 'stale'].includes(provider.status)
      );

    } catch (error) {
      this.logger.error('Error getting providers needing attention:', error);
      throw error;
    }
  }
}
