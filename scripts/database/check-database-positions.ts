import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PositionEntity } from '../../src/adapters/secondary/database/typeorm/entities/position.entity';
import { UserEntity } from '../../src/adapters/secondary/database/typeorm/entities/user.entity';

const TEST_USER_ADDRESS = '0x79682489385337996edd00eb56b4238b597bfae7';

/**
 * Check what positions are currently saved in the database
 */
async function checkDatabasePositions() {
  console.log('🔍 CHECKING DATABASE FOR SAVED POSITIONS');
  console.log('User address:', TEST_USER_ADDRESS);
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

    console.log('2. Checking for user in database...');
    const userRepo = dataSource.getRepository(UserEntity);
    const user = await userRepo.findOne({ where: { address: TEST_USER_ADDRESS } });
    
    if (!user) {
      console.log('   ❌ User not found in database');
      console.log('   This means no positions have been saved yet for this address');
      return;
    }
    
    console.log('   ✅ User found:', { id: user.id, address: user.address });

    console.log('3. Checking for positions...');
    const positionRepo = dataSource.getRepository(PositionEntity);
    
    // Get all positions for this user
    const allPositions = await positionRepo.find({
      where: { userAddress: TEST_USER_ADDRESS },
      order: { lastUpdated: 'DESC' }
    });
    
    console.log(`   Found ${allPositions.length} total positions for user`);
    
    if (allPositions.length === 0) {
      console.log('   ❌ No positions found in database');
      console.log('   This means the adapter data was not saved successfully');
    } else {
      console.log('\n📊 SAVED POSITIONS:');
      
      // Group by protocol and network
      const grouped = allPositions.reduce((acc: any, pos: any) => {
        const key = `${pos.protocol}-${pos.network}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(pos);
        return acc;
      }, {});
      
      Object.entries(grouped).forEach(([protocolNetwork, positions]: [string, any]) => {
        console.log(`\n  ${protocolNetwork.toUpperCase()}:`);
        positions.forEach((pos: any, index: number) => {
          console.log(`    Position ${index + 1}:`);
          console.log(`      Asset: ${pos.assetSymbol}`);
          console.log(`      Collateral: ${pos.collateralAmount}`);
          console.log(`      Debt: ${pos.debtAmount}`);
          console.log(`      Health Factor: ${pos.healthFactor}`);
          console.log(`      Last Updated: ${pos.lastUpdated}`);
          
          // Highlight ETH positions
          if (pos.assetSymbol === 'ETH') {
            console.log(`      🔥 ETH POSITION - Collateral: ${pos.collateralAmount}, Debt: ${pos.debtAmount}`);
          }
        });
      });
      
      // Check for recent Aave V3 positions specifically
      const aaveV3Positions = allPositions.filter((pos: any) => 
        pos.protocol === 'aave-v3' && pos.network === 'ethereum'
      );
      
      if (aaveV3Positions.length > 0) {
        console.log(`\n✅ Found ${aaveV3Positions.length} Aave V3 Ethereum positions`);
        
        const ethPosition = aaveV3Positions.find((pos: any) => pos.assetSymbol === 'ETH');
        if (ethPosition) {
          console.log('\n🎯 AAVE V3 ETH POSITION VERIFICATION:');
          console.log(`   Supplied: ${ethPosition.collateralAmount} ETH`);
          console.log(`   Borrowed: ${ethPosition.debtAmount} ETH`);
          console.log(`   Expected Supplied: 0.0100428 ETH`);
          console.log(`   Expected Borrowed: 0.0020116 ETH`);
          
          const suppliedMatch = Math.abs(parseFloat(ethPosition.collateralAmount) - 0.0100428) < 0.0001;
          const borrowedMatch = Math.abs(parseFloat(ethPosition.debtAmount) - 0.0020116) < 0.0001;
          
          console.log(`   Supplied Match: ${suppliedMatch ? '✅' : '❌'}`);
          console.log(`   Borrowed Match: ${borrowedMatch ? '✅' : '❌'}`);
          
          if (suppliedMatch && borrowedMatch) {
            console.log('\n🎉 DATABASE DATA MATCHES EXPECTED VALUES!');
          }
        }
      } else {
        console.log('\n⚠️  No Aave V3 Ethereum positions found in database');
        console.log('   This suggests the adapter test script may not have completed successfully');
      }
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the check
checkDatabasePositions().catch(console.error);
