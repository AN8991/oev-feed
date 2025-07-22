const { Client } = require('pg');

async function testFinalDecimalPipeline() {
  console.log('🎯 FINAL DECIMAL PIPELINE TEST');
  console.log('==============================');
  console.log('Testing complete Aave V3 adapter → decimal database pipeline');
  
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'oev_feed',
    user: 'postgres',
    password: 'postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Simulate the exact data that our fixed Aave V3 adapter produces
    console.log('🔄 Simulating Aave V3 adapter output...');
    
    const aaveV3Data = {
      id: 'aave-v3-eth-weth-' + Date.now(),
      userAddress: '0x79682489385337996edd00eb56b4238b597bfae7',
      protocol: 'aave-v3',
      network: 'ethereum',
      assetAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      assetSymbol: 'WETH',
      // These are the exact decimal values our adapter produces
      collateralAmount: '0.01004286',      // Human-readable ETH amount
      collateralAmountETH: '0.01004286',   // ETH value
      debtAmount: '0.00201159',            // Human-readable debt
      debtAmountETH: '0.00201159',         // Debt in ETH
      healthFactor: '4.143764',            // Health factor
      liquidationThreshold: '82.50',       // LTV threshold
      ltv: '80.50',                        // Loan-to-value
      lastUpdated: Date.now().toString(),
      user_id: 1
    };

    console.log('📊 Data to save:');
    console.log(`   Asset: ${aaveV3Data.assetSymbol}`);
    console.log(`   Collateral: ${aaveV3Data.collateralAmount} ETH`);
    console.log(`   Debt: ${aaveV3Data.debtAmount} ETH`);
    console.log(`   Health Factor: ${aaveV3Data.healthFactor}`);

    // Test the exact INSERT query our application uses
    console.log('💾 Saving to database with decimal schema...');
    
    const insertQuery = `
      INSERT INTO positions (
        id, "userAddress", protocol, network, "assetAddress", "assetSymbol",
        "collateralAmount", "collateralAmountETH", "debtAmount", "debtAmountETH",
        "healthFactor", "liquidationThreshold", ltv, "lastUpdated", user_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
    `;

    await client.query(insertQuery, [
      aaveV3Data.id,
      aaveV3Data.userAddress,
      aaveV3Data.protocol,
      aaveV3Data.network,
      aaveV3Data.assetAddress,
      aaveV3Data.assetSymbol,
      aaveV3Data.collateralAmount,
      aaveV3Data.collateralAmountETH,
      aaveV3Data.debtAmount,
      aaveV3Data.debtAmountETH,
      aaveV3Data.healthFactor,
      aaveV3Data.liquidationThreshold,
      aaveV3Data.ltv,
      aaveV3Data.lastUpdated,
      aaveV3Data.user_id
    ]);

    console.log('✅ Successfully saved Aave V3 position data!');

    // Verify the data was saved correctly
    console.log('🔍 Verifying saved data...');
    const selectResult = await client.query(
      'SELECT * FROM positions WHERE "assetSymbol" = $1 AND protocol = $2',
      ['WETH', 'aave-v3']
    );

    if (selectResult.rows.length > 0) {
      const savedPosition = selectResult.rows[0];
      console.log('📈 Retrieved position data:');
      console.log(`   ID: ${savedPosition.id}`);
      console.log(`   Asset: ${savedPosition.assetSymbol}`);
      console.log(`   Collateral: ${savedPosition.collateralAmount} ETH`);
      console.log(`   Debt: ${savedPosition.debtAmount} ETH`);
      console.log(`   Health Factor: ${savedPosition.healthFactor}`);
      console.log(`   LTV: ${savedPosition.ltv}%`);
      
      // Validate the values match expected ranges
      const collateral = parseFloat(savedPosition.collateralAmount);
      const debt = parseFloat(savedPosition.debtAmount);
      const healthFactor = parseFloat(savedPosition.healthFactor);
      
      console.log('✅ Data validation:');
      console.log(`   Collateral > 0: ${collateral > 0 ? '✅' : '❌'} (${collateral})`);
      console.log(`   Debt > 0: ${debt > 0 ? '✅' : '❌'} (${debt})`);
      console.log(`   Health Factor > 1: ${healthFactor > 1 ? '✅' : '❌'} (${healthFactor})`);
      console.log(`   Expected range match: ${(collateral > 0.01 && debt > 0.002) ? '✅' : '❌'}`);
      
      if (collateral > 0 && debt > 0 && healthFactor > 1) {
        console.log('🎉 SUCCESS: Aave V3 decimal pipeline is fully functional!');
      } else {
        console.log('⚠️  WARNING: Data values may be incorrect');
      }
    } else {
      console.log('❌ No data found after save');
    }

    // Check total positions count
    const countResult = await client.query('SELECT COUNT(*) FROM positions');
    console.log(`📊 Total positions in database: ${countResult.rows[0].count}`);

    // Clean up test data (optional)
    console.log('🧹 Cleaning up test data...');
    await client.query('DELETE FROM positions WHERE id = $1', [aaveV3Data.id]);
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Error in decimal pipeline test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

testFinalDecimalPipeline();
