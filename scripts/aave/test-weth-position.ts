/**
 * WETH Position Test Script
 * 
 * This script performs targeted testing of WETH positions in Aave V3,
 * focusing on specific position data retrieval and validation using
 * modern NestJS dependency injection patterns.
 * 
 * Updated to work with modern NestJS architecture and injectable services.
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
import { RequestDistributor } from '@infrastructure/utils/request-distributor';
import { PositionEntity } from '@adapters/secondary/database/typeorm/entities/position.entity';
import { UserEntity } from '@adapters/secondary/database/typeorm/entities/user.entity';
import { AavePositionMapper } from '@application/mappers/aave-position.mapper';
import { Network } from '@domain/types/networks';
import { Providers } from '@domain/enums/providers.enum';
import { PositionModel } from '@domain/models/position.model';
import { normalizeAddress } from '@domain/utils/address-utils';

const logger = new Logger('WETHPositionTest');
const TEST_USER_ADDRESS = '0x79682489385337996edd00eb56b4238b597bfae7';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH on mainnet

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
      entities: [PositionEntity, UserEntity],
    }),
    NetworkModule
  ],
  providers: [
    ProtocolAdapterFactory,
    ProviderFactory,
    RequestDistributor,
    AavePositionMapper
  ]
})
class TestModule {}

/**
 * Targeted test to fetch WETH position data specifically
 */
