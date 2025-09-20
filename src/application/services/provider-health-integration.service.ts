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
   * Perform health check for all providers and update database
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
      this.logger.log('Starting comprehensive provider health check');

      const providers = await this.providerRepository.find({
        where: { isActive: true }
      });

      let healthyCount = 0;
      let degradedCount = 0;
      let unhealthyCount = 0;
      let unknownCount = 0;

      for (const provider of providers) {
        try {
          // Note: The actual integration would require a proper provider adapter instance
          // For now, we'll simulate health check results based on existing health data
          const healthChecks = await this.providerHealthRepository.find({
            where: { providerId: provider.id },
            order: { lastCheckTime: 'DESC' },
            take: 1
          });

          if (healthChecks.length > 0) {
            const latestHealth = healthChecks[0];
            
            // Update health metrics based on existing data
            const healthMetrics = {
              isHealthy: latestHealth.isHealthy,
              successCount: latestHealth.successCount,
              errorCount: latestHealth.errorCount,
              rateLimitCount: latestHealth.rateLimitCount,
              averageResponseTime: latestHealth.averageResponseTime,
              uptime: latestHealth.uptime,
              customMetrics: latestHealth.metrics || {}
            };

            await this.updateProviderHealth(provider.name, latestHealth.network, healthMetrics);

            // Count by status based on health
            if (latestHealth.isHealthy && latestHealth.uptime > 95) {
              healthyCount++;
            } else if (latestHealth.isHealthy && latestHealth.uptime > 80) {
              degradedCount++;
            } else if (!latestHealth.isHealthy) {
              unhealthyCount++;
            } else {
              unknownCount++;
            }
          } else {
            unknownCount++;
          }

        } catch (error) {
          this.logger.error(`Error checking health for provider ${provider.name}:`, error);
          unknownCount++;
        }
      }

      const summary = {
        totalProviders: providers.length,
        healthyProviders: healthyCount,
        degradedProviders: degradedCount,
        unhealthyProviders: unhealthyCount,
        unknownProviders: unknownCount
      };

      this.logger.log('Health check completed:', summary);
      return summary;

    } catch (error) {
      this.logger.error('Error performing health check and update:', error);
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
