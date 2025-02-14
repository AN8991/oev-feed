import { AaveService } from './aave-service';
import { AaveServiceConfig } from './aave-config';
import { log } from '../../../utils/logger';
import { ENV } from '../../../config/env';

export class AaveServiceFactory {
  private static instance: AaveServiceFactory;
  private services: Map<string, AaveService> = new Map();

  private constructor() {}

  static getInstance(): AaveServiceFactory {
    if (!AaveServiceFactory.instance) {
      AaveServiceFactory.instance = new AaveServiceFactory();
    }
    return AaveServiceFactory.instance;
  }

  private getServiceKey(config: AaveServiceConfig): string {
    return `${config.protocol}-${config.network}`;
  }

  private async validateEnvironment(config: AaveServiceConfig): Promise<void> {
    try {
      // Validate API keys based on configuration
      if (config.apiKey) {
        // Use provided API key
        if (!config.apiKey.match(/^[a-zA-Z0-9]+$/)) {
          throw new Error('Invalid API key format');
        }
      } else {
        // Fallback to environment variables
        await ENV.validateAlchemyApiKey();
      }

      // Additional environment validations can be added here
    } catch (error) {
      log.error('Environment validation failed', { error });
      throw error;
    }
  }

  private async initializeService(config: AaveServiceConfig): Promise<AaveService> {
    try {
      // Validate environment before creating service
      await this.validateEnvironment(config);

      // Create and initialize service
      const service = new AaveService(config);
      await service.initialize();

      return service;
    } catch (error) {
      log.error('Failed to initialize Aave service', { error, config });
      throw error;
    }
  }

  async createService(config: AaveServiceConfig): Promise<AaveService> {
    const key = this.getServiceKey(config);

    if (this.services.has(key)) {
      log.warn('Service instance already exists', { key });
      return this.services.get(key)!;
    }

    const service = await this.initializeService(config);
    this.services.set(key, service);
    
    log.info('Created new Aave service instance', { key });
    return service;
  }

  async disposeService(config: AaveServiceConfig): Promise<void> {
    const key = this.getServiceKey(config);
    const service = this.services.get(key);

    if (service) {
      await service.dispose();
      this.services.delete(key);
      log.info('Disposed Aave service', { key });
    }
  }

  async disposeAll(): Promise<void> {
    const disposePromises: Promise<void>[] = [];
    
    for (const [key, service] of this.services.entries()) {
      disposePromises.push(
        service.dispose()
          .catch(error => {
            log.error('Error disposing service', { key, error });
            throw error;
          })
      );
    }

    await Promise.all(disposePromises);
    this.services.clear();
    log.info('All Aave services disposed');
  }
}
