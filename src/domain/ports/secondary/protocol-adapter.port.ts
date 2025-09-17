// Secondary (outbound) port for protocol adapters
export interface ProtocolAdapterPort {
  /**
   * Initialize the adapter, setting up necessary configurations
   * @returns Promise resolving when initialization is complete
   */
  initialize(): Promise<void>;

  /**
   * Fetch user positions for multiple addresses with optional filters
   * @param params Query parameters including user addresses and filters
   * @returns Promise resolving to an array of position models
   */
  fetchUserPositions(params: {
    userAddresses: string[];
    filterCriteria?: any;
    startTimestamp?: number;
    endTimestamp?: number;
  }): Promise<any[]>;

  /**
   * Get health factor for a specific user address
   * @param userAddress Address to get health factor for
   * @returns Promise resolving to health factor as a string
   */
  getHealthFactor(userAddress: string): Promise<string>;

  /**
   * Clean up resources used by the adapter
   * @returns Promise resolving when cleanup is complete
   */
  cleanup(): Promise<void>;
}
