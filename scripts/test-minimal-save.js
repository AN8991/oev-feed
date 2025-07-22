// Minimal test using compiled JavaScript to avoid TypeScript/TypeORM issues
const { Client } = require('pg');

const TEST_USER_ADDRESS = '0x79682489385337996edd00eb56b4238b597bfae7';

async function testMinimalSave() {
  console.log('🔧 MINIMAL ADAPTER + DATABASE TEST');
  console.log('Bypassing TypeORM to test the fixed adapter directly...');
  console.log('=' .repeat(50));

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

    console.log('2. Testing adapter with require (compiled JS)...');
    
    // Try to load the compiled adapter
    let adapter;
    try {
      const { ProtocolAdapterFactory } = require('../dist/adapters/secondary/protocols/protocol-adapter-factory');
      
      const config = {
        poolAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
        dataProviderAddress: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
        oracleAddress: '0x54586bE62E3c3580375aE3723C145253060Ca0C2',
        providerUrl: 'https://eth-mainnet.g.alchemy.com/v2/9Mt2QYBql-7H-Dtrpnk830G34t2ga5EM'
      };

      adapter = ProtocolAdapterFactory.createAdapter('aave-v3', 'ethereum', config);
      console.log('   ✅ Adapter created from compiled JS');

      await adapter.initialize();
      console.log('   ✅ Adapter initialized');

      console.log('3. Fetching positions...');
      const positions = await adapter.fetchUserPositions(TEST_USER_ADDRESS);
      console.log(`   ✅ Fetched ${positions.length} positions`);

      if (positions.length > 0) {
        console.log('\n📊 FETCHED POSITION DATA:');
        positions.forEach((pos, index) => {
          console.log(`Position ${index + 1}:`);
          console.log(`  Asset: ${pos.assetSymbol}`);
          console.log(`  Address: ${pos.assetAddress}`);
          console.log(`  Collateral: ${pos.collateralAmount}`);
          console.log(`  Debt: ${pos.debtAmount}`);
          console.log(`  Health Factor: ${pos.healthFactor}`);
        });

        console.log('\n4. Ensuring user exists in database...');
        let userId;
        const userResult = await client.query('SELECT id FROM users WHERE address = $1', [TEST_USER_ADDRESS]);
        
        if (userResult.rows.length > 0) {
          userId = userResult.rows[0].id;
          console.log(`   ✅ Using existing user ID: ${userId}`);
        } else {
          const newUserResult = await client.query('INSERT INTO users (address) VALUES ($1) RETURNING id', [TEST_USER_ADDRESS]);
          userId = newUserResult.rows[0].id;
          console.log(`   ✅ Created new user ID: ${userId}`);
        }

        console.log('5. Clearing old position data...');
        await client.query('DELETE FROM positions WHERE user_id = $1', [userId]);
        console.log('   ✅ Old data cleared');

        console.log('6. Saving new positions to database...');
        let savedCount = 0;

        for (const position of positions) {
          try {
            await client.query(`
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

            console.log(`   ✅ Saved ${position.assetSymbol}: Collateral=${position.collateralAmount}, Debt=${position.debtAmount}`);
            savedCount++;
          } catch (saveError) {
            console.error(`   ❌ Error saving ${position.assetSymbol}:`, saveError.message);
          }
        }

        console.log(`\n   🎯 Successfully saved ${savedCount}/${positions.length} positions`);

        console.log('7. Verifying saved data...');
        const verifyResult = await client.query(`
          SELECT "assetSymbol", "collateralAmount", "debtAmount", "healthFactor"
          FROM positions 
          WHERE user_id = $1 
          ORDER BY "lastUpdated" DESC
        `, [userId]);

        console.log(`   ✅ Found ${verifyResult.rows.length} positions in database`);

        if (verifyResult.rows.length > 0) {
          console.log('\n🎉 DATABASE VERIFICATION:');
          let hasNonZeroData = false;

          verifyResult.rows.forEach((row, index) => {
            console.log(`   Position ${index + 1}:`);
            console.log(`     Asset: ${row.assetSymbol}`);
            console.log(`     Collateral: ${row.collateralAmount}`);
            console.log(`     Debt: ${row.debtAmount}`);

            if (row.collateralAmount !== '0' || row.debtAmount !== '0') {
              hasNonZeroData = true;
              console.log(`     ✅ NON-ZERO VALUES DETECTED!`);
            }
          });

          if (hasNonZeroData) {
            console.log('\n🎉 SUCCESS: Non-zero Aave V3 data is now saved in the database!');
            console.log('🔧 The fix is working correctly!');
          } else {
            console.log('\n❌ ISSUE: All values are still zero in the database');
            console.log('🔍 Need to investigate further...');
          }
        }

      } else {
        console.log('   ⚠️  No positions returned from adapter');
      }

      await adapter.cleanup();

    } catch (adapterError) {
      console.error('❌ Adapter error:', adapterError.message);
      console.log('   This might be due to compilation issues. Let me check...');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

testMinimalSave().catch(console.error);
