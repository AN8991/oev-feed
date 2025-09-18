import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PositionEntity } from '../../src/adapters/secondary/database/typeorm/entities/position.entity';
import { UserEntity } from '../../src/adapters/secondary/database/typeorm/entities/user.entity';

/**
 * Query the most recent positions data from the database
 */
async function queryRecentPositions() {
  console.log('🔍 QUERYING RECENT POSITIONS FROM DATABASE');
  console.log('=' .repeat(50));

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'oev_feed',
    entities: [PositionEntity, UserEntity],
    synchronize: false,
    logging: false,
  });

  try {
    console.log('1. Connecting to database...');
    await dataSource.initialize();
    console.log('   ✅ Database connected');

    console.log('2. Querying recent positions...');
    const positionRepo = dataSource.getRepository(PositionEntity);
    
    // Get the 10 most recent positions
    const recentPositions = await positionRepo.find({
      relations: ['user'],
      order: { lastUpdated: 'DESC' },
      take: 10
    });
    
    console.log(`   Found ${recentPositions.length} recent positions`);
    
    if (recentPositions.length === 0) {
      console.log('   ❌ No positions found in database');
      return;
    }

    console.log('\n📊 MOST RECENT POSITIONS:');
    console.log('=' .repeat(80));
    
    recentPositions.forEach((pos: any, index: number) => {
      const lastUpdatedDate = new Date(parseInt(pos.lastUpdated));
      console.log(`\n${index + 1}. Position ID: ${pos.id}`);
      console.log(`   User Address: ${pos.userAddress}`);
      console.log(`   Protocol: ${pos.protocol}`);
      console.log(`   Network: ${pos.network}`);
      console.log(`   Asset: ${pos.assetSymbol} (${pos.assetAddress})`);
      console.log(`   Collateral: ${pos.collateralAmount} ${pos.assetSymbol}`);
      console.log(`   Collateral (ETH): ${pos.collateralAmountETH} ETH`);
      console.log(`   Debt: ${pos.debtAmount} ${pos.assetSymbol}`);
      console.log(`   Debt (ETH): ${pos.debtAmountETH} ETH`);
      console.log(`   Health Factor: ${pos.healthFactor}`);
      console.log(`   Liquidation Threshold: ${pos.liquidationThreshold}%`);
      console.log(`   LTV: ${pos.ltv}%`);
      console.log(`   Last Updated: ${lastUpdatedDate.toISOString()} (${pos.lastUpdated})`);
      console.log('   ' + '-'.repeat(70));
    });

    // Summary statistics
    console.log('\n📈 SUMMARY STATISTICS:');
    const protocols = [...new Set(recentPositions.map((p: any) => p.protocol))];
    const networks = [...new Set(recentPositions.map((p: any) => p.network))];
    const assets = [...new Set(recentPositions.map((p: any) => p.assetSymbol))];
    const users = [...new Set(recentPositions.map((p: any) => p.userAddress))];
    
    console.log(`   Protocols: ${protocols.join(', ')}`);
    console.log(`   Networks: ${networks.join(', ')}`);
    console.log(`   Assets: ${assets.join(', ')}`);
    console.log(`   Unique Users: ${users.length}`);
    
    // Most recent entry details
    if (recentPositions.length > 0) {
      const mostRecent = recentPositions[0];
      const mostRecentDate = mostRecent.lastUpdated;
      console.log(`\n🕐 MOST RECENT ENTRY:`);
      console.log(`   Saved: ${mostRecentDate.toLocaleString()}`);
      console.log(`   Protocol: ${mostRecent.protocol}`);
      console.log(`   Asset: ${mostRecent.assetSymbol}`);
      console.log(`   User: ${mostRecent.userAddress}`);
    }

  } catch (error) {
    console.error('❌ Error querying database:', error);
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the query
queryRecentPositions().catch(console.error);
