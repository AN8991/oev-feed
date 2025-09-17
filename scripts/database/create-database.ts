import { Client } from 'pg';

async function createDatabase() {
  // First connect to the default postgres database
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const checkDbQuery = `
      SELECT 1 FROM pg_database WHERE datname = 'oev_feed';
    `;
    
    const result = await client.query(checkDbQuery);
    
    if (result.rows.length > 0) {
      console.log('Database "oev_feed" already exists');
    } else {
      // Create the database
      console.log('Creating database "oev_feed"...');
      await client.query('CREATE DATABASE oev_feed;');
      console.log('Database "oev_feed" created successfully!');
    }

    await client.end();
    console.log('Database setup completed');

  } catch (error) {
    console.error('Error creating database:', error);
    await client.end();
    process.exit(1);
  }
}

// Run the function
createDatabase();
