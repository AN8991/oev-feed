#!/usr/bin/env ts-node

/**
 * AAVE V3 Position Processor
 *
 * Processes discovered users from the users table and fetches detailed position data
 * from AAVE V3 protocol, then saves enriched position data to the positions table.
 *
 * This script transforms discovered wallet addresses into comprehensive position data
 * with risk assessments and detailed financial metrics.
 *
 * Usage:
 * npm run position-processor:aave-v3 -- --network=ethereum
 */

import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProtocolAdapterFactory } from '../../src/adapters/secondary/protocols/protocol-adapter-factory';
import { ProtocolAdapterService } from '../../src/adapters/secondary/protocols/protocol-adapter.service';
import { ProviderFactory } from '../../src/adapters/secondary/providers/provider-factory';
import { NetworkConfigService } from '../../src/infrastructure/config/network.config';
import { NetworkModule } from '../../src/infrastructure/config/network.module';
import { ProviderConfigModule } from '../../src/infrastructure/config/provider-config.module';
import { RequestDistributor } from '../../src/infrastructure/utils/request-distributor';
import { PositionEntity } from '../../src/adapters/secondary/database/typeorm/entities/position.entity';
import { UserEntity } from '../../src/adapters/secondary/database/typeorm/entities/user.entity';
import { RiskAssessmentService } from '../../src/application/services/risk-assessment.service';
import { PositionsService } from '../../src/application/services/positions.service';
import { AavePositionMapper } from '../../src/application/mappers/aave-position.mapper';
import { ConfigService as InfraConfigService } from '../../src/infrastructure/config/config';
import { ProviderConfigService } from '../../src/infrastructure/config/provider-config';
import { Network } from '../../src/domain/types/networks';
import { Providers } from '../../src/domain/enums/providers.enum';
import { Protocol } from '../../src/domain/enums/protocols.enum';
import { Protocol as ProtocolType, UserProtocolPosition } from '../../src/domain/types/protocols';
import { PositionModel } from '../../src/domain/models/position.model';

// Load environment variables
dotenv.config();

const logger = new Logger('AaveV3PositionProcessor');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'oev_feed',
      synchronize: false,
      logging: false,
      entities: [PositionEntity, UserEntity],
    }),
    TypeOrmModule.forFeature([PositionEntity, UserEntity]),
    NetworkModule,
    ProviderConfigModule
  ],
  providers: [
    ProtocolAdapterFactory,
    ProtocolAdapterService,
    ProviderFactory,
    RequestDistributor,
    RiskAssessmentService,
    PositionsService,
    AavePositionMapper,
    InfraConfigService,
    ProviderConfigService
  ]
})
class PositionProcessorModule {}

interface ProcessingOptions {
  network: Network;
  protocol: Protocol;
  batchSize: number;
  maxUsers?: number;
  skipProcessed: boolean;
}

class PositionProcessor {
  private app: any;
  private dataSource!: DataSource;
  private adapter: any;
  private riskAssessmentService!: RiskAssessmentService;
  private userRepo!: Repository<UserEntity>;
  private positionRepo!: Repository<PositionEntity>;

  constructor(private options: ProcessingOptions) {}

  async initialize() {
    try {
      logger.log('🔧 Initializing Position Processor...');

      // Initialize NestJS application context
      this.app = await NestFactory.createApplicationContext(PositionProcessorModule, {
        logger: ['error', 'warn']
      });

      // Get services from DI container
      const networkConfigService = this.app.get(NetworkConfigService);
      const protocolAdapterFactory = this.app.get(ProtocolAdapterFactory);
      this.dataSource = this.app.get(DataSource);
      this.riskAssessmentService = this.app.get(RiskAssessmentService);

      this.userRepo = this.dataSource.getRepository(UserEntity);
      this.positionRepo = this.dataSource.getRepository(PositionEntity);

      // Get network configuration
      const networkConfig = networkConfigService.getNetworkConfig(this.options.network, Providers.INFURA);

      // Create Aave V3 adapter configuration
      const configService = this.app.get(ConfigService);
      const adapterConfig = {
        poolAddress: configService.get('AAVE_V3_ETHEREUM_POOL') || '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
        dataProviderAddress: configService.get('AAVE_V3_ETHEREUM_DATA_PROVIDER') || '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
        oracleAddress: configService.get('AAVE_V3_ETHEREUM_ORACLE') || '0x54586bE62E3c3580375aE3723C145253060Ca0C2',
        providerUrl: networkConfig.rpcUrl
      };

      // Create and initialize Aave V3 adapter
      this.adapter = protocolAdapterFactory.createAdapter('aave-v3', this.options.network, adapterConfig);
      await this.adapter.initialize();

      logger.log('✅ Position Processor initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize Position Processor:', error);
      throw error;
    }
  }