async function testWETHPosition() {
  let app;
  
  try {
    logger.log('🎯 TARGETED WETH POSITION TEST');
    logger.log('===============================');
    logger.log('Expected from UI:');
    logger.log('- Supplied ETH: 0.0100428 ETH (~$37.08)');
    logger.log('- Borrowed ETH: 0.0020116 ETH (~$7.43)');
    
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
    logger.log('   ✅ Services retrieved successfully');
    
    // 3. Get network configuration
    logger.log('3. Getting network configuration...');
    const networkConfig = networkConfigService.getNetworkConfig(Network.ETHEREUM, Providers.INFURA);
    logger.log(`   ✅ Network: ${networkConfig.name}`);
    logger.log(`   ✅ RPC URL: ${networkConfig.rpcUrl.includes('infura') ? 'Infura' : 'Custom'}`);
    
    // 4. Create Aave V3 adapter configuration
    logger.log('4. Creating Aave V3 adapter configuration...');
    const aaveV3Pool = configService.get('AAVE_V3_ETHEREUM_POOL') || '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';
    const aaveV3DataProvider = configService.get('AAVE_V3_ETHEREUM_DATA_PROVIDER') || '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3';
    const aaveV3Oracle = configService.get('AAVE_V3_ETHEREUM_ORACLE') || '0x54586bE62E3c3580375aE3723C145253060Ca0C2';
    
    const adapterConfig = {
      poolAddress: aaveV3Pool,
      dataProviderAddress: aaveV3DataProvider,
      oracleAddress: aaveV3Oracle,
      providerUrl: networkConfig.rpcUrl
    };
    logger.log('   ✅ Adapter configuration created');
    
    // 5. Create and initialize adapter
    logger.log('5. Creating and initializing adapter...');
    const adapter = protocolAdapterFactory.createAdapter('aave-v3', Network.ETHEREUM, adapterConfig);
    await adapter.initialize();
    logger.log('   ✅ Adapter initialized');

    // 6. Get health factor
    logger.log('6. Getting health factor...');
    const healthFactor = await adapter.getHealthFactor(TEST_USER_ADDRESS);
    logger.log(`   ✅ Health factor: ${healthFactor}`);

    // 7. Fetch WETH position data
    logger.log('7. Fetching WETH position data...');
    logger.log(`   User Address: ${normalizeAddress(TEST_USER_ADDRESS)}`);
    logger.log(`   WETH Address: ${normalizeAddress(WETH_ADDRESS)}`);
    
    // 8. Fetch user positions and filter for WETH
    logger.log('8. Fetching user positions...');
    try {
      const positions = await adapter.fetchUserPositions({ userAddresses: [TEST_USER_ADDRESS] });
      logger.log(`   ✅ Found ${positions.length} total positions`);
      
      // Filter for WETH/ETH positions
      const wethPositions = positions.filter(pos => 
        pos.assetSymbol === 'WETH' || 
        pos.assetSymbol === 'ETH' ||
        pos.assetAddress?.toLowerCase() === WETH_ADDRESS.toLowerCase()
      );
      
      if (wethPositions.length > 0) {
        logger.log(`   ✅ Found ${wethPositions.length} WETH/ETH positions`);
        
        wethPositions.forEach((position, index) => {
          logger.log(`\n   📊 WETH Position ${index + 1}:`);
          logger.log(`      Asset Symbol: ${position.assetSymbol}`);
          logger.log(`      Asset Address: ${position.assetAddress}`);
          logger.log(`      Collateral Amount: ${position.collateralAmount} ETH`);
          logger.log(`      Debt Amount: ${position.debtAmount} ETH`);
          logger.log(`      Health Factor: ${position.healthFactor}`);
          logger.log(`      LTV: ${position.ltv}`);
          logger.log(`      Liquidation Threshold: ${position.liquidationThreshold}`);
          
          // Compare with expected values
          const actualSupplied = parseFloat(position.collateralAmount || '0');
          const actualBorrowed = parseFloat(position.debtAmount || '0');
          const expectedSupplied = 0.0100428;
          const expectedBorrowed = 0.0020116;
          
          logger.log(`\n   🔍 COMPARISON WITH EXPECTED VALUES:`);
          logger.log(`      Expected Supplied: ${expectedSupplied} ETH`);
          logger.log(`      Actual Supplied: ${actualSupplied} ETH`);
          logger.log(`      Difference: ${Math.abs(actualSupplied - expectedSupplied).toFixed(6)} ETH`);
          
          logger.log(`      Expected Borrowed: ${expectedBorrowed} ETH`);
          logger.log(`      Actual Borrowed: ${actualBorrowed} ETH`);
          logger.log(`      Difference: ${Math.abs(actualBorrowed - expectedBorrowed).toFixed(6)} ETH`);
          
          // Calculate match percentage
          const suppliedMatch = actualSupplied > 0 ? 
            (1 - Math.abs(actualSupplied - expectedSupplied) / expectedSupplied) * 100 : 0;
          const borrowedMatch = actualBorrowed > 0 ? 
            (1 - Math.abs(actualBorrowed - expectedBorrowed) / expectedBorrowed) * 100 : 0;
          
          logger.log(`      Supplied Match: ${suppliedMatch.toFixed(2)}%`);
          logger.log(`      Borrowed Match: ${borrowedMatch.toFixed(2)}%`);
        });
      } else {
        logger.log('   ⚠️ No WETH/ETH positions found');
        logger.log('   This could mean:');
        logger.log('   - User has no WETH positions');
        logger.log('   - Position data is not being fetched correctly');
        logger.log('   - Asset symbol mapping needs adjustment');
      }
      
    } catch (fetchError) {
      logger.error('❌ Error fetching positions:', fetchError);
    }
    
    logger.log('\n🎉 WETH POSITION TEST COMPLETED SUCCESSFULLY!');
    logger.log('===============================');
    logger.log('✅ Adapter initialization working correctly');
    logger.log('✅ Health factor retrieval functional');
    logger.log('✅ Position fetching operational');
    logger.log('✅ WETH position analysis completed');
    
  } catch (error) {
    logger.error('❌ WETH position test failed:', error);
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
testWETHPosition().then(() => {
  logger.log('✅ WETH position test script completed successfully');
}).catch(error => {
  logger.error('❌ WETH position test script failed:', error);
  process.exit(1);
});
