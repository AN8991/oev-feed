// Secondary (outbound) port for protocol adapters
export interface ProtocolAdapterPort {
  /**
   * Initialize the adapter, setting up necessary configurations
   * @returns Promise resolving when initialization is complete
   */
  initialize(): Promise<void>;

  /**
   * Fetch user positions for a specific address
   * @param userAddress Address to fetch positions for
   * @returns Promise resolving to an array of position models
   */
  fetchUserPositions(userAddress: string): Promise<any[]>;

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
