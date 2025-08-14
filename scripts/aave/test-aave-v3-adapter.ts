// Global process-level error handlers at the very top
process.on('uncaughtException', (err) => {
  const e = err as any;
  console.error('GLOBAL Uncaught Exception:', e && e.stack ? e.stack : e);
});
process.on('unhandledRejection', (reason, promise) => {
  const e = reason as any;
  console.error('GLOBAL Unhandled Rejection at:', promise, 'reason:', e && e.stack ? e.stack : e);
});

/**
 * Aave V3 Adapter Test Script
 * 
 * This script tests the Aave V3 protocol adapter implementation for Ethereum network.
 * It verifies adapter initialization, position fetching, and data formatting.
 */
import { config } from 'dotenv';
config();
import { ProtocolAdapterFactory } from '@adapters/secondary/protocols/protocol-adapter-factory';
import { logger } from '@infrastructure/utils/logger';
import { PositionModel } from '@domain/models/position.model';
import { TypeORMAdapter } from '@adapters/secondary/database/typeorm/typeorm-adapter';
import { DatabasePort } from '@domain/ports/secondary/database.port';
import { AppDataSource } from '@infrastructure/config/typeorm.config';
import { UserEntity } from '@adapters/secondary/database/typeorm/entities/user.entity';

// Load environment variables

// Aave V3 Ethereum contract addresses
const AAVE_V3_ETHEREUM_POOL = process.env.AAVE_V3_ETHEREUM_POOL || '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';
const AAVE_V3_ETHEREUM_DATA_PROVIDER = process.env.AAVE_V3_ETHEREUM_DATA_PROVIDER || '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3';
const AAVE_V3_ETHEREUM_ORACLE = process.env.AAVE_V3_ETHEREUM_ORACLE || '0x54586bE62E3c3580375aE3723C145253060Ca0C2';
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key';

// Test user address - this should be an address with Aave V3 positions
const TEST_USER_ADDRESS = process.env.TEST_USER_ADDRESS || '0x79682489385337996edd00eb56b4238b597bfae7';

type PersistablePosition = PositionModel & { user?: UserEntity | undefined };

/**
 * Create adapter configuration object
 */
function createAdapterConfig() {
  // Use Alchemy instead of Infura for better reliability
  const alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  
  return {
    poolAddress: process.env.AAVE_V3_ETHEREUM_POOL!,
    dataProviderAddress: process.env.AAVE_V3_ETHEREUM_DATA_PROVIDER!,
    oracleAddress: process.env.AAVE_V3_ETHEREUM_ORACLE!,
    providerUrl: alchemyUrl
  };
}

/**
 * Main test function for Aave V3 adapter - With database saving
 */
