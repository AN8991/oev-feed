import { Contract, Provider } from 'ethers';
import { ProviderAdapterPort, ProviderStats } from '@domain/ports/secondary/provider-adapter.port';
import { logger, LogCategory } from '@infrastructure/utils/structured-logger';
import { metrics, ProviderMetric } from '@infrastructure/utils/metrics-collector';
import { DatabaseService } from '../../../domain/services/database/database.service';

/**
 * Database provider adapter that wraps another provider adapter and records
 * metrics and health status in the database
 */
export class DatabaseProviderAdapter implements ProviderAdapterPort {
  private providerId: string | null = null;
  
  /**
   * Constructor
   * @param baseProvider Provider adapter to wrap
   * @param dbService Database service
   * @param network Blockchain network
   */
  constructor(
    private baseProvider: ProviderAdapterPort,
    private dbService: DatabaseService,
    private _network: string
  ) {}
  
  /**
   * Get the provider name
   */
  get name(): string {
    return this.baseProvider.name;
  }
  
  /**
   * Get the provider type
   */
  get type(): string {
    return this.baseProvider.type;
  }
  
  /**
   * Get provider network
   */
  get network(): string {
    return this._network;
  }
  
  /**
   * Get the underlying ethers provider
   */
  get provider(): Provider {
    return this.baseProvider.provider;
  }
  
  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    // Initialize the wrapped provider
    await this.baseProvider.initialize();
    
    // Initialize database
    await this.dbService.initialize();
    
    // Register provider in database if it doesn't exist
    await this.registerProvider();
  }
  
  /**
   * Register provider in database
   */
  private async registerProvider(): Promise<void> {
    try {
      // Check if provider exists
      const existingProvider = await this.dbService.getProviderByName(this.getName());
      
      if (!existingProvider) {
        // Create provider
        const newProvider = await this.dbService.createProvider({
          name: this.getName(),
          type: this.getType(),
          network: this.network,
          apiKey: 'stored-securely-elsewhere', // API keys should be stored securely, not in DB
          isActive: true,
          priority: 10 // Default priority
        });
        
        this.providerId = newProvider.id;
        logger.info(`Registered provider ${this.getName()} in database`);
      } else {
        this.providerId = existingProvider.id;
        logger.info(`Found existing provider in database: ${this.getName()}`);
      }
    } catch (error) {
      logger.error(`Failed to register provider: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get provider name
   * @returns Provider name
   */
  getName(): string {
    return this.baseProvider.getName();
  }
  
  /**
   * Get provider type
   * @returns Provider type
   */
  getType(): string {
    return this.baseProvider.getType();
  }
  
  /**
   * Check if the provider is healthy
   * @returns True if the provider is healthy, false otherwise
   */
  async isHealthy(): Promise<boolean> {
    const startTime = Date.now();
    try {
      const isHealthy = await this.baseProvider.isHealthy();
      const responseTime = Date.now() - startTime;
      
      // Update health metrics
      await this.updateHealthMetrics(isHealthy, responseTime);
      
      return isHealthy;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.updateHealthMetrics(false, responseTime);
      
      logger.error(`Health check failed for ${this.getName()}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Get provider statistics
   * @returns Provider statistics
   */
  getStats(): ProviderStats {
    return this.baseProvider.getStats();
  }
  
  /**
   * Get contract instance
   * @param address Contract address
   * @param abi Contract ABI
   * @returns Contract instance
   */
  getContract(address: string, abi: any[]): Contract {
    return this.baseProvider.getContract(address, abi);
  }
  
  /**
   * Get the current block number
   * @returns Current block number
   */
  async getBlockNumber(): Promise<number> {
    const startTime = Date.now();
    try {
      const blockNumber = await this.baseProvider.getBlockNumber();
      const responseTime = Date.now() - startTime;
      
      // Update health metrics
      await this.updateHealthMetrics(true, responseTime);
      
      return blockNumber;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.updateHealthMetrics(false, responseTime);
      
      throw error;
    }
  }
  
  /**
   * Get the balance of an address
   * @param address Address to get balance for
   * @returns Balance in wei
   */
  async getBalance(address: string): Promise<bigint> {
    const startTime = Date.now();
    try {
      const balance = await this.baseProvider.getBalance(address);
      const responseTime = Date.now() - startTime;
      
      // Update health metrics
      await this.updateHealthMetrics(true, responseTime);
      
      return balance;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.updateHealthMetrics(false, responseTime);
      
      throw error;
    }
  }
  
  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.baseProvider.cleanup();
  }
  
  /**
   * Make a request to the provider
   * @param method Method name
   * @param params Method parameters
   * @returns Response data
   */
  async request<T>(method: string, params: any[]): Promise<T> {
    const startTime = Date.now();
    try {
      // Forward request to wrapped provider
      // Cast to any since request method is not in the interface but is implemented by all providers
      const result = await (this.baseProvider as any).request(method, params) as T;
      
      // Update metrics
      const responseTime = Date.now() - startTime;
      await this.updateHealthMetrics(true, responseTime);
      
      return result;
    } catch (error) {
      // Update metrics
      const responseTime = Date.now() - startTime;
      await this.updateHealthMetrics(false, responseTime);
      
      // Re-throw error
      throw error;
    }
  }
  
  /**
   * Update provider health metrics
   * @param success Whether the request was successful
   * @param responseTime Response time in milliseconds
   */
  private async updateHealthMetrics(success: boolean, responseTime: number): Promise<void> {
    try {
      // Get provider ID
      if (!this.providerId) {
        const provider = await this.dbService.getProviderByName(this.getName());
        if (!provider) {
          logger.warn(`Provider ${this.getName()} not found in database`);
          return;
        }
        this.providerId = provider.id;
      }
      
      // Record the request with appropriate method
      if (success) {
        await this.dbService.recordSuccessfulRequest(
          this.providerId,
          this.network,
          'provider_request', // Generic method name
          {}, // No params for generic tracking
          responseTime
        );
      } else {
        await this.dbService.recordFailedRequest(
          this.providerId,
          this.network,
          'provider_request', // Generic method name
          {}, // No params for generic tracking
          new Error('Provider request failed'), // Generic error
          responseTime
        );
      }
    } catch (error) {
      logger.error(`Failed to update provider health metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
