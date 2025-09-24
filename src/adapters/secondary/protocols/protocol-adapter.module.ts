import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProtocolAdapterService } from './protocol-adapter.service';
import { ProtocolAdapterFactory } from './protocol-adapter-factory';
import { ProviderConfigModule } from '@infrastructure/config/provider-config.module';

/**
 * Protocol Adapter Module
 * Provides protocol adapters as NestJS services following hexagonal architecture
 * Note: AavePositionMapper dependency will be resolved from AppModule.
 */
@Module({
  imports: [ConfigModule, ProviderConfigModule],
  providers: [ProtocolAdapterService, ProtocolAdapterFactory],
  exports: [ProtocolAdapterService, ProtocolAdapterFactory],
})
export class ProtocolAdapterModule {}
