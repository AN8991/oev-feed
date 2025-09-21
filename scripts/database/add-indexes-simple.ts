/**
 * Simple script to add performance indexes without TypeORM entity loading
 */

import 'dotenv/config';
import { Client } from 'pg';

async function addIndexes() {
  console.log('🚀 ADDING PERFORMANCE INDEXES TO DATABASE');
  console.log('=' .repeat(60));

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'oev_feed',
  });

  try {
    await client.connect();
    console.log('   ✅ Database connected');

    const indexes = [
      {
        name: 'idx_positions_user_address',
        sql: 'CREATE INDEX IF NOT EXISTS idx_positions_user_address ON positions(user_address);',
        description: 'Index on user_address for fast user lookups'
      },
      {
        name: 'idx_positions_protocol_network',
        sql: 'CREATE INDEX IF NOT EXISTS idx_positions_protocol_network ON positions(protocol, network);',
        description: 'Composite index on protocol + network'
      },
      {
        name: 'idx_positions_last_updated',
        sql: 'CREATE INDEX IF NOT EXISTS idx_positions_last_updated ON positions(last_updated DESC);',
        description: 'Index on last_updated for sorting'
      },
      {
        name: 'idx_positions_risk_level',
        sql: 'CREATE INDEX IF NOT EXISTS idx_positions_risk_level ON positions(risk_level) WHERE risk_level IS NOT NULL;',
        description: 'Partial index on risk_level'
      },
      {
        name: 'idx_positions_risk_score',
        sql: 'CREATE INDEX IF NOT EXISTS idx_positions_risk_score ON positions(risk_score) WHERE risk_score IS NOT NULL;',
        description: 'Partial index on risk_score'
      },
      {
        name: 'idx_positions_user_protocol_network',
        sql: 'CREATE INDEX IF NOT EXISTS idx_positions_user_protocol_network ON positions(user_address, protocol, network);',
        description: 'Composite index for unique position identification'
      },
      {
        name: 'idx_positions_asset_symbol',
        sql: 'CREATE INDEX IF NOT EXISTS idx_positions_asset_symbol ON positions(asset_symbol);',
        description: 'Index on asset_symbol'
      },
      {
        name: 'idx_positions_health_factor',
        sql: 'CREATE INDEX IF NOT EXISTS idx_positions_health_factor ON positions(health_factor) WHERE health_factor IS NOT NULL;',
        description: 'Partial index on health_factor'
      },
      {
        name: 'idx_positions_user_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id) WHERE user_id IS NOT NULL;',
        description: 'Index on user_id foreign key'
      },
      {
        name: 'idx_positions_active',
        sql: `CREATE INDEX IF NOT EXISTS idx_positions_active ON positions(user_address, last_updated DESC) 
              WHERE (collateral_amount::numeric > 0 OR debt_amount::numeric > 0);`,
        description: 'Partial index on active positions'
      }
    ];

    console.log('\n📊 Creating indexes...');
    
    for (const index of indexes) {
      try {
        await client.query(index.sql);
        console.log(`   ✅ ${index.description}`);
      } catch (error) {
        console.log(`   ⚠️  ${index.name}: ${(error as Error).message}`);
      }
    }

    // Get table info
    const tableInfo = await client.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'positions'
    `);

    if (tableInfo.rows.length > 0) {
      const row = tableInfo.rows[0];
      console.log('\n📈 Positions Table Size:');
      console.log(`   Total Size: ${row.total_size}`);
      console.log(`   Table Size: ${row.table_size}`);
      console.log(`   Index Size: ${row.index_size}`);
    }

    // List created indexes
    const indexList = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'positions'
        AND indexname LIKE 'idx_%'
      ORDER BY indexname
    `);

    console.log('\n🔍 Created Indexes:');
    indexList.rows.forEach(row => {
      console.log(`   🔗 ${row.indexname}`);
    });

    console.log('\n🎉 Performance indexes added successfully!');

  } catch (error) {
    console.error('❌ Error adding performance indexes:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

addIndexes().catch(console.error);
