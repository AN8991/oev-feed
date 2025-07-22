import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * Simple TypeORM connectivity test to isolate the hanging issue
 */
async function testTypeORMSimple() {
  console.log('🔍 SIMPLE TYPEORM CONNECTIVITY TEST');
  console.log('Testing basic database connection without full entity loading...');
  console.log('=' .repeat(50));

  // Create a minimal DataSource configuration
  const testDataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'oev_feed',
    synchronize: false,
    logging: false,
    entities: [], // Start with no entities to isolate the issue
  });

  try {
    console.log('1. Attempting to initialize DataSource...');
    await testDataSource.initialize();
    console.log('   ✅ DataSource initialized successfully');

    console.log('2. Testing basic query...');
    const result = await testDataSource.query('SELECT NOW() as current_time');
    console.log('   ✅ Query executed:', result[0]);

    console.log('3. Checking existing tables...');
    const tables = await testDataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('   ✅ Found tables:', tables.map((t: any) => t.table_name));

    console.log('4. Testing position data query...');
    const positions = await testDataSource.query(`
      SELECT id, "assetSymbol", "collateralAmount", "debtAmount" 
      FROM positions 
      WHERE protocol = 'aave-v3' 
      LIMIT 3
    `);
    console.log('   ✅ Position data:', positions);

    console.log('5. Destroying connection...');
    await testDataSource.destroy();
    console.log('   ✅ Connection destroyed');

    console.log('\n🎉 TYPEORM CONNECTIVITY TEST PASSED');
    console.log('The issue is likely with entity loading, not basic connectivity.');

  } catch (error) {
    console.error('\n❌ TYPEORM CONNECTIVITY ERROR:', error);
    
    if (testDataSource.isInitialized) {
      try {
        await testDataSource.destroy();
      } catch (destroyError) {
        console.error('Error destroying connection:', destroyError);
      }
    }
  }
}

testTypeORMSimple().catch(console.error);
