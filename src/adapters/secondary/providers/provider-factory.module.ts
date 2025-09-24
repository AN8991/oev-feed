import { Module } from '@nestjs/common';
import { ProviderFactory } from './provider-factory';
import { ProviderConfigModule } from '@infrastructure/config/provider-config.module';

/**
 * Provider Factory Module
 * 
 * Provides the ProviderFactory service for dependency injection.
 * Note: RequestDistributor dependency will be resolved from AppModule.
 */
@Module({
  imports: [ProviderConfigModule],
  providers: [ProviderFactory],
  exports: [ProviderFactory],
})
export class ProviderFactoryModule {}
