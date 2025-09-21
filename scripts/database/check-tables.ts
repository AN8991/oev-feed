/**
 * Check what all tables saved in the database
 */
import 'dotenv/config';
import { Client } from 'pg';

async function checkTables() {
  console.log('🔍 CHECKING DATABASE TABLES');
  console.log('=' .repeat(50));

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'oev_feed',
  });

  try {
    await client.connect();
    console.log('✅ Database connected');

    // Check all tables
    const allTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('\n📊 All Tables:');
    allTables.rows.forEach(row => {
      console.log(`   📋 ${row.table_name}`);
    });

    // Check specifically for position/positions tables
    const positionTables = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('position', 'positions')
      ORDER BY table_name, ordinal_position
    `);

    if (positionTables.rows.length > 0) {
      console.log('\n🔍 Position-related Tables:');
      let currentTable = '';
      positionTables.rows.forEach(row => {
        if (row.table_name !== currentTable) {
          currentTable = row.table_name;
          console.log(`\n   📋 Table: ${row.table_name}`);
        }
        console.log(`      🔗 ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('\n⚠️  No position or positions tables found');
    }

    // Check table sizes
    const tableSizes = await client.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('position', 'positions')
    `);

    if (tableSizes.rows.length > 0) {
      console.log('\n📈 Table Sizes:');
      tableSizes.rows.forEach(row => {
        console.log(`   📋 ${row.tablename}: ${row.total_size} (table: ${row.table_size})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

checkTables().catch(console.error);
