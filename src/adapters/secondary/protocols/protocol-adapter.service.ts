import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@infrastructure/config/config';
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
        // Convert initialization failures to warnings to prevent app startup failures
        this.logger.warn(`Skipping ${protocol}-${network} adapter initialization due to missing configuration: ${error instanceof Error ? error.message : String(error)}`);
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
    const baseConfig: any = {
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

    // Add protocol-specific contract addresses
    if (protocol === 'aave-v2' && network === 'ethereum') {
      baseConfig.poolAddress = process.env.AAVE_V2_ETHEREUM_POOL;
      baseConfig.dataProviderAddress = process.env.AAVE_V2_ETHEREUM_DATA_PROVIDER;
      baseConfig.oracleAddress = process.env.AAVE_V2_ETHEREUM_ORACLE;
      baseConfig.providerUrl = process.env.ETHEREUM_RPC_URL;
    } else if (protocol === 'aave-v3' && network === 'ethereum') {
      baseConfig.poolAddress = process.env.AAVE_V3_ETHEREUM_POOL;
      baseConfig.dataProviderAddress = process.env.AAVE_V3_ETHEREUM_DATA_PROVIDER;
      baseConfig.oracleAddress = process.env.AAVE_V3_ETHEREUM_ORACLE;
      baseConfig.providerUrl = process.env.ETHEREUM_RPC_URL;
    }

    return baseConfig;
  }
}
