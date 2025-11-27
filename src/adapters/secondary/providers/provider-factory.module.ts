import { Module } from '@nestjs/common';
import { ProviderFactory } from './provider-factory';
import { NetworkModule } from '@infrastructure/config/network.module';

/**
 * Provider Factory Module
 * 
 * Provides the ProviderFactory service for dependency injection.
 * Note: RequestDistributor dependency will be resolved from AppModule.
 */
@Module({
  imports: [NetworkModule],
  providers: [ProviderFactory],
  exports: [ProviderFactory],
})
export class ProviderFactoryModule {}
