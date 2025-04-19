/**
 * Provider Request Repository Port
 * Defines the contract for provider request repository implementations in the hexagonal architecture
 */

export interface ProviderRequestRepositoryPort<ProviderRequest> {
  /**
   * Create a new provider request record
   * @param data Provider request data
   * @returns Created provider request
   */
  create(data: Partial<ProviderRequest>): Promise<ProviderRequest>;

  /**
   * Find requests by provider ID
   * @param providerId Provider ID
   * @param limit Maximum number of records to return
   * @returns Array of provider requests
   */
  findByProviderId(providerId: string, limit?: number): Promise<ProviderRequest[]>;

  /**
   * Get request statistics for a provider
   * @param providerId Provider ID
   * @param startTime Start time for the period
   * @param endTime End time for the period
   * @returns Statistics object
   */
  getProviderStats(
    providerId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{
    totalRequests: number;
    successCount: number;
    errorCount: number;
    rateLimitCount: number;
    averageResponseTime: number;
  }>;

  /**
   * Get rate limit status for a provider
   * @param providerId Provider ID
   * @param timeWindowMs Time window in milliseconds to check for rate limits
   * @returns Number of requests in the time window
   */
  getRateLimitStatus(providerId: string, timeWindowMs?: number): Promise<number>;

  /**
   * Delete old provider request records
   * @param olderThan Date threshold for deletion
   * @returns Number of deleted records
   */
  deleteOldRecords(olderThan: Date): Promise<number>;
}
