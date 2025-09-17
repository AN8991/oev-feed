import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@infrastructure/config/config';
import { ProviderConfigService } from '@infrastructure/config/provider-config';
import { ProtocolAdapterFactory } from './protocol-adapter-factory';
import { ProtocolAdapterPort } from '@domain/ports/secondary/protocol-adapter.port';

/**
 * NestJS service wrapper for protocol adapters
 * Manages lifecycle and provides dependency injection for existing adapters
 */
@Injectable()
export class ProtocolAdapterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProtocolAdapterService.name);
  private readonly supportedProtocols = [
    { protocol: 'aave-v2', network: 'ethereum' },
    { protocol: 'aave-v3', network: 'ethereum' }
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly providerConfigService: ProviderConfigService,
    private readonly protocolAdapterFactory: ProtocolAdapterFactory
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Protocol Adapter Service...');
    
    // Pre-initialize adapters for supported protocols
    for (const { protocol, network } of this.supportedProtocols) {
      try {
        const config = this.getAdapterConfig(protocol, network);
        const adapter = this.protocolAdapterFactory.createAdapter(protocol, network, config);
        await adapter.initialize();
        this.logger.log(`Initialized ${protocol}-${network} adapter`);
      } catch (error) {
        this.logger.error(`Failed to initialize ${protocol}-${network} adapter:`, error);
      }
    }
  }

  async onModuleDestroy() {
    this.logger.log('Cleaning up Protocol Adapter Service...');
    await this.protocolAdapterFactory.cleanupAll();
  }

  /**
   * Get adapter for specific protocol and network
   */
  getAdapter(protocol: string, network: string): ProtocolAdapterPort {
    const config = this.getAdapterConfig(protocol, network);
    return this.protocolAdapterFactory.createAdapter(protocol, network, config);
  }

  /**
   * Get all available adapters
   */
  getAllAdapters(): ProtocolAdapterPort[] {
    return this.protocolAdapterFactory.getAllAdapters();
  }

  /**
   * Get supported protocol-network combinations
   */
  getSupportedProtocols(): Array<{ protocol: string; network: string }> {
    return [...this.supportedProtocols];
  }

  /**
   * Generate adapter configuration using modernized configuration services
   */
  private getAdapterConfig(protocol: string, network: string): any {
    // Build configuration from separate config services
    const baseConfig = {
      database: this.configService.database,
      logging: {
        level: this.configService.logLevel,
        enabled: true
      },
      network: {
        name: network,
        chainId: network === 'ethereum' ? 1 : 0
      },
      protocol: {
        name: protocol,
        version: protocol.includes('v2') ? 'v2' : 'v3'
      }
    };

    // Add provider configuration if network is supported
    try {
      if (this.providerConfigService.isNetworkSupported(network)) {
        const networkConfig = this.providerConfigService.getNetwork(network);
        baseConfig.network = {
          ...baseConfig.network,
          ...networkConfig
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to get network config for ${network}:`, error);
    }

    return baseConfig;
  }
}
