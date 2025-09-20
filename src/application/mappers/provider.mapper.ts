import { Injectable, Logger } from '@nestjs/common';
import { Provider } from '../../adapters/secondary/database/typeorm/entities/provider.entity';
import { ProviderHealth } from '../../adapters/secondary/database/typeorm/entities/provider-health.entity';
import { ProviderDto } from '../dto/provider.dto';

/**
 * Provider Mapper
 * 
 * Maps between Provider entities and ProviderDto objects
 */
@Injectable()
export class ProviderMapper {
  private readonly logger = new Logger(ProviderMapper.name);
  /**
   * Maps a Provider entity to a ProviderDto
   * 
   * @param provider The Provider entity to map
   * @returns The mapped ProviderDto
   */
  toDto(provider: Provider): ProviderDto {
    const dto = new ProviderDto();
    dto.name = provider.name;
    dto.network = provider.network || 'unknown';
    dto.status = this.determineProviderStatus(provider);
    dto.lastChecked = this.getLastCheckedTime(provider);
    dto.healthScore = this.calculateHealthScore(provider);
    return dto;
  }

  /**
   * Maps multiple Provider entities to ProviderDto objects
   * 
   * @param providers Array of Provider entities to map
   * @returns Array of mapped ProviderDto objects
   */
  toDtoArray(providers: Provider[]): ProviderDto[] {
    return providers.map(provider => this.toDto(provider));
  }

  /**
   * Determines the provider status based on entity data and health metrics
   * 
   * @param provider The Provider entity
   * @returns The provider status
   */
  private determineProviderStatus(provider: Provider): string {
    try {
      // Check if provider is marked as inactive
      if (!provider.isActive) {
        return 'inactive';
      }

      // If no health checks available, assume active but unknown
      if (!provider.healthChecks || provider.healthChecks.length === 0) {
        this.logger.debug(`No health checks available for provider: ${provider.name}`);
        return 'unknown';
      }

      // Get the most recent health check
      const latestHealth = this.getLatestHealthCheck(provider.healthChecks);
      if (!latestHealth) {
        return 'unknown';
      }

      // Check if last health check was recent (within last 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      if (!latestHealth.lastCheckTime || latestHealth.lastCheckTime < tenMinutesAgo) {
        return 'stale';
      }

      // Determine status based on health metrics
      if (!latestHealth.isHealthy) {
        return 'unhealthy';
      }

      // Check error rate (if error rate > 50%, consider degraded)
      const totalRequests = latestHealth.successCount + latestHealth.errorCount;
      if (totalRequests > 0) {
        const errorRate = latestHealth.errorCount / totalRequests;
        if (errorRate > 0.5) {
          return 'degraded';
        }
        if (errorRate > 0.2) {
          return 'warning';
        }
      }

      // Check uptime (if uptime < 95%, consider degraded)
      if (latestHealth.uptime < 95) {
        return 'degraded';
      }

      return 'healthy';
      
    } catch (error) {
      this.logger.error(`Error determining provider status for ${provider.name}:`, error);
      return 'error';
    }
  }

  /**
   * Gets the last checked time for the provider
   * 
   * @param provider The Provider entity
   * @returns The last checked timestamp
   */
  private getLastCheckedTime(provider: Provider): Date {
    try {
      if (!provider.healthChecks || provider.healthChecks.length === 0) {
        // If no health checks, return a very old date to indicate never checked
        return new Date(0);
      }

      const latestHealth = this.getLatestHealthCheck(provider.healthChecks);
      return latestHealth?.lastCheckTime || new Date(0);
      
    } catch (error) {
      this.logger.error(`Error getting last checked time for ${provider.name}:`, error);
      return new Date(0);
    }
  }

  /**
   * Calculates the health score for the provider based on multiple metrics
   * 
   * @param provider The Provider entity
   * @returns The health score (0-100)
   */
  private calculateHealthScore(provider: Provider): number {
    try {
      if (!provider.isActive) {
        return 0; // Inactive providers have 0 score
      }

      if (!provider.healthChecks || provider.healthChecks.length === 0) {
        return 50; // Unknown health, neutral score
      }

      const latestHealth = this.getLatestHealthCheck(provider.healthChecks);
      if (!latestHealth) {
        return 50;
      }

      let score = 100;

      // Deduct points for being unhealthy
      if (!latestHealth.isHealthy) {
        score -= 50;
      }

      // Deduct points based on error rate
      const totalRequests = latestHealth.successCount + latestHealth.errorCount;
      if (totalRequests > 0) {
        const errorRate = latestHealth.errorCount / totalRequests;
        score -= Math.floor(errorRate * 30); // Max 30 points deduction for errors
      }

      // Deduct points based on uptime
      if (latestHealth.uptime < 100) {
        const uptimeDeduction = (100 - latestHealth.uptime) * 0.5; // 0.5 points per % downtime
        score -= Math.floor(uptimeDeduction);
      }

      // Deduct points for high response time (>2 seconds)
      if (latestHealth.averageResponseTime > 2000) {
        const responseTimeDeduction = Math.min(10, (latestHealth.averageResponseTime - 2000) / 1000);
        score -= Math.floor(responseTimeDeduction);
      }

      // Deduct points for rate limiting
      if (latestHealth.rateLimitCount > 0) {
        score -= Math.min(10, latestHealth.rateLimitCount);
      }

      // Check if health data is stale (older than 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      if (!latestHealth.lastCheckTime || latestHealth.lastCheckTime < tenMinutesAgo) {
        score -= 20; // Deduct points for stale data
      }

      // Ensure score is between 0 and 100
      return Math.max(0, Math.min(100, score));
      
    } catch (error) {
      this.logger.error(`Error calculating health score for ${provider.name}:`, error);
      return 0;
    }
  }

  /**
   * Gets the most recent health check from an array of health checks
   * 
   * @param healthChecks Array of provider health checks
   * @returns The most recent health check or null
   */
  private getLatestHealthCheck(healthChecks: ProviderHealth[]): ProviderHealth | null {
    if (!healthChecks || healthChecks.length === 0) {
      return null;
    }

    return healthChecks.reduce((latest, current) => {
      if (!latest) return current;
      
      const latestTime = latest.lastCheckTime || new Date(0);
      const currentTime = current.lastCheckTime || new Date(0);
      
      return currentTime > latestTime ? current : latest;
    });
  }

  /**
   * Maps a Provider entity to a ProviderDto with health metrics included
   * 
   * @param provider The Provider entity with health checks loaded
   * @returns The mapped ProviderDto with comprehensive health information
   */
  toDtoWithHealthMetrics(provider: Provider): ProviderDto {
    const dto = this.toDto(provider);
    
    // Add additional health metrics if available
    const latestHealth = this.getLatestHealthCheck(provider.healthChecks || []);
    if (latestHealth) {
      // Add custom properties for detailed health info
      (dto as any).detailedMetrics = {
        successCount: latestHealth.successCount,
        errorCount: latestHealth.errorCount,
        rateLimitCount: latestHealth.rateLimitCount,
        averageResponseTime: latestHealth.averageResponseTime,
        uptime: latestHealth.uptime,
        customMetrics: latestHealth.metrics
      };
    }
    
    return dto;
  }
}
