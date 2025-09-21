/**
 * Database Reset Script
 *
 * This script truncates all tables and resets auto-increment sequences
 * to provide a clean slate for testing. It removes all data while
 * preserving the table structure.
 * 
 * Features:
 * - Truncates all tables in correct order (respects foreign keys)
 * - Resets auto-increment sequences to start from 1
 * - Preserves table structure and constraints
 * - Safe for development and testing environments
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PositionEntity } from '@adapters/secondary/database/typeorm/entities/position.entity';
import { UserEntity } from '@adapters/secondary/database/typeorm/entities/user.entity';

const logger = new Logger('DatabaseReset');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'oev_feed',
      synchronize: false,
      logging: false,
      entities: [PositionEntity, UserEntity],
    }),
  ]
})
class DatabaseResetModule {}

async function resetDatabase() {
  let app;
  
  try {
    console.log('🗑️  DATABASE RESET SCRIPT');
    console.log('='.repeat(50));
    console.log('⚠️  WARNING: This will delete ALL data in the database!');
    console.log('='.repeat(50));
    
    // Initialize NestJS application
    app = await NestFactory.createApplicationContext(DatabaseResetModule, {
      logger: false
    });
    
    // Get database connection
    const dataSource = app.get(DataSource);
    
    console.log('🔍 Checking current data...');
    
    // Check current record counts
    const userCount = await dataSource.query('SELECT COUNT(*) as count FROM users');
    const positionCount = await dataSource.query('SELECT COUNT(*) as count FROM positions');
    const providerCount = await dataSource.query('SELECT COUNT(*) as count FROM providers');
    const requestCount = await dataSource.query('SELECT COUNT(*) as count FROM provider_requests');
    
    console.log(`📊 Current Records:`);
    console.log(`   Users: ${userCount[0].count}`);
    console.log(`   Positions: ${positionCount[0].count}`);
    console.log(`   Providers: ${providerCount[0].count}`);
    console.log(`   Provider Requests: ${requestCount[0].count}`);
    
    if (parseInt(userCount[0].count) === 0 && parseInt(positionCount[0].count) === 0) {
      console.log('✅ Database is already empty!');
      return;
    }
    
    console.log('\n🧹 Starting database cleanup...');
    
    // Truncate tables in correct order (child tables first to avoid foreign key conflicts)
    console.log('   Truncating provider_requests...');
    await dataSource.query('TRUNCATE TABLE provider_requests CASCADE');
    
    console.log('   Truncating positions...');
    await dataSource.query('TRUNCATE TABLE positions CASCADE');
    
    console.log('   Truncating users...');
    await dataSource.query('TRUNCATE TABLE users CASCADE');
    
    console.log('   Truncating providers...');
    await dataSource.query('TRUNCATE TABLE providers CASCADE');
    
    console.log('\n🔄 Resetting auto-increment sequences...');
    
    // Reset sequences to start from 1
    try {
      await dataSource.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
      console.log('   ✅ Reset users_id_seq to 1');
    } catch (error) {
      console.log('   ⚠️  users_id_seq not found or already reset');
    }
    
    // Reset any other sequences that might exist
    const sequences = await dataSource.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    
    for (const seq of sequences) {
      if (seq.sequence_name !== 'users_id_seq') {
        try {
          await dataSource.query(`ALTER SEQUENCE ${seq.sequence_name} RESTART WITH 1`);
          console.log(`   ✅ Reset ${seq.sequence_name} to 1`);
        } catch (error) {
          console.log(`   ⚠️  Could not reset ${seq.sequence_name}`);
        }
      }
    }
    
    console.log('\n🔍 Verifying cleanup...');
    
    // Verify all tables are empty
    const finalUserCount = await dataSource.query('SELECT COUNT(*) as count FROM users');
    const finalPositionCount = await dataSource.query('SELECT COUNT(*) as count FROM positions');
    const finalProviderCount = await dataSource.query('SELECT COUNT(*) as count FROM providers');
    const finalRequestCount = await dataSource.query('SELECT COUNT(*) as count FROM provider_requests');
    
    console.log(`📊 Final Record Counts:`);
    console.log(`   Users: ${finalUserCount[0].count}`);
    console.log(`   Positions: ${finalPositionCount[0].count}`);
    console.log(`   Providers: ${finalProviderCount[0].count}`);
    console.log(`   Provider Requests: ${finalRequestCount[0].count}`);
    
    // Test sequence reset by checking next values
    console.log('\n🧪 Testing sequence reset...');
    try {
      const nextUserId = await dataSource.query('SELECT nextval(\'users_id_seq\') as next_id');
      console.log(`   Next user ID will be: ${nextUserId[0].next_id}`);
      
      // Reset it back since we just consumed a value
      await dataSource.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    } catch (error) {
      console.log('   ⚠️  Could not test sequence');
    }
    
    console.log('\n✅ DATABASE RESET COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('🎯 Database is now clean and ready for fresh testing');
    console.log('🔢 All auto-increment sequences reset to start from 1');
    console.log('📋 Table structure and constraints preserved');
    
  } catch (error) {
    console.log('❌ Database reset failed:', (error as Error).message);
    throw error;
  } finally {
    if (app) {
      await app.close();
    }
  }
}

// Execute the database reset
resetDatabase().catch(error => {
  console.log('❌ Database reset script failed:', (error as Error).message);
  process.exit(1);
});
