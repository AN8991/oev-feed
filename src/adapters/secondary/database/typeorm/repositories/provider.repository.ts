import { Repository } from 'typeorm';
import { Provider } from '../entities/provider.entity';
import { AppDataSource } from '@infrastructure/config';
import { logger, LogCategoryger, LogCategory } from '@infrastructure/utils';
import { ProviderRepositoryPort } from '@domain/ports/secondary';

/**
 * Repository for Provider entity operations
 * Implements the ProviderRepositoryPort from the domain layer
 */
export class ProviderRepository implements ProviderRepositoryPort<Provider> {
  private repository: Repository<Provider>;

  constructor() {
    this.repository = AppDataSource.getRepository(Provider);
  }

  /**
   * Find all providers
   * @param isActive Optional filter for active providers
   * @returns Array of providers
   */
  async findAll(isActive?: boolean): Promise<Provider[]> {
    try {
      const query = this.repository.createQueryBuilder('provider');
      
      if (isActive !== undefined) {
        query.where('provider.isActive = :isActive', { isActive });
      }
      
      return await query.orderBy('provider.priority', 'DESC').getMany();
    } catch (error) {
      logger.error('Error finding providers', LogCategory.DATABASE, { isActive, error });
      throw error;
    }
  }

  /**
   * Find provider by ID
   * @param id Provider ID
   * @returns Provider or null if not found
   */
  async findById(id: string): Promise<Provider | null> {
    try {
      return await this.repository.findOneBy({ id });
    } catch (error) {
      logger.error('Error finding provider by ID', LogCategory.DATABASE, { id, error });
      throw error;
    }
  }

  /**
   * Find provider by name
   * @param name Provider name
   * @returns Provider or null if not found
   */
  async findByName(name: string): Promise<Provider | null> {
    try {
      return await this.repository.findOneBy({ name });
    } catch (error) {
      logger.error('Error finding provider by name', LogCategory.DATABASE, { name, error });
      throw error;
    }
  }

  /**
   * Create a new provider
   * @param data Provider data
   * @returns Created provider
   */
  async create(data: Partial<Provider>): Promise<Provider> {
    try {
      const provider = this.repository.create(data);
      return await this.repository.save(provider);
    } catch (error) {
      logger.error('Error creating provider', LogCategory.DATABASE, { data, error });
      throw error;
    }
  }

  /**
   * Update a provider
   * @param id Provider ID
   * @param data Updated provider data
   * @returns Updated provider
   */
  async update(id: string, data: Partial<Provider>): Promise<Provider> {
    try {
      await this.repository.update(id, data);
      const updated = await this.findById(id);
      if (!updated) {
        throw new Error(`Provider with ID ${id} not found after update`);
      }
      return updated;
    } catch (error) {
      logger.error('Error updating provider', LogCategory.DATABASE, { id, data, error });
      throw error;
    }
  }

  /**
   * Delete a provider
   * @param id Provider ID
   * @returns True if deleted
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);
      return result.affected !== null && result.affected !== undefined && result.affected > 0;
    } catch (error) {
      logger.error('Error deleting provider', LogCategory.DATABASE, { id, error });
      throw error;
    }
  }

  /**
   * Soft delete a provider by setting isActive to false
   * @param id Provider ID
   * @returns Updated provider
   */
  async deactivate(id: string): Promise<Provider> {
    return this.update(id, { isActive: false });
  }

  /**
   * Activate a provider
   * @param id Provider ID
   * @returns Updated provider
   */
  async activate(id: string): Promise<Provider> {
    return this.update(id, { isActive: true });
  }
}
