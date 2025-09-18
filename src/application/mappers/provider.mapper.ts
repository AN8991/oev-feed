import { Injectable } from '@nestjs/common';
import { Provider } from '../../adapters/secondary/database/typeorm/entities/provider.entity';
import { ProviderDto } from '../dto/provider.dto';

/**
 * Provider Mapper
 * 
 * Maps between Provider entities and ProviderDto objects
 */
@Injectable()
export class ProviderMapper {
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
   * Determines the provider status based on entity data
   * 
   * @param provider The Provider entity
   * @returns The provider status
   */
  private determineProviderStatus(provider: Provider): string {
    // TODO: Implement actual status logic based on provider health data
    // For now, return 'active' as default
    return 'active';
  }

  /**
   * Gets the last checked time for the provider
   * 
   * @param provider The Provider entity
   * @returns The last checked timestamp
   */
  private getLastCheckedTime(provider: Provider): Date {
    // TODO: Implement actual last checked logic based on provider health data
    // For now, return current time as default
    return new Date();
  }

  /**
   * Calculates the health score for the provider
   * 
   * @param provider The Provider entity
   * @returns The health score (0-100)
   */
  private calculateHealthScore(provider: Provider): number {
    // TODO: Implement actual health score calculation based on provider metrics
    // For now, return 100 as default
    return 100;
  }
}
