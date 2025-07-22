const { Client } = require('pg');

async function debugFieldValues() {
  console.log('🔍 DEBUG: Checking field values causing overflow');
  console.log('================================================');
  
  // Let's simulate the exact position data from the adapter
  const positionData = {
    id: 'debug-test-' + Date.now(),
    userAddress: '0x79682489385337996edd00eb56b4238b597bfae7',
    protocol: 'aave-v3',
    network: 'ethereum',
    assetAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    assetSymbol: 'WETH',
    collateralAmount: '0.01004291',
    collateralAmountETH: '0.01004291',
    debtAmount: '0.00201161',
    debtAmountETH: '0.00201161',
    healthFactor: '4.143758',
    // These are the suspect fields - let's see what the adapter actually produces
    liquidationThreshold: '8250',  // This might be 82.50% as 8250 (basis points)
    ltv: '8050',                   // This might be 80.50% as 8050 (basis points)
    lastUpdated: Date.now().toString(),
    user_id: 1
  };

  console.log('📊 Field values to be inserted:');
  Object.entries(positionData).forEach(([key, value]) => {
    console.log(`   ${key}: "${value}" (${typeof value})`);
  });

  console.log('\n🎯 Checking which fields might overflow DECIMAL(5,2):');
  console.log(`   liquidationThreshold: "${positionData.liquidationThreshold}" - Max for DECIMAL(5,2): 999.99`);
  console.log(`   ltv: "${positionData.ltv}" - Max for DECIMAL(5,2): 999.99`);
  
  // Check if values exceed DECIMAL(5,2) limit
  const liquidationValue = parseFloat(positionData.liquidationThreshold);
  const ltvValue = parseFloat(positionData.ltv);
  
  console.log(`   liquidationThreshold overflow: ${liquidationValue > 999.99 ? '❌ YES' : '✅ NO'} (${liquidationValue})`);
  console.log(`   ltv overflow: ${ltvValue > 999.99 ? '❌ YES' : '✅ NO'} (${ltvValue})`);

  // Test with corrected schema
  console.log('\n🛠️  Testing with larger precision...');
  
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

    // First, let's update the schema to handle larger values
    console.log('🔄 Updating schema for liquidationThreshold and ltv...');
    
    await client.query(`
      ALTER TABLE positions 
      ALTER COLUMN "liquidationThreshold" TYPE DECIMAL(10,2)
    `);
    
    await client.query(`
      ALTER TABLE positions 
      ALTER COLUMN ltv TYPE DECIMAL(10,2)
    `);
    
    console.log('✅ Schema updated to DECIMAL(10,2) for threshold fields');

    // Now try to insert the data
    console.log('💾 Testing insert with updated schema...');
    
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
      positionData.id,
      positionData.userAddress,
      positionData.protocol,
      positionData.network,
      positionData.assetAddress,
      positionData.assetSymbol,
      positionData.collateralAmount,
      positionData.collateralAmountETH,
      positionData.debtAmount,
      positionData.debtAmountETH,
      positionData.healthFactor,
      positionData.liquidationThreshold,
      positionData.ltv,
      positionData.lastUpdated,
      positionData.user_id
    ]);

    console.log('✅ Successfully inserted with updated schema!');

    // Verify the data
    const selectResult = await client.query(
      'SELECT * FROM positions WHERE id = $1',
      [positionData.id]
    );

    if (selectResult.rows.length > 0) {
      const saved = selectResult.rows[0];
      console.log('📊 Verified saved data:');
      console.log(`   liquidationThreshold: ${saved.liquidationThreshold}`);
      console.log(`   ltv: ${saved.ltv}`);
      console.log(`   healthFactor: ${saved.healthFactor}`);
    }

    // Clean up
    await client.query('DELETE FROM positions WHERE id = $1', [positionData.id]);
    console.log('🧹 Test data cleaned up');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Detail:', error.detail);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

debugFieldValues();
