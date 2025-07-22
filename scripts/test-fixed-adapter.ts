import 'dotenv/config';
import 'reflect-metadata';
import { ProtocolAdapterFactory } from '@/adapters/secondary/protocols/protocol-adapter-factory';
import { AppDataSource } from '@/infrastructure/config/typeorm.config';
import { UserEntity } from '@/adapters/secondary/database/typeorm/entities/user.entity';
import { TypeORMAdapter } from '@/adapters/secondary/database/typeorm/typeorm-adapter';
import { DatabasePort } from '@/domain/ports/secondary/database.port';

const TEST_USER_ADDRESS = '0x79682489385337996edd00eb56b4238b597bfae7';

/**
 * Test the fixed Aave V3 adapter with database saving
 */
async function testFixedAdapter() {
  console.log('🔧 TESTING FIXED AAVE V3 ADAPTER WITH DATABASE SAVE');
  console.log('Expected from UI:');
  console.log('- Supplied ETH: 0.0100428 ETH (~$37.08)');
  console.log('- Borrowed ETH: 0.0020116 ETH (~$7.43)');
  console.log('\n' + '='.repeat(50));

  try {
    console.log('1. Initializing database...');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('   ✅ Database initialized');
    }

    console.log('2. Finding or creating user...');
    const userRepo = AppDataSource.getRepository(UserEntity);
    let user = await userRepo.findOne({ where: { address: TEST_USER_ADDRESS } });
    
    if (!user) {
      user = userRepo.create({ address: TEST_USER_ADDRESS });
      await userRepo.save(user);
      console.log('   ✅ User created');
    } else {
      console.log('   ✅ User found:', user.id);
    }

    console.log('3. Creating adapter...');
    const alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const config = {
      poolAddress: process.env.AAVE_V3_ETHEREUM_POOL!,
      dataProviderAddress: process.env.AAVE_V3_ETHEREUM_DATA_PROVIDER!,
      oracleAddress: process.env.AAVE_V3_ETHEREUM_ORACLE!,
      providerUrl: alchemyUrl
    };

    const adapter = ProtocolAdapterFactory.createAdapter('aave-v3', 'ethereum', config);
    await adapter.initialize();
    console.log('   ✅ Adapter initialized');

    console.log('4. Getting health factor...');
    const healthFactor = await adapter.getHealthFactor(TEST_USER_ADDRESS);
    console.log(`   ✅ Health factor: ${healthFactor}`);

    console.log('5. Fetching positions...');
    const positions = await adapter.fetchUserPositions(TEST_USER_ADDRESS);
    console.log(`   ✅ Found ${positions.length} positions`);

    if (positions.length > 0) {
      console.log('\n📊 POSITION DATA:');
      positions.forEach((pos, index) => {
        console.log(`Position ${index + 1}:`);
        console.log(`  Asset: ${pos.assetSymbol}`);
        console.log(`  Collateral: ${pos.collateralAmount}`);
        console.log(`  Debt: ${pos.debtAmount}`);
        console.log(`  Health Factor: ${pos.healthFactor}`);
        
        if (pos.assetSymbol === 'ETH') {
          console.log('  🔥 ETH POSITION VALIDATION:');
          const actualSupplied = parseFloat(pos.collateralAmount);
          const actualBorrowed = parseFloat(pos.debtAmount);
          const expectedSupplied = 0.0100428;
          const expectedBorrowed = 0.0020116;
          
          console.log(`    Expected: ${expectedSupplied} supplied, ${expectedBorrowed} borrowed`);
          console.log(`    Actual: ${actualSupplied} supplied, ${actualBorrowed} borrowed`);
          
          const suppliedMatch = Math.abs(actualSupplied - expectedSupplied) < 0.0001;
          const borrowedMatch = Math.abs(actualBorrowed - expectedBorrowed) < 0.0001;
          
          console.log(`    Match: ${suppliedMatch && borrowedMatch ? '✅' : '❌'}`);
        }
      });

      console.log('\n6. Saving to database...');
      const persistablePositions = positions.map(pos => ({ ...pos, user }));
      const db: DatabasePort = new TypeORMAdapter();
      await db.savePositions(persistablePositions);
      console.log(`   ✅ Saved ${positions.length} positions to database`);

      console.log('7. Verifying database save...');
      const positionRepo = AppDataSource.getRepository('PositionEntity');
      const savedPositions = await positionRepo.find({
        where: { user: { address: TEST_USER_ADDRESS } },
        relations: ['user'],
        order: { lastUpdated: 'DESC' },
        take: 5
      });
      
      console.log(`   ✅ Found ${savedPositions.length} positions in database`);
      
      if (savedPositions.length > 0) {
        console.log('\n💾 DATABASE VERIFICATION:');
        savedPositions.forEach((dbPos: any, index: number) => {
          console.log(`  DB Position ${index + 1}:`);
          console.log(`    Asset: ${dbPos.assetSymbol}`);
          console.log(`    Collateral: ${dbPos.collateralAmount}`);
          console.log(`    Debt: ${dbPos.debtAmount}`);
          console.log(`    Last Updated: ${new Date(parseInt(dbPos.lastUpdated))}`);
          
          if (dbPos.assetSymbol === 'ETH') {
            console.log('    🎯 ETH DATABASE VALIDATION:');
            const dbSupplied = parseFloat(dbPos.collateralAmount);
            const dbBorrowed = parseFloat(dbPos.debtAmount);
            
            if (dbSupplied > 0 && dbBorrowed > 0) {
              console.log('      ✅ Database contains non-zero ETH values!');
              console.log(`      📈 Supplied: ${dbSupplied}, Borrowed: ${dbBorrowed}`);
            } else {
              console.log('      ❌ Database still contains zero values');
            }
          }
        });
      }
    }

    console.log('\n8. Cleanup...');
    await adapter.cleanup();
    console.log('   ✅ Adapter cleanup complete');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔌 Database connection closed');
    }
  }
}

testFixedAdapter().catch(console.error);
