import 'dotenv/config';
import { Client } from 'pg';

/**
 * Simple direct database query to check recent positions
 */
async function queryRecentPositions() {
  console.log('🔍 QUERYING RECENT POSITIONS FROM DATABASE (Direct Query)');
  console.log('=' .repeat(60));

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'oev_feed',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    console.log('1. Connecting to database...');
    await client.connect();
    console.log('   ✅ Database connected');

    console.log('2. Checking if positions table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'positions'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('   ❌ Positions table does not exist');
      return;
    }
    console.log('   ✅ Positions table exists');

    console.log('3. Getting table structure...');
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'positions' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 TABLE STRUCTURE:');
    tableStructure.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });

    console.log('\n4. Counting total positions...');
    const countResult = await client.query('SELECT COUNT(*) as total FROM positions');
    const totalPositions = parseInt(countResult.rows[0].total);
    console.log(`   Total positions in database: ${totalPositions}`);

    if (totalPositions === 0) {
      console.log('   ❌ No positions found in database');
      return;
    }

    console.log('\n5. Querying recent positions...');
    const recentPositions = await client.query(`
      SELECT 
        id,
        "userAddress",
        protocol,
        network,
        "assetSymbol",
        "assetAddress",
        "collateralAmount",
        "collateralAmountUSD",
        "debtAmount", 
        "debtAmountUSD",
        "healthFactor",
        "liquidationThreshold",
        ltv,
        "lastUpdated"
      FROM positions 
      ORDER BY "lastUpdated" DESC 
      LIMIT 10
    `);

    console.log(`   Found ${recentPositions.rows.length} recent positions`);

    console.log('\n📊 MOST RECENT POSITIONS:');
    console.log('=' .repeat(80));
    
    recentPositions.rows.forEach((pos, index) => {
      const lastUpdatedDate = new Date(parseInt(pos.lastUpdated));
      console.log(`\n${index + 1}. Position ID: ${pos.id}`);
      console.log(`   User Address: ${pos.userAddress}`);
      console.log(`   Protocol: ${pos.protocol}`);
      console.log(`   Network: ${pos.network}`);
      console.log(`   Asset: ${pos.assetSymbol} (${pos.assetAddress})`);
      console.log(`   Collateral: ${pos.collateralAmount} ${pos.assetSymbol}`);
      console.log(`   Collateral (USD): $${pos.collateralAmountUSD}`);
      console.log(`   Debt: ${pos.debtAmount} ${pos.assetSymbol}`);
      console.log(`   Debt (USD): $${pos.debtAmountUSD}`);
      console.log(`   Health Factor: ${pos.healthFactor}`);
      console.log(`   Liquidation Threshold: ${pos.liquidationThreshold}%`);
      console.log(`   LTV: ${pos.ltv}%`);
      console.log(`   Last Updated: ${lastUpdatedDate.toISOString()}`);
      console.log(`   Timestamp: ${pos.lastUpdated}`);
      console.log('   ' + '-'.repeat(70));
    });

    // Summary statistics
    console.log('\n📈 SUMMARY STATISTICS:');
    const protocols = [...new Set(recentPositions.rows.map(p => p.protocol))];
    const networks = [...new Set(recentPositions.rows.map(p => p.network))];
    const assets = [...new Set(recentPositions.rows.map(p => p.assetSymbol))];
    const users = [...new Set(recentPositions.rows.map(p => p.userAddress))];
    
    console.log(`   Protocols: ${protocols.join(', ')}`);
    console.log(`   Networks: ${networks.join(', ')}`);
    console.log(`   Assets: ${assets.join(', ')}`);
    console.log(`   Unique Users: ${users.length}`);
    
    // Most recent entry details
    if (recentPositions.rows.length > 0) {
      const mostRecent = recentPositions.rows[0];
      const mostRecentDate = new Date(parseInt(mostRecent.lastUpdated));
      console.log(`\n🕐 MOST RECENT ENTRY:`);
      console.log(`   Saved: ${mostRecentDate.toLocaleString()}`);
      console.log(`   Protocol: ${mostRecent.protocol}`);
      console.log(`   Asset: ${mostRecent.assetSymbol}`);
      console.log(`   User: ${mostRecent.userAddress}`);
      console.log(`   Collateral: ${mostRecent.collateralAmount} ${mostRecent.assetSymbol}`);
      console.log(`   Debt: ${mostRecent.debtAmount} ${mostRecent.assetSymbol}`);
    }

    // Check for specific test user data
    console.log('\n🎯 CHECKING FOR TEST USER DATA:');
    const testUserPositions = await client.query(`
      SELECT * FROM positions 
      WHERE "userAddress" = $1 
      ORDER BY "lastUpdated" DESC
    `, ['0x79682489385337996edd00eb56b4238b597bfae7']);
    
    if (testUserPositions.rows.length > 0) {
      console.log(`   ✅ Found ${testUserPositions.rows.length} positions for test user`);
      testUserPositions.rows.forEach((pos, index) => {
        console.log(`   Position ${index + 1}: ${pos.assetSymbol} on ${pos.protocol}`);
        console.log(`     Collateral: ${pos.collateralAmount}, Debt: ${pos.debtAmount}`);
      });
    } else {
      console.log('   ❌ No positions found for test user 0x79682489385337996edd00eb56b4238b597bfae7');
    }

  } catch (error) {
    console.error('❌ Error querying database:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the query
queryRecentPositions().catch(console.error);
