/**
 * Provider Health Repository Port
 * Defines the contract for provider health repository implementations in the hexagonal architecture
 */

export interface ProviderHealthRepositoryPort<ProviderHealth> {
  /**
   * Find or create provider health record
   * @param providerId Provider ID
   * @param network Network name
   * @returns Provider health record
   */
  findOrCreate(providerId: string, network: string): Promise<ProviderHealth>;

  /**
   * Update provider health status
   * @param providerId Provider ID
   * @param network Network name
   * @param updates Health status updates
   * @returns Updated provider health
   */
  updateHealth(
    providerId: string,
    network: string,
    updates: Partial<ProviderHealth>
  ): Promise<ProviderHealth>;

  /**
   * Record a successful request
   * @param providerId Provider ID
   * @param network Network name
   * @param responseTime Response time in ms
   * @returns Updated provider health
   */
  recordSuccess(
    providerId: string,
    network: string,
    responseTime: number
  ): Promise<ProviderHealth>;

  /**
   * Record a failed request
   * @param providerId Provider ID
   * @param network Network name
   * @param isRateLimit Whether the error is a rate limit error
   * @returns Updated provider health
   */
  recordError(
    providerId: string,
    network: string,
    isRateLimit?: boolean
  ): Promise<ProviderHealth>;

  /**
   * Get all healthy providers for a network
   * @param network Network name
   * @returns Array of healthy provider records
   */
  getHealthyProviders(network: string): Promise<ProviderHealth[]>;

  /**
   * Reset health metrics for a provider
   * @param providerId Provider ID
   * @param network Network name
   * @returns Reset provider health
   */
  resetHealth(providerId: string, network: string): Promise<ProviderHealth>;
}
