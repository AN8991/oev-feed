import 'dotenv/config';
import { Client } from 'pg';

/**
 * Manually rename database columns from ETH to USD
 */
async function renameColumns() {
  console.log('🔧 MANUALLY RENAMING DATABASE COLUMNS');
  console.log('=' .repeat(50));

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

    console.log('2. Checking current column names...');
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'positions' 
      AND column_name IN ('collateralAmountETH', 'debtAmountETH', 'collateralAmountUSD', 'debtAmountUSD')
      ORDER BY column_name;
    `);
    
    console.log('   Current columns:', columnCheck.rows.map(r => r.column_name));

    // Check if old columns exist
    const hasOldColumns = columnCheck.rows.some(r => 
      r.column_name === 'collateralAmountETH' || r.column_name === 'debtAmountETH'
    );
    
    const hasNewColumns = columnCheck.rows.some(r => 
      r.column_name === 'collateralAmountUSD' || r.column_name === 'debtAmountUSD'
    );

    if (!hasOldColumns && hasNewColumns) {
      console.log('   ✅ Columns already renamed - no action needed');
      return;
    }

    if (!hasOldColumns && !hasNewColumns) {
      console.log('   ❌ Neither old nor new columns found - something is wrong');
      return;
    }

    console.log('3. Renaming collateralAmountETH to collateralAmountUSD...');
    if (columnCheck.rows.some(r => r.column_name === 'collateralAmountETH')) {
      await client.query(`
        ALTER TABLE positions 
        RENAME COLUMN "collateralAmountETH" TO "collateralAmountUSD"
      `);
      console.log('   ✅ collateralAmountETH renamed to collateralAmountUSD');
    } else {
      console.log('   ⚠️  collateralAmountETH column not found');
    }

    console.log('4. Renaming debtAmountETH to debtAmountUSD...');
    if (columnCheck.rows.some(r => r.column_name === 'debtAmountETH')) {
      await client.query(`
        ALTER TABLE positions 
        RENAME COLUMN "debtAmountETH" TO "debtAmountUSD"
      `);
      console.log('   ✅ debtAmountETH renamed to debtAmountUSD');
    } else {
      console.log('   ⚠️  debtAmountETH column not found');
    }

    console.log('5. Verifying column rename...');
    const verifyColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'positions' 
      AND column_name IN ('collateralAmountETH', 'debtAmountETH', 'collateralAmountUSD', 'debtAmountUSD')
      ORDER BY column_name;
    `);
    
    console.log('   Final columns:', verifyColumns.rows.map(r => r.column_name));
    
    const finalHasOld = verifyColumns.rows.some(r => 
      r.column_name === 'collateralAmountETH' || r.column_name === 'debtAmountETH'
    );
    
    const finalHasNew = verifyColumns.rows.some(r => 
      r.column_name === 'collateralAmountUSD' || r.column_name === 'debtAmountUSD'
    );

    if (!finalHasOld && finalHasNew) {
      console.log('\n🎉 SUCCESS: Column rename completed successfully!');
      console.log('   ✅ Old ETH columns removed');
      console.log('   ✅ New USD columns created');
    } else {
      console.log('\n⚠️  WARNING: Column rename may not have completed properly');
      console.log(`   Old columns still exist: ${finalHasOld}`);
      console.log(`   New columns exist: ${finalHasNew}`);
    }

  } catch (error) {
    console.error('❌ Error renaming columns:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the rename
renameColumns().catch(console.error);
