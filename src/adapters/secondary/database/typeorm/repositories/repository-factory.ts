/**
 * Repository Factory
 * 
 * Provides a central point for accessing repository implementations while
 * keeping domain services decoupled from concrete implementations.
 * 
 * Following hexagonal architecture principles, services should depend on the
 * interfaces (ports) rather than concrete implementations.
 */

import { ProviderRepositoryPort } from '@domain/ports/secondary/repositories/provider-repository.port';
import { ProviderRequestRepositoryPort } from '@domain/ports/secondary/repositories/provider-request-repository.port';
import { ProviderHealthRepositoryPort } from '@domain/ports/secondary/repositories/provider-health-repository.port';
import { PositionRepositoryPort } from '@domain/ports/secondary/repositories/position-repository.port';

import { ProviderRepository } from '@adapters/secondary/database/typeorm/repositories/provider.repository';
import { ProviderRequestRepository } from '@adapters/secondary/database/typeorm/repositories/provider-request.repository';
import { ProviderHealthRepository } from '@adapters/secondary/database/typeorm/repositories/provider-health.repository';
import { PositionRepository } from '@adapters/secondary/database/typeorm/repositories/position.repository';

import { Provider } from '@adapters/secondary/database/typeorm/entities/provider.entity';
import { ProviderRequest } from '@adapters/secondary/database/typeorm/entities/provider-request.entity';
import { ProviderHealth } from '@adapters/secondary/database/typeorm/entities/provider-health.entity';
import { PositionEntity } from '@adapters/secondary/database/typeorm/entities/position.entity';

export class RepositoryFactory {
  private static instance: RepositoryFactory;
  
  private providerRepository: ProviderRepositoryPort<Provider>;
  private providerRequestRepository: ProviderRequestRepositoryPort<ProviderRequest>;
  private providerHealthRepository: ProviderHealthRepositoryPort<ProviderHealth>;
  private positionRepository: PositionRepositoryPort<PositionEntity>;

  private constructor() {
    this.providerRepository = new ProviderRepository();
    this.providerRequestRepository = new ProviderRequestRepository();
    this.providerHealthRepository = new ProviderHealthRepository();
    this.positionRepository = new PositionRepository();
  }

  /**
   * Get the singleton instance of the repository factory
   */
  public static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
  }

  /**
   * Get the provider repository
   */
  public getProviderRepository(): ProviderRepositoryPort<Provider> {
    return this.providerRepository;
  }

  /**
   * Get the provider request repository
   */
  public getProviderRequestRepository(): ProviderRequestRepositoryPort<ProviderRequest> {
    return this.providerRequestRepository;
  }

  /**
   * Get the provider health repository
   */
  public getProviderHealthRepository(): ProviderHealthRepositoryPort<ProviderHealth> {
    return this.providerHealthRepository;
  }

  /**
   * Get the position repository
   */
  public getPositionRepository(): PositionRepositoryPort<PositionEntity> {
    return this.positionRepository;
  }

  /**
   * Reset all repositories (mainly for testing purposes)
   * This creates new instances of all repositories
   */
  public reset(): void {
    this.providerRepository = new ProviderRepository();
    this.providerRequestRepository = new ProviderRequestRepository();
    this.providerHealthRepository = new ProviderHealthRepository();
    this.positionRepository = new PositionRepository();
  }
}