async function testAaveV3Adapter() {
  let positions: PositionModel[] = [];
  let user: UserEntity | null = null;

  console.log('🚀 STARTING AAVE V3 ADAPTER TEST WITH DATABASE SAVE');
  console.log('Expected from UI:');
  console.log('- Supplied ETH: 0.0100428 ETH (~$37.08)');
  console.log('- Borrowed ETH: 0.0020116 ETH (~$7.43)');
  console.log('\n' + '='.repeat(50));

  try {
    console.log('1. Initializing database connection...');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('   ✅ Database connection initialized');
    }

    console.log('2. Finding or creating test user...');
    const userRepo = AppDataSource.getRepository(UserEntity);
    user = await userRepo.findOne({ where: { address: TEST_USER_ADDRESS } });
    
    if (!user) {
      user = userRepo.create({ address: TEST_USER_ADDRESS });
      await userRepo.save(user);
      console.log('   ✅ Test user created:', { address: user.address });
    } else {
      console.log('   ✅ Using existing test user:', { address: user.address, id: user.id });
    }

    console.log('3. Creating adapter configuration...');
    const config = createAdapterConfig();
    console.log('   Config:', config);

    console.log('4. Creating and initializing adapter...');
    const adapter = ProtocolAdapterFactory.createAdapter('aave-v3', 'ethereum', config);
    await adapter.initialize();
    console.log('   ✅ Adapter initialized');

    console.log('5. Getting health factor...');
    const healthFactor = await adapter.getHealthFactor(TEST_USER_ADDRESS);
    console.log('   ✅ Health factor:', healthFactor);

    console.log('6. Fetching user positions...');
    console.log('   User address:', TEST_USER_ADDRESS);
    
    positions = await adapter.fetchUserPositions(TEST_USER_ADDRESS);
    
    console.log('\n' + '='.repeat(50));
    console.log('POSITION RESULTS:');
    
    if (!positions || positions.length === 0) {
      console.log('❌ NO POSITIONS RETURNED');
      console.log('This could mean:');
      console.log('- User has no positions');
      console.log('- Adapter is not fetching data correctly');
      console.log('- Network/RPC issues');
    } else {
      console.log(`✅ Found ${positions.length} position(s)`);
      
      positions.forEach((position, index) => {
        console.log(`\n--- Position ${index + 1} ---`);
        console.log('Asset Symbol:', position.assetSymbol);
        console.log('Collateral Amount:', position.collateralAmount);
        console.log('Debt Amount:', position.debtAmount);
        console.log('Health Factor:', position.healthFactor);
        
        // ETH comparison
        if (position.assetSymbol === 'ETH') {
          console.log('\n🔍 ETH COMPARISON:');
          const actualSupplied = parseFloat(position.collateralAmount);
          const actualBorrowed = parseFloat(position.debtAmount);
          const expectedSupplied = 0.0100428;
          const expectedBorrowed = 0.0020116;
          
          console.log(`Expected Supplied: ${expectedSupplied} | Actual: ${actualSupplied}`);
          console.log(`Expected Borrowed: ${expectedBorrowed} | Actual: ${actualBorrowed}`);
          
          const suppliedDiff = Math.abs(actualSupplied - expectedSupplied);
          const borrowedDiff = Math.abs(actualBorrowed - expectedBorrowed);
          
          console.log(`Supplied Match: ${suppliedDiff < 0.0001 ? '✅' : '❌'} (diff: ${suppliedDiff.toFixed(6)})`);
          console.log(`Borrowed Match: ${borrowedDiff < 0.0001 ? '✅' : '❌'} (diff: ${borrowedDiff.toFixed(6)})`);
        }
      });

      // Save positions to database
      console.log('\n7. Saving positions to database...');
      if (user) {
        const persistablePositions: PersistablePosition[] = positions.map(pos => ({ ...pos, user: user || undefined }));
        
        const db: DatabasePort = new TypeORMAdapter();
        try {
          await db.savePositions(persistablePositions);
          console.log(`   ✅ Saved ${positions.length} positions to database`);
          
          // Verify the save by querying the database
          console.log('\n8. Verifying database save...');
          const positionRepo = AppDataSource.getRepository('PositionEntity');
          const savedPositions = await positionRepo.find({
            where: { user: { address: TEST_USER_ADDRESS } },
            relations: ['user'],
            order: { lastUpdated: 'DESC' },
            take: 10
          });
          
          console.log(`   ✅ Found ${savedPositions.length} positions in database for user`);
          
          if (savedPositions.length > 0) {
            console.log('\n📊 DATABASE VERIFICATION:');
            savedPositions.forEach((dbPos: any, index: number) => {
              console.log(`   Position ${index + 1}:`);
              console.log(`     Asset: ${dbPos.assetSymbol}`);
              console.log(`     Collateral: ${dbPos.collateralAmount}`);
              console.log(`     Debt: ${dbPos.debtAmount}`);
              console.log(`     Last Updated: ${dbPos.lastUpdated}`);
              console.log(`     User ID: ${dbPos.user?.id}`);
            });
          }
          
        } catch (saveError) {
          console.error('   ❌ Error saving positions to database:', saveError);
        }
      }
    }

    console.log('\n9. Cleaning up adapter...');
    await adapter.cleanup();
    console.log('   ✅ Adapter cleanup complete');
    
    console.log('\n🎉 TEST COMPLETED SUCCESSFULLY');

  } catch (error) {
    console.error('\n❌ ERROR in test:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    // Clean up database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Global error handlers
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Run the test
testAaveV3Adapter().catch(error => {
  logger.error('Unhandled error in test script:', error);
  process.exit(1);
});
