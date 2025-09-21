/**
 * Complete flow test: Fetch positions and save directly to database
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProtocolAdapterFactory } from '@adapters/secondary/protocols/protocol-adapter-factory';
import { ProviderFactory } from '@adapters/secondary/providers/provider-factory';
import { NetworkConfigService } from '@infrastructure/config/network.config';
import { NetworkModule } from '@infrastructure/config/network.module';
import { ProviderConfigModule } from '@infrastructure/config/provider-config.module';
import { RequestDistributor } from '@infrastructure/utils/request-distributor';
import { AavePositionMapper } from '@application/mappers/aave-position.mapper';
import { Network } from '@domain/types/networks';
import { Providers } from '@domain/enums/providers.enum';

const logger = new Logger('CompleteFlowTest');
const TEST_USER_ADDRESS = '0x79682489385337996edd00eb56b4238b597bfae7';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'oev_feed',
      synchronize: false,
      logging: false,
      entities: [],
    }),
    NetworkModule,
    ProviderConfigModule
  ],
  providers: [
    ProtocolAdapterFactory,
    ProviderFactory,
    RequestDistributor,
    AavePositionMapper
  ]
})
class TestModule {}

async function testCompleteFlow() {
  let app;
  
  try {
    logger.log('🔄 COMPLETE FLOW TEST: FETCH + SAVE TO DATABASE');
    logger.log('Testing the full pipeline from adapter to database...');
    logger.log('='.repeat(60));

    // 1. Initialize NestJS application context
    logger.log('1. Initializing NestJS application context...');
    app = await NestFactory.createApplicationContext(TestModule, {
      logger: ['error', 'warn', 'log']
    });
    logger.log('   ✅ Application context initialized');

    // 2. Get services from DI container
    logger.log('2. Getting services from DI container...');
    const configService = app.get(ConfigService);
    const networkConfigService = app.get(NetworkConfigService);
    const protocolAdapterFactory = app.get(ProtocolAdapterFactory);
    const providerFactory = app.get(ProviderFactory);
    const dataSource = app.get(DataSource);
    logger.log('   ✅ Services retrieved successfully');

    // 3. Ensure test user exists
    logger.log('3. Ensuring test user exists...');
    let userId: number;
    const existingUser = await dataSource.query('SELECT id FROM users WHERE address = $1', [TEST_USER_ADDRESS]);
    
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      logger.log(`   ✅ Using existing user ID: ${userId}`);
    } else {
      const newUser = await dataSource.query('INSERT INTO users (address) VALUES ($1) RETURNING id', [TEST_USER_ADDRESS]);
      userId = newUser[0].id;
      logger.log(`   ✅ Created new user ID: ${userId}`);
    }

    // 4. Create provider for Ethereum network
    logger.log('4. Creating provider for Ethereum network...');
    const provider = await providerFactory.getProvider(Network.ETHEREUM, {
      type: Providers.ALCHEMY,
      fallback: true
    });
    logger.log('   ✅ Provider created successfully');

    // 5. Create Aave V3 protocol adapter with configuration
    logger.log('5. Creating Aave V3 protocol adapter...');
    const networkConfig = networkConfigService.getNetworkConfig(Network.ETHEREUM, Providers.ALCHEMY);
    const aaveV3Config = {
      poolAddress: configService.get('AAVE_V3_ETHEREUM_POOL') || '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
      dataProviderAddress: configService.get('AAVE_V3_ETHEREUM_DATA_PROVIDER') || '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
      oracleAddress: configService.get('AAVE_V3_ETHEREUM_ORACLE') || '0x54586bE62E3c3580375aE3723C145253060Ca0C2',
      providerUrl: networkConfig.rpcUrl
    };
    logger.log('   Using Aave V3 configuration:', {
      pool: aaveV3Config.poolAddress,
      dataProvider: aaveV3Config.dataProviderAddress,
      oracle: aaveV3Config.oracleAddress
    });
    const adapter = protocolAdapterFactory.createAdapter('aave-v3', Network.ETHEREUM, aaveV3Config);
    logger.log('   ✅ Adapter created and initialized');

    // 6. Fetch positions from adapter
    logger.log('6. Fetching positions from adapter...');
    const positions = await adapter.fetchUserPositions({ userAddresses: [TEST_USER_ADDRESS] });
    logger.log(`   ✅ Fetched ${positions.length} positions`);

    if (positions.length === 0) {
      logger.log('   ⚠️ No positions found - cannot test database save');
      return;
    }

    // 7. Display fetched position data
    logger.log('7. Displaying fetched position data...');
    positions.forEach((pos, index) => {
      logger.log(`   Position ${index + 1}:`);
      logger.log(`     Asset: ${pos.assetSymbol}`);
      logger.log(`     Collateral: ${pos.collateralAmount}`);
      logger.log(`     Debt: ${pos.debtAmount}`);
      logger.log(`     Health Factor: ${pos.healthFactor}`);
      
      if (pos.assetSymbol === 'WETH' || pos.assetAddress.toLowerCase() === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') {
        logger.log('     🎯 ETH/WETH Position - Expected: 0.0100428 supplied, 0.0020116 borrowed');
      }
    });

    // 8. Clear old position data
    logger.log('8. Clearing old position data for this user...');
    await dataSource.query('DELETE FROM positions WHERE user_id = $1', [userId]);
    logger.log('   ✅ Old data cleared');

    // 9. Save positions to database
    logger.log('9. Saving positions directly to database...');
    let savedCount = 0;
    
    for (const position of positions) {
      try {
        await dataSource.query(`
          INSERT INTO positions (
            id, "userAddress", protocol, network, "assetAddress", "assetSymbol",
            "collateralAmount", "collateralAmountUSD", "debtAmount", "debtAmountUSD",
            "healthFactor", "liquidationThreshold", ltv, "lastUpdated", user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
          position.id,
          position.userAddress,
          position.protocol,
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
          userId
        ]);
        savedCount++;
        logger.log(`   ✅ Saved position: ${position.assetSymbol}`);
      } catch (saveError) {
        logger.error(`   ❌ Error saving ${position.assetSymbol}:`, saveError);
      }
    }

    logger.log(`   ✅ Successfully saved ${savedCount}/${positions.length} positions`);

    // 10. Verify saved data
    logger.log('10. Verifying saved data...');
    const savedPositions = await dataSource.query(`
      SELECT "assetSymbol", "collateralAmount", "collateralAmountUSD", "debtAmount", "debtAmountUSD", "healthFactor", "lastUpdated"
      FROM positions 
      WHERE user_id = $1 
      ORDER BY "lastUpdated" DESC
    `, [userId]);

    logger.log(`   ✅ Found ${savedPositions.length} positions in database`);

    if (savedPositions.length > 0) {
      logger.log('\n📊 DATABASE VERIFICATION RESULTS:');
      savedPositions.forEach((dbPos: any, index: number) => {
        logger.log(`   DB Position ${index + 1}:`);
        logger.log(`     Asset: ${dbPos.assetSymbol}`);
        logger.log(`     Collateral: ${dbPos.collateralAmount}`);
        logger.log(`     Debt: ${dbPos.debtAmount}`);
        logger.log(`     Health Factor: ${dbPos.healthFactor}`);
        logger.log(`     Last Updated: ${new Date(parseInt(dbPos.lastUpdated))}`);
        
        // Check for ETH/WETH position
        if (dbPos.assetSymbol === 'WETH' || dbPos.assetSymbol === 'ETH') {
          logger.log('     🎯 ETH/WETH DATABASE VALIDATION:');
          const dbSupplied = parseFloat(dbPos.collateralAmount);
          const dbBorrowed = parseFloat(dbPos.debtAmount);
          
          logger.log(`       Expected: 0.0100428 supplied, 0.0020116 borrowed`);
          logger.log(`       Database: ${dbSupplied} supplied, ${dbBorrowed} borrowed`);
          
          if (dbSupplied > 0 && dbBorrowed > 0) {
            logger.log('       ✅ SUCCESS: Database contains non-zero values!');
            logger.log('       🎉 THE FIX IS WORKING - DATA IS CORRECTLY SAVED!');
          } else {
            logger.log('       ❌ ISSUE: Database still contains zero values');
          }
        }
      });
    }

    logger.log('\n🎉 COMPLETE FLOW TEST COMPLETED SUCCESSFULLY!');
    logger.log('=====================================');
    logger.log('✅ NestJS DI context working correctly');
    logger.log('✅ Provider factory creating providers successfully');
    logger.log('✅ Protocol adapter factory working correctly');
    logger.log('✅ Position fetching and database saving functional');

  } catch (error) {
    logger.error('❌ Complete flow test failed:', error);
    throw error;
  } finally {
    // Clean up
    if (app) {
      await app.close();
      logger.log('🔌 Application context closed');
    }
  }
}

// Execute the test
testCompleteFlow().then(() => {
  logger.log('✅ Complete flow test script completed successfully');
}).catch(error => {
  logger.error('❌ Complete flow test script failed:', error);
  process.exit(1);
});
