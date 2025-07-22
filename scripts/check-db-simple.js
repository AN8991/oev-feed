const { Client } = require('pg');

const TEST_USER_ADDRESS = '0x79682489385337996edd00eb56b4238b597bfae7';

async function checkDatabase() {
  console.log('🔍 SIMPLE DATABASE CHECK');
  console.log('User address:', TEST_USER_ADDRESS);
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
    console.log('   ✅ Connected');

    console.log('2. Checking if tables exist...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'positions')
    `);
    
    console.log('   Tables found:', tablesResult.rows.map(r => r.table_name));

    if (tablesResult.rows.length === 0) {
      console.log('   ❌ No tables found - database schema not created yet');
      return;
    }

    console.log('3. Checking for users...');
    const usersResult = await client.query('SELECT * FROM users WHERE address = $1', [TEST_USER_ADDRESS]);
    console.log(`   Found ${usersResult.rows.length} users with address ${TEST_USER_ADDRESS}`);
    
    if (usersResult.rows.length > 0) {
      console.log('   User data:', usersResult.rows[0]);
    }

    console.log('4. Checking database schema...');
    const schemaResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'positions' 
      ORDER BY ordinal_position
    `);
    console.log('   Position table columns:', schemaResult.rows.map(r => `${r.column_name} (${r.data_type})`));

    console.log('5. Checking for positions...');
    if (usersResult.rows.length > 0) {
      const userId = usersResult.rows[0].id;
      const positionsResult = await client.query('SELECT * FROM positions WHERE user_id = $1', [userId]);
      console.log(`   Found ${positionsResult.rows.length} positions for user`);
      
      if (positionsResult.rows.length > 0) {
        console.log('\n📊 POSITIONS IN DATABASE:');
        positionsResult.rows.forEach((pos, index) => {
          console.log(`   Position ${index + 1}:`);
          console.log('     Raw data:', pos);
          
          // Try different column name variations
          const assetSymbol = pos.assetSymbol || pos.asset_symbol || pos.assetsymbol;
          const collateralAmount = pos.collateralAmount || pos.collateral_amount || pos.collateralamount;
          const debtAmount = pos.debtAmount || pos.debt_amount || pos.debtamount;
          const healthFactor = pos.healthFactor || pos.health_factor || pos.healthfactor;
          
          console.log(`     Asset: ${assetSymbol}`);
          console.log(`     Protocol: ${pos.protocol}`);
          console.log(`     Network: ${pos.network}`);
          console.log(`     Collateral: ${collateralAmount}`);
          console.log(`     Debt: ${debtAmount}`);
          console.log(`     Health Factor: ${healthFactor}`);
          console.log(`     Last Updated: ${pos.lastUpdated || pos.last_updated || pos.lastupdated}`);
          
          // Check for ETH position
          if (assetSymbol === 'ETH') {
            console.log(`     🔥 ETH POSITION FOUND!`);
            console.log(`        Expected: Supplied 0.0100428, Borrowed 0.0020116`);
            console.log(`        Actual: Supplied ${collateralAmount}, Borrowed ${debtAmount}`);
            
            if (collateralAmount === '0' || collateralAmount === 0) {
              console.log(`        ⚠️  ZERO VALUES DETECTED - Data may not have been saved correctly`);
            }
          }
        });
      }
    }

    console.log('\n6. Summary check - any Aave V3 data?');
    const aaveV3Result = await client.query(`
      SELECT * FROM positions 
      WHERE protocol = 'aave-v3' 
      AND network = 'ethereum'
    `);
    
    console.log(`   Found ${aaveV3Result.rows.length} Aave V3 Ethereum positions total`);
    
    if (aaveV3Result.rows.length > 0) {
      console.log('   🎉 AAVE V3 DATA EXISTS IN DATABASE!');
      aaveV3Result.rows.forEach((pos, index) => {
        const assetSymbol = pos.assetSymbol || pos.asset_symbol || pos.assetsymbol;
        const collateralAmount = pos.collateralAmount || pos.collateral_amount || pos.collateralamount;
        const debtAmount = pos.debtAmount || pos.debt_amount || pos.debtamount;
        console.log(`     Position ${index + 1}: ${assetSymbol} - Collateral: ${collateralAmount}, Debt: ${debtAmount}`);
        
        if (collateralAmount === '0' && debtAmount === '0') {
          console.log(`       ⚠️  This position has zero values - may indicate a data saving issue`);
        }
      });
      
      console.log('\n   🔍 DIAGNOSIS:');
      const hasNonZeroValues = aaveV3Result.rows.some(pos => {
        const collateral = pos.collateralAmount || pos.collateral_amount || pos.collateralamount;
        const debt = pos.debtAmount || pos.debt_amount || pos.debtamount;
        return collateral !== '0' && collateral !== 0 && debt !== '0' && debt !== 0;
      });
      
      if (hasNonZeroValues) {
        console.log('     ✅ Found positions with actual values - data is being saved correctly');
      } else {
        console.log('     ❌ All positions have zero values - there is an issue with data conversion or saving');
        console.log('     This suggests the adapter is creating position records but not populating the amounts correctly');
      }
    } else {
      console.log('   ❌ No Aave V3 data found - adapter may not have run successfully');
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

checkDatabase().catch(console.error);
