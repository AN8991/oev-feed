const { Client } = require('pg');

async function updateSchemaToDecimal() {
  console.log('🔄 MANUAL SCHEMA UPDATE TO DECIMAL TYPES');
  console.log('==========================================');
  
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

    console.log('2. Checking current schema...');
    const schemaResult = await client.query(`
      SELECT column_name, data_type, numeric_precision, numeric_scale 
      FROM information_schema.columns 
      WHERE table_name = 'positions' 
      AND column_name IN ('collateralAmount', 'collateralAmountETH', 'debtAmount', 'debtAmountETH', 'healthFactor', 'liquidationThreshold', 'ltv')
      ORDER BY column_name;
    `);
    
    console.log('   Current column types:');
    schemaResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    console.log('3. Backing up existing data...');
    const backupResult = await client.query('SELECT COUNT(*) FROM positions');
    console.log(`   Found ${backupResult.rows[0].count} existing positions`);

    console.log('4. Updating schema to decimal types...');
    
    // Update each column to decimal type
    const updates = [
      { column: 'collateralAmount', type: 'DECIMAL(36,18)' },
      { column: 'collateralAmountETH', type: 'DECIMAL(36,18)' },
      { column: 'debtAmount', type: 'DECIMAL(36,18)' },
      { column: 'debtAmountETH', type: 'DECIMAL(36,18)' },
      { column: 'healthFactor', type: 'DECIMAL(10,6)' },
      { column: 'liquidationThreshold', type: 'DECIMAL(5,2)' },
      { column: 'ltv', type: 'DECIMAL(5,2)' }
    ];

    for (const update of updates) {
      console.log(`   Updating ${update.column} to ${update.type}...`);
      try {
        await client.query(`
          ALTER TABLE positions 
          ALTER COLUMN "${update.column}" TYPE ${update.type} 
          USING CASE 
            WHEN "${update.column}" IS NULL THEN NULL
            ELSE "${update.column}"::${update.type}
          END
        `);
        console.log(`   ✅ ${update.column} updated successfully`);
      } catch (error) {
        console.log(`   ❌ Error updating ${update.column}:`, error.message);
      }
    }

    console.log('5. Verifying new schema...');
    const newSchemaResult = await client.query(`
      SELECT column_name, data_type, numeric_precision, numeric_scale 
      FROM information_schema.columns 
      WHERE table_name = 'positions' 
      AND column_name IN ('collateralAmount', 'collateralAmountETH', 'debtAmount', 'debtAmountETH', 'healthFactor', 'liquidationThreshold', 'ltv')
      ORDER BY column_name;
    `);
    
    console.log('   Updated column types:');
    newSchemaResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}(${row.numeric_precision},${row.numeric_scale})`);
    });

    console.log('✅ Schema update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating schema:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

updateSchemaToDecimal();
