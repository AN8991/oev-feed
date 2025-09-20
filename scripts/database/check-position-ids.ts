import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PositionEntity } from '../../src/adapters/secondary/database/typeorm/entities/position.entity';
import { UserEntity } from '../../src/adapters/secondary/database/typeorm/entities/user.entity';

const TEST_USER_ADDRESS = '0x79682489385337996edd00eb56b4238b597bfae7';

async function checkPositionIds() {
  console.log('🔍 CHECKING POSITION IDs IN DATABASE');
  console.log('=' .repeat(50));

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'oev_feed',
    entities: [PositionEntity, UserEntity],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('   ✅ Database connected');

    // Get all positions for the test user with user relationship
    const positions = await dataSource
      .getRepository(PositionEntity)
      .createQueryBuilder('position')
      .leftJoinAndSelect('position.user', 'user')
      .where('LOWER(position.userAddress) = LOWER(:userAddress)', { userAddress: TEST_USER_ADDRESS })
      .orderBy('position.lastUpdated', 'DESC')
      .getMany();

    console.log(`\n📊 Found ${positions.length} positions for user ${TEST_USER_ADDRESS}`);

    if (positions.length > 0) {
      console.log('\n🔍 Position Details:');
      positions.forEach((pos, index) => {
        console.log(`\n--- Position ${index + 1} ---`);
        console.log(`ID: "${pos.id}" (length: ${pos.id.length})`);
        console.log(`User ID: ${pos.user?.id || 'NULL'}`);
        console.log(`User Address: ${pos.userAddress}`);
        console.log(`Protocol: ${pos.protocol}`);
        console.log(`Network: ${pos.network}`);
        console.log(`Asset: ${pos.assetSymbol}`);
        console.log(`Risk Score: ${pos.riskScore}`);
        console.log(`Risk Level: ${pos.riskLevel}`);
        console.log(`Risk Assessed At: ${pos.riskAssessedAt}`);
        console.log(`Last Updated: ${pos.lastUpdated}`);
        
        // Check if ID looks like a UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const isValidUUID = uuidRegex.test(pos.id);
        console.log(`Is Valid UUID: ${isValidUUID ? '✅' : '❌'}`);
        
        if (!isValidUUID) {
          console.log(`⚠️  INVALID ID FORMAT: "${pos.id}"`);
        }
      });
    } else {
      console.log('❌ No positions found');
    }

    await dataSource.destroy();
    console.log('\n🔌 Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

checkPositionIds().catch(console.error);
