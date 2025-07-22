import 'dotenv/config';
import 'reflect-metadata';
import { AppDataSource } from '../src/infrastructure/config/typeorm.config';

/**
 * Query the most recent positions data from the database
 */
async function queryRecentPositions() {
  console.log('🔍 QUERYING RECENT POSITIONS FROM DATABASE');
  console.log('=' .repeat(50));

  try {
    console.log('1. Connecting to database...');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('   ✅ Database connected');
    }

    console.log('2. Querying recent positions...');
    const positionRepo = AppDataSource.getRepository('PositionEntity');
    
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
      const mostRecentDate = new Date(parseInt(mostRecent.lastUpdated));
      console.log(`\n🕐 MOST RECENT ENTRY:`);
      console.log(`   Saved: ${mostRecentDate.toLocaleString()}`);
      console.log(`   Protocol: ${mostRecent.protocol}`);
      console.log(`   Asset: ${mostRecent.assetSymbol}`);
      console.log(`   User: ${mostRecent.userAddress}`);
    }

  } catch (error) {
    console.error('❌ Error querying database:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the query
queryRecentPositions().catch(console.error);
