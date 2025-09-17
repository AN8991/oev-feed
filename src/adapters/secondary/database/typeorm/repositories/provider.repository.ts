import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../entities/provider.entity';
/**
 * Repository service for Provider entity operations
 * Simplified to use direct TypeORM without port abstraction
 */
@Injectable()
export class ProviderRepository {
  private readonly logger = new Logger(ProviderRepository.name);

  constructor(
    @InjectRepository(Provider)
    private readonly repository: Repository<Provider>,
  ) {}

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
      this.logger.error('Error finding providers', { isActive, error });
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
      this.logger.error('Error finding provider by ID', { id, error });
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
      this.logger.error('Error finding provider by name', { name, error });
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
      this.logger.error('Error creating provider', { data, error });
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
      this.logger.error('Error updating provider', { id, data, error });
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
      this.logger.error('Error deleting provider', { id, error });
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