  async processUsers() {
    try {
      logger.log('🚀 Starting position enrichment process...');
      logger.log(`📍 Network: ${this.options.network}`);
      logger.log(`🏛️ Protocol: ${this.options.protocol}`);
      logger.log(`📦 Batch Size: ${this.options.batchSize}`);
      logger.log(`🎯 Max Users: ${this.options.maxUsers || 'All'}`);
      logger.log(`⏭️ Skip Processed: ${this.options.skipProcessed}`);

      // Query discovered users
      let query = this.userRepo.createQueryBuilder('user')
        .where('user.protocol = :protocol', { protocol: this.options.protocol })
        .andWhere('user.network = :network', { network: this.options.network });

      if (this.options.skipProcessed) {
        // Skip users who already have positions
        query = query.leftJoin('user.positions', 'position')
          .groupBy('user.id')
          .having('COUNT(position.id) = 0');
      }

      if (this.options.maxUsers) {
        query = query.limit(this.options.maxUsers);
      }

      const users = await query.getMany();
      logger.log(`📊 Found ${users.length} users to process`);

      if (users.length === 0) {
        logger.log('✅ No users to process');
        return { processed: 0, positions: 0, errors: 0 };
      }

      // Process in batches
      let totalProcessed = 0;
      let totalPositions = 0;
      let totalErrors = 0;

      for (let i = 0; i < users.length; i += this.options.batchSize) {
        const batch = users.slice(i, i + this.options.batchSize);
        const batchNumber = Math.floor(i / this.options.batchSize) + 1;
        const totalBatches = Math.ceil(users.length / this.options.batchSize);

        logger.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)`);

        try {
          const batchResult = await this.processBatch(batch);
          totalProcessed += batchResult.processed;
          totalPositions += batchResult.positions;
          totalErrors += batchResult.errors;

          logger.log(`✅ Batch ${batchNumber} completed: ${batchResult.processed} users, ${batchResult.positions} positions`);

        } catch (batchError) {
          logger.error(`❌ Batch ${batchNumber} failed:`, batchError);
          totalErrors += batch.length;
        }
      }

      logger.log('🎯 POSITION ENRICHMENT COMPLETED');
      logger.log('=====================================');
      logger.log(`📊 Total Users Processed: ${totalProcessed}`);
      logger.log(`🏦 Total Positions Created: ${totalPositions}`);
      logger.log(`❌ Total Errors: ${totalErrors}`);

      return { processed: totalProcessed, positions: totalPositions, errors: totalErrors };

    } catch (error) {
      logger.error('❌ Position enrichment failed:', error);
      throw error;
    }
  }

  private async processBatch(users: UserEntity[]) {
    const userAddresses = users.map(u => u.address);
    let processed = 0;
    let positions = 0;
    let errors = 0;

    try {
      // Fetch positions for all users in batch
      const fetchedPositions = await this.adapter.fetchUserPositions({ userAddresses });

      // Group positions by user address
      const positionsByUser = new Map<string, PositionModel[]>();
      fetchedPositions.forEach((position: PositionModel) => {
        const userAddress = position.userAddress.toLowerCase();
        if (!positionsByUser.has(userAddress)) {
          positionsByUser.set(userAddress, []);
        }
        positionsByUser.get(userAddress)!.push(position);
      });

      // Process each user
      for (const user of users) {
        try {
          const userPositions = positionsByUser.get(user.address.toLowerCase()) || [];

          if (userPositions.length > 0) {
            await this.saveUserPositions(user, userPositions);
            positions += userPositions.length;
          }

          processed++;
        } catch (userError) {
          logger.warn(`⚠️ Failed to process user ${user.address}:`, userError);
          errors++;
        }
      }

    } catch (fetchError) {
      logger.error('❌ Failed to fetch positions for batch:', fetchError);
      errors += users.length;
    }

    return { processed, positions, errors };
  }

  private async saveUserPositions(user: UserEntity, positions: PositionModel[]) {
    // Clear old position data for this user
    await this.dataSource.query('DELETE FROM positions WHERE user_id = $1', [user.id]);

    let savedCount = 0;

    for (const position of positions) {
      try {
        // Save position to database
        await this.dataSource.query(`
          INSERT INTO positions (
            id, "userAddress", protocol, network, "assetAddress", "assetSymbol",
            "collateralAmount", "collateralAmountUSD", "debtAmount", "debtAmountUSD",
            "healthFactor", "liquidationThreshold", ltv, "lastUpdated", user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
          position.id,
          position.userAddress,
          this.mapProtocolToString(position.protocol), // Normalize protocol to 'AAVE' for database storage
          position.network,
          position.assetAddress,
          position.assetSymbol,
          position.collateralAmount,
          position.collateralAmountUSD || '0',
          position.debtAmount,
          position.debtAmountUSD || '0',
          position.healthFactor,
          position.liquidationThreshold,
          position.ltv,
          position.lastUpdated,
          user.id
        ]);

        // Calculate and save risk assessment
        await this.saveRiskAssessment(position, user.id);

        savedCount++;
      } catch (saveError) {
        logger.warn(`⚠️ Failed to save position ${position.id}:`, saveError);
      }
    }

    if (savedCount > 0) {
      logger.debug(`💾 Saved ${savedCount}/${positions.length} positions for user ${user.address}`);
    }
  }

  private async saveRiskAssessment(position: PositionModel, userId: number) {
    try {
      const userProtocolPosition: UserProtocolPosition = {
        userAddress: position.userAddress,
        protocol: ProtocolType.AAVE, // Risk assessment expects AAVE, not AAVE_V3
        network: position.network as Network,
        version: 'v3',
        collateral: position.collateralAmount,
        debt: position.debtAmount,
        healthFactor: position.healthFactor,
        liquidationRisk: {
          threshold: position.liquidationThreshold,
          currentLTV: position.ltv
        },
        suppliedAssets: [{
          symbol: position.assetSymbol,
          address: position.assetAddress,
          amount: position.collateralAmount,
          valueETH: position.collateralAmount
        }],
        borrowedAssets: position.debtAmount !== '0' ? [{
          symbol: position.assetSymbol,
          amount: position.debtAmount,
          valueETH: position.debtAmount,
          address: position.assetAddress
        }] : [],
        fetchedTimestamp: Date.now()
      };

      const riskAssessment = await this.riskAssessmentService.calculateRiskAssessment(userProtocolPosition);

      await this.dataSource.query(`
        UPDATE positions
        SET risk_score = $1, risk_level = $2, risk_assessed_at = $3
        WHERE id = $4
      `, [
        riskAssessment.compositeRiskScore,
        riskAssessment.riskLevel,
        new Date(),
        position.id
      ]);

    } catch (riskError) {
      logger.warn(`⚠️ Risk assessment failed for position ${position.id}:`, riskError);
    }
  }

  private mapProtocolToString(protocol: string): string {
    switch (protocol.toLowerCase()) {
      case 'aave':
      case 'aave-v2':
      case 'aave-v3':
        return 'AAVE';
      default:
        return protocol.toUpperCase();
    }
  }

  async cleanup() {
    if (this.app) {
      await this.app.close();
    }
  }
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let network: Network = Network.ETHEREUM;
  let protocol: Protocol = Protocol.AAVE_V3;
  let batchSize = 5;
  let maxUsers: number | undefined;
  let skipProcessed = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--network' && i + 1 < args.length) {
      network = args[i + 1] as Network;
      i++;
    } else if (arg === '--protocol' && i + 1 < args.length) {
      protocol = args[i + 1] as Protocol;
      i++;
    } else if (arg === '--batch-size' && i + 1 < args.length) {
      batchSize = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--max-users' && i + 1 < args.length) {
      maxUsers = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--skip-processed') {
      skipProcessed = true;
    }
  }

  const options: ProcessingOptions = {
    network,
    protocol,
    batchSize,
    maxUsers,
    skipProcessed
  };

  const processor = new PositionProcessor(options);

  try {
    await processor.initialize();
    const result = await processor.processUsers();

    logger.log('🎉 Position enrichment completed successfully!');
    logger.log(`📈 Results: ${result.processed} users processed, ${result.positions} positions created`);

  } catch (error) {
    logger.error('💥 Position enrichment failed:', error);
    process.exit(1);
  } finally {
    await processor.cleanup();
  }
}

// Run the processor
main().catch(error => {
  logger.error('💥 AAVE V3 Position Processor failed:', error);
  process.exit(1);
});
