import 'dotenv/config';
import 'reflect-metadata';
import { Client } from 'pg';
import { ProtocolAdapterFactory } from '@/adapters/secondary/protocols/protocol-adapter-factory';

const TEST_USER_ADDRESS = '0x79682489385337996edd00eb56b4238b597bfae7';

/**
 * Working test that combines the successful targeted WETH approach with database saving
 */
async function testWorkingSave() {
  console.log('🎯 WORKING ADAPTER + DATABASE SAVE TEST');
  console.log('Using the proven working approach with database saving...');
  console.log('=' .repeat(60));

  // Use direct PostgreSQL client instead of TypeORM
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'oev_feed',
    user: 'postgres',
    password: 'postgres'
  });

  try {
    console.log('1. Connecting to database...');
    await client.connect();
    console.log('   ✅ Database connected');

    console.log('2. Creating adapter (same as working WETH test)...');
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

    console.log('3. Getting health factor...');
    const healthFactor = await adapter.getHealthFactor(TEST_USER_ADDRESS);
    console.log(`   ✅ Health factor: ${healthFactor}`);

    console.log('4. Fetching positions (with our fixed adapter)...');
    const positions = await adapter.fetchUserPositions(TEST_USER_ADDRESS);
    console.log(`   ✅ Fetched ${positions.length} positions`);

    if (positions.length === 0) {
      console.log('   ⚠️  No positions found - cannot test database save');
      return;
    }

    console.log('\n📊 FETCHED POSITION DATA (from fixed adapter):');
    positions.forEach((pos, index) => {
      console.log(`Position ${index + 1}:`);
      console.log(`  Asset: ${pos.assetSymbol}`);
      console.log(`  Address: ${pos.assetAddress}`);
      console.log(`  Collateral: ${pos.collateralAmount}`);
      console.log(`  Debt: ${pos.debtAmount}`);
      console.log(`  Health Factor: ${pos.healthFactor}`);
      
      // Check if this is WETH/ETH
      if (pos.assetSymbol === 'WETH' || pos.assetAddress.toLowerCase() === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') {
        console.log('  🎯 ETH/WETH Position:');
        console.log(`     Expected: ~0.0100428 supplied, ~0.0020116 borrowed`);
        console.log(`     Actual: ${pos.collateralAmount} supplied, ${pos.debtAmount} borrowed`);
        
        const hasSupplied = parseFloat(pos.collateralAmount) > 0;
        const hasBorrowed = parseFloat(pos.debtAmount) > 0;
        
        if (hasSupplied && hasBorrowed) {
          console.log('     ✅ NON-ZERO VALUES CONFIRMED - Fix is working!');
        } else {
          console.log('     ❌ Still getting zero values');
        }
      }
    });

    console.log('\n5. Ensuring user exists in database...');
    let userId: number;
    const userResult = await client.query('SELECT id FROM users WHERE address = $1', [TEST_USER_ADDRESS]);
    
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
      console.log(`   ✅ Using existing user ID: ${userId}`);
    } else {
      const newUserResult = await client.query('INSERT INTO users (address) VALUES ($1) RETURNING id', [TEST_USER_ADDRESS]);
      userId = newUserResult.rows[0].id;
      console.log(`   ✅ Created new user ID: ${userId}`);
    }

    console.log('6. Clearing old position data...');
    const deleteResult = await client.query('DELETE FROM positions WHERE user_id = $1', [userId]);
    console.log(`   ✅ Deleted ${deleteResult.rowCount} old positions`);

    console.log('7. Saving new positions to database...');
    let savedCount = 0;
    let ethPositionSaved = false;

    for (const position of positions) {
      try {
        const insertResult = await client.query(`
          INSERT INTO positions (
            id, "userAddress", protocol, network, "assetAddress", "assetSymbol",
            "collateralAmount", "collateralAmountETH", "debtAmount", "debtAmountETH",
            "healthFactor", "liquidationThreshold", ltv, "lastUpdated", user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id
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

        console.log(`   ✅ Saved ${position.assetSymbol}: Collateral=${position.collateralAmount}, Debt=${position.debtAmount}`);
        savedCount++;

        // Track if we saved ETH position
        if (position.assetSymbol === 'WETH' || position.assetAddress.toLowerCase() === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') {
          ethPositionSaved = true;
        }

      } catch (saveError) {
        console.error(`   ❌ Error saving ${position.assetSymbol}:`, saveError);
      }
    }

    console.log(`\n   🎯 Successfully saved ${savedCount}/${positions.length} positions`);

    console.log('8. Verifying saved data in database...');
    const verifyResult = await client.query(`
      SELECT "assetSymbol", "assetAddress", "collateralAmount", "debtAmount", "healthFactor", "lastUpdated"
      FROM positions 
      WHERE user_id = $1 
      ORDER BY "lastUpdated" DESC
    `, [userId]);

    console.log(`   ✅ Found ${verifyResult.rows.length} positions in database`);

    if (verifyResult.rows.length > 0) {
      console.log('\n🎉 DATABASE VERIFICATION RESULTS:');
      let hasNonZeroData = false;
      let ethPositionVerified = false;

      verifyResult.rows.forEach((row: any, index: number) => {
        console.log(`   DB Position ${index + 1}:`);
        console.log(`     Asset: ${row.assetSymbol}`);
        console.log(`     Address: ${row.assetAddress}`);
        console.log(`     Collateral: ${row.collateralAmount}`);
        console.log(`     Debt: ${row.debtAmount}`);
        console.log(`     Health Factor: ${row.healthFactor}`);
        console.log(`     Last Updated: ${new Date(parseInt(row.lastUpdated))}`);

        // Check for non-zero values
        if (row.collateralAmount !== '0' || row.debtAmount !== '0') {
          hasNonZeroData = true;
          console.log(`     ✅ NON-ZERO VALUES DETECTED!`);
        }

        // Check ETH position specifically
        if (row.assetSymbol === 'WETH' || row.assetAddress?.toLowerCase() === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') {
          ethPositionVerified = true;
          console.log('     🎯 ETH/WETH DATABASE VERIFICATION:');
          const dbSupplied = parseFloat(row.collateralAmount);
          const dbBorrowed = parseFloat(row.debtAmount);
          
          console.log(`       Expected: ~0.0100428 supplied, ~0.0020116 borrowed`);
          console.log(`       Database: ${dbSupplied} supplied, ${dbBorrowed} borrowed`);
          
          if (dbSupplied > 0 && dbBorrowed > 0) {
            console.log('       🎉 SUCCESS: ETH position with non-zero values saved to database!');
          }
        }
      });

      console.log('\n🏁 FINAL RESULTS:');
      if (hasNonZeroData) {
        console.log('✅ SUCCESS: Non-zero Aave V3 data is now saved in the database!');
        console.log('✅ The DTO construction fix is working correctly!');
        console.log('✅ Complete end-to-end pipeline is functional!');
      } else {
        console.log('❌ ISSUE: All values are still zero in the database');
        console.log('🔍 The problem may be in the data conversion or saving logic');
      }

      if (ethPositionVerified && ethPositionSaved) {
        console.log('🎯 ETH position successfully validated and saved!');
      }
    }

    console.log('\n9. Cleanup...');
    await adapter.cleanup();

  } catch (error) {
    console.error('\n❌ ERROR in working save test:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

testWorkingSave().catch(console.error);
