/**
 * Provider Repository Port
 * Defines the contract for provider repository implementations in the hexagonal architecture
 */

export interface ProviderRepositoryPort<Provider> {
  /**
   * Find all providers
   * @param isActive Optional filter for active providers
   * @returns Array of providers
   */
  findAll(isActive?: boolean): Promise<Provider[]>;

  /**
   * Find provider by ID
   * @param id Provider ID
   * @returns Provider or null if not found
   */
  findById(id: string): Promise<Provider | null>;

  /**
   * Find provider by name
   * @param name Provider name
   * @returns Provider or null if not found
   */
  findByName(name: string): Promise<Provider | null>;

  /**
   * Create a new provider
   * @param data Provider data
   * @returns Created provider
   */
  create(data: Partial<Provider>): Promise<Provider>;

  /**
   * Update a provider
   * @param id Provider ID
   * @param data Updated provider data
   * @returns Updated provider
   */
  update(id: string, data: Partial<Provider>): Promise<Provider>;

  /**
   * Delete a provider
   * @param id Provider ID
   * @returns True if deleted
   */
  delete(id: string): Promise<boolean>;

  /**
   * Soft delete a provider by setting isActive to false
   * @param id Provider ID
   * @returns Updated provider
   */
  deactivate(id: string): Promise<Provider>;

  /**
   * Activate a provider
   * @param id Provider ID
   * @returns Updated provider
   */
  activate(id: string): Promise<Provider>;
}
