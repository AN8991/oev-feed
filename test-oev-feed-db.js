const { Client } = require('pg');

async function testOevFeedConnection() {
  // Test connection to the oev_feed database specifically
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/oev_feed',
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to oev_feed database!');

    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time;');
    console.log('✅ Query test successful. Current time:', result.rows[0].current_time);

    // Check database permissions
    const permissionCheck = await client.query(`
      SELECT 
        has_database_privilege('postgres', 'oev_feed', 'CONNECT') as can_connect,
        has_database_privilege('postgres', 'oev_feed', 'CREATE') as can_create;
    `);
    console.log('✅ Database permissions:', permissionCheck.rows[0]);

    await client.end();
    console.log('✅ Connection test completed successfully');

  } catch (error) {
    console.error('❌ Error connecting to oev_feed database:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the test
testOevFeedConnection();
