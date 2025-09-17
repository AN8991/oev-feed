import { Module } from '@nestjs/common';
import { ProviderFactory } from './provider-factory';
import { ProviderConfigModule } from '@infrastructure/config/provider-config.module';
import { UtilsModule } from '@infrastructure/utils/utils.module';

/**
 * Provider Factory Module
 * 
 * Provides the ProviderFactory service for dependency injection.
 * Imports ProviderConfigModule and UtilsModule to ensure all dependencies are available.
 */
@Module({
  imports: [ProviderConfigModule, UtilsModule],
  providers: [ProviderFactory],
  exports: [ProviderFactory],
})
export class ProviderFactoryModule {}
