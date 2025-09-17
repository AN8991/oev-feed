import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProviderConfigService } from './provider-config';

/**
 * Global Provider Configuration Module
 * Makes ProviderConfigService available across all modules for blockchain provider configuration
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [ProviderConfigService],
  exports: [ProviderConfigService],
})
export class ProviderConfigModule {}
