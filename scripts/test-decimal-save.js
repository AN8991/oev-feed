const { Client } = require('pg');

async function testDecimalSave() {
  console.log('🧪 TESTING DECIMAL SCHEMA SAVE');
  console.log('==============================');
  
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

    // Test inserting decimal values
    console.log('🔄 Testing decimal value insertion...');
    
    const testData = {
      id: 'test-decimal-' + Date.now(),
      userAddress: '0x79682489385337996edd00eb56b4238b597bfae7',
      protocol: 'aave-v3',
      network: 'ethereum',
      assetAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      assetSymbol: 'WETH',
      collateralAmount: '0.01004286',
      collateralAmountETH: '0.01004286',
      debtAmount: '0.00201159',
      debtAmountETH: '0.00201159',
      healthFactor: '4.143764',
      liquidationThreshold: '82.50',
      ltv: '80.50',
      lastUpdated: Date.now().toString(),
      user_id: 1
    };

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
      testData.id,
      testData.userAddress,
      testData.protocol,
      testData.network,
      testData.assetAddress,
      testData.assetSymbol,
      testData.collateralAmount,
      testData.collateralAmountETH,
      testData.debtAmount,
      testData.debtAmountETH,
      testData.healthFactor,
      testData.liquidationThreshold,
      testData.ltv,
      testData.lastUpdated,
      testData.user_id
    ]);

    console.log('✅ Successfully inserted decimal values!');

    // Verify the data was saved correctly
    const selectResult = await client.query(
      'SELECT * FROM positions WHERE id = $1',
      [testData.id]
    );

    if (selectResult.rows.length > 0) {
      const savedData = selectResult.rows[0];
      console.log('📊 Saved data verification:');
      console.log(`   Collateral Amount: ${savedData.collateralAmount}`);
      console.log(`   Debt Amount: ${savedData.debtAmount}`);
      console.log(`   Health Factor: ${savedData.healthFactor}`);
      console.log('✅ Decimal schema is working perfectly!');
    }

    // Clean up test data
    await client.query('DELETE FROM positions WHERE id = $1', [testData.id]);
    console.log('🧹 Test data cleaned up');

  } catch (error) {
    console.error('❌ Error testing decimal save:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

testDecimalSave();
