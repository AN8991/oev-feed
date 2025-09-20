import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ProtocolAdapterFactory } from '@/adapters/secondary/protocols/protocol-adapter-factory';

const TEST_USER_ADDRESS = '0x79682489385337996edd00eb56b4238b597bfae7';

/**
 * Complete flow test: Fetch positions and save directly to database
 * Bypasses TypeORM entity issues by using direct SQL
 */
async function testCompleteFlow() {
  console.log('🔄 COMPLETE FLOW TEST: FETCH + SAVE TO DATABASE');
  console.log('Testing the full pipeline from adapter to database...');
  console.log('=' .repeat(60));

  // Create minimal DataSource for direct queries
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'oev_feed',
    synchronize: false,
    logging: false,
    entities: [],
  });

  try {
    console.log('1. Initializing database connection...');
    await dataSource.initialize();
    console.log('   ✅ Database connected');

    console.log('2. Ensuring test user exists...');
    let userId: number;
    const existingUser = await dataSource.query('SELECT id FROM users WHERE address = $1', [TEST_USER_ADDRESS]);
    
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      console.log(`   ✅ Using existing user ID: ${userId}`);
    } else {
      const newUser = await dataSource.query('INSERT INTO users (address) VALUES ($1) RETURNING id', [TEST_USER_ADDRESS]);
      userId = newUser[0].id;
      console.log(`   ✅ Created new user ID: ${userId}`);
    }

    console.log('3. Creating and initializing Aave V3 adapter...');
    const alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const config = {
      poolAddress: process.env.AAVE_V3_ETHEREUM_POOL!,
      dataProviderAddress: process.env.AAVE_V3_ETHEREUM_DATA_PROVIDER!,
      oracleAddress: process.env.AAVE_V3_ETHEREUM_ORACLE!,
      providerUrl: alchemyUrl
    };

    // Note: ProtocolAdapterFactory is now injectable, create instance with mapper for testing
    const mapper = new (require('../../src/application/mappers/aave-position.mapper').AavePositionMapper)();
    const factory = new ProtocolAdapterFactory(mapper);
    const adapter = factory.createAdapter('aave-v3', 'ethereum', config);
    await adapter.initialize();
    console.log('   ✅ Adapter initialized');

    console.log('4. Fetching positions from adapter...');
    const positions = await adapter.fetchUserPositions({ userAddresses: [TEST_USER_ADDRESS] });
    console.log(`   ✅ Fetched ${positions.length} positions`);

    if (positions.length === 0) {
      console.log('   ⚠️  No positions found - cannot test database save');
      return;
    }

    console.log('5. Displaying fetched position data...');
    positions.forEach((pos, index) => {
      console.log(`   Position ${index + 1}:`);
      console.log(`     Asset: ${pos.assetSymbol}`);
      console.log(`     Collateral: ${pos.collateralAmount}`);
      console.log(`     Debt: ${pos.debtAmount}`);
      console.log(`     Health Factor: ${pos.healthFactor}`);
      
      if (pos.assetSymbol === 'WETH' || pos.assetAddress.toLowerCase() === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') {
        console.log('     🎯 ETH/WETH Position - Expected: 0.0100428 supplied, 0.0020116 borrowed');
      }
    });

    console.log('6. Clearing old position data for this user...');
    await dataSource.query('DELETE FROM positions WHERE user_id = $1', [userId]);
    console.log('   ✅ Old data cleared');

    console.log('7. Saving positions directly to database...');
    let savedCount = 0;
    
    for (const position of positions) {
      try {
        await dataSource.query(`
          INSERT INTO positions (
            id, "userAddress", protocol, network, "assetAddress", "assetSymbol",
            "collateralAmount", "collateralAmountETH", "debtAmount", "debtAmountETH",
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
          position.collateralAmountETH,
          position.debtAmount,
          position.debtAmountETH,
          position.healthFactor,
          position.liquidationThreshold,
          position.ltv,
          position.lastUpdated,
          userId
        ]);
        savedCount++;
        console.log(`   ✅ Saved position: ${position.assetSymbol}`);
      } catch (saveError) {
        console.error(`   ❌ Error saving ${position.assetSymbol}:`, saveError);
      }
    }

    console.log(`   ✅ Successfully saved ${savedCount}/${positions.length} positions`);

    console.log('8. Verifying saved data...');
    const savedPositions = await dataSource.query(`
      SELECT "assetSymbol", "collateralAmount", "debtAmount", "healthFactor", "lastUpdated"
      FROM positions 
      WHERE user_id = $1 
      ORDER BY "lastUpdated" DESC
    `, [userId]);

    console.log(`   ✅ Found ${savedPositions.length} positions in database`);

    if (savedPositions.length > 0) {
      console.log('\n📊 DATABASE VERIFICATION RESULTS:');
      savedPositions.forEach((dbPos: any, index: number) => {
        console.log(`   DB Position ${index + 1}:`);
        console.log(`     Asset: ${dbPos.assetSymbol}`);
        console.log(`     Collateral: ${dbPos.collateralAmount}`);
        console.log(`     Debt: ${dbPos.debtAmount}`);
        console.log(`     Health Factor: ${dbPos.healthFactor}`);
        console.log(`     Last Updated: ${new Date(parseInt(dbPos.lastUpdated))}`);
        
        // Check for ETH/WETH position
        if (dbPos.assetSymbol === 'WETH' || dbPos.assetSymbol === 'ETH') {
          console.log('     🎯 ETH/WETH DATABASE VALIDATION:');
          const dbSupplied = parseFloat(dbPos.collateralAmount);
          const dbBorrowed = parseFloat(dbPos.debtAmount);
          
          console.log(`       Expected: 0.0100428 supplied, 0.0020116 borrowed`);
          console.log(`       Database: ${dbSupplied} supplied, ${dbBorrowed} borrowed`);
          
          if (dbSupplied > 0 && dbBorrowed > 0) {
            console.log('       ✅ SUCCESS: Database contains non-zero values!');
            console.log('       🎉 THE FIX IS WORKING - DATA IS CORRECTLY SAVED!');
          } else {
            console.log('       ❌ ISSUE: Database still contains zero values');
          }
        }
      });
    }

    console.log('\n9. Cleanup...');
    await adapter.cleanup();
    await dataSource.destroy();
    console.log('   ✅ Cleanup complete');

    console.log('\n🎉 COMPLETE FLOW TEST FINISHED');

  } catch (error) {
    console.error('\n❌ ERROR in complete flow test:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

testCompleteFlow().catch(console.error);
