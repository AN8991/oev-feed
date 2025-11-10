/**
 * Seed Providers Script
 * Populates the providers table with configured blockchain RPC providers
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

interface ProviderSeed {
  name: string;
  type: string;
  network: string;
  isActive: boolean;
  rateLimit: number;
  priority: number;
  baseUrl?: string;
  config?: Record<string, any>;
}

const providersToSeed: ProviderSeed[] = [
  // Ethereum Mainnet Providers
  {
    name: 'alchemy-ethereum',
    type: 'alchemy',
    network: 'ethereum',
    isActive: true,
    rateLimit: 330,
    priority: 0,
    baseUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
    config: {
      chainId: 1,
      timeout: 30000,
      maxRetries: 3,
    },
  },
  {
    name: 'infura-ethereum',
    type: 'infura',
    network: 'ethereum',
    isActive: true,
    rateLimit: 100,
    priority: 1,
    baseUrl: 'https://mainnet.infura.io/v3/',
    config: {
      chainId: 1,
      timeout: 30000,
      maxRetries: 3,
    },
  },
  
  // Polygon Mainnet Providers
  {
    name: 'alchemy-polygon',
    type: 'alchemy',
    network: 'polygon',
    isActive: true,
    rateLimit: 330,
    priority: 0,
    baseUrl: 'https://polygon-mainnet.g.alchemy.com/v2/',
    config: {
      chainId: 137,
      timeout: 30000,
      maxRetries: 3,
    },
  },
  {
    name: 'infura-polygon',
    type: 'infura',
    network: 'polygon',
    isActive: true,
    rateLimit: 100,
    priority: 1,
    baseUrl: 'https://polygon-mainnet.infura.io/v3/',
    config: {
      chainId: 137,
      timeout: 30000,
      maxRetries: 3,
    },
  },
  
  // Arbitrum Mainnet Providers
  {
    name: 'alchemy-arbitrum',
    type: 'alchemy',
    network: 'arbitrum',
    isActive: true,
    rateLimit: 330,
    priority: 0,
    baseUrl: 'https://arb-mainnet.g.alchemy.com/v2/',
    config: {
      chainId: 42161,
      timeout: 30000,
      maxRetries: 3,
    },
  },
  {
    name: 'infura-arbitrum',
    type: 'infura',
    network: 'arbitrum',
    isActive: true,
    rateLimit: 100,
    priority: 1,
    baseUrl: 'https://arbitrum-mainnet.infura.io/v3/',
    config: {
      chainId: 42161,
      timeout: 30000,
      maxRetries: 3,
    },
  },
  
  // Optimism Mainnet Providers
  {
    name: 'alchemy-optimism',
    type: 'alchemy',
    network: 'optimism',
    isActive: true,
    rateLimit: 330,
    priority: 0,
    baseUrl: 'https://opt-mainnet.g.alchemy.com/v2/',
    config: {
      chainId: 10,
      timeout: 30000,
      maxRetries: 3,
    },
  },
  {
    name: 'infura-optimism',
    type: 'infura',
    network: 'optimism',
    isActive: true,
    rateLimit: 100,
    priority: 1,
    baseUrl: 'https://optimism-mainnet.infura.io/v3/',
    config: {
      chainId: 10,
      timeout: 30000,
      maxRetries: 3,
    },
  },
  
  // Base Mainnet Providers
  {
    name: 'alchemy-base',
    type: 'alchemy',
    network: 'base',
    isActive: true,
    rateLimit: 330,
    priority: 0,
    baseUrl: 'https://base-mainnet.g.alchemy.com/v2/',
    config: {
      chainId: 8453,
      timeout: 30000,
      maxRetries: 3,
    },
  },
];

async function seedProviders() {
  console.log('🌱 Starting provider seeding...\n');

  // Create data source
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'oev_feed',
    entities: ['src/adapters/secondary/database/typeorm/entities/**/*.entity.ts'],
    synchronize: false,
  });

  try {
    // Initialize connection
    await dataSource.initialize();
    console.log('✅ Database connection established\n');

    // Get provider repository
    const providerRepo = dataSource.getRepository('providers');

    // Check existing providers
    const existingCount = await providerRepo.count();
    console.log(`📊 Existing providers in database: ${existingCount}\n`);

    let insertedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    // Insert or update providers
    for (const providerData of providersToSeed) {
      const existing = await providerRepo.findOne({
        where: { name: providerData.name },
      });

      if (existing) {
        // Update existing provider
        await providerRepo.update(
          { name: providerData.name },
          {
            type: providerData.type,
            network: providerData.network,
            isActive: providerData.isActive,
            rateLimit: providerData.rateLimit,
            priority: providerData.priority,
            baseUrl: providerData.baseUrl,
            config: providerData.config,
          }
        );
        console.log(`🔄 Updated: ${providerData.name} (${providerData.network})`);
        updatedCount++;
      } else {
        // Insert new provider
        await providerRepo.insert({
          name: providerData.name,
          type: providerData.type,
          network: providerData.network,
          isActive: providerData.isActive,
          rateLimit: providerData.rateLimit,
          priority: providerData.priority,
          baseUrl: providerData.baseUrl,
          config: providerData.config,
        });
        console.log(`✨ Inserted: ${providerData.name} (${providerData.network})`);
        insertedCount++;
      }
    }

    // Summary
    console.log('\n📈 Seeding Summary:');
    console.log(`   ✨ Inserted: ${insertedCount} providers`);
    console.log(`   🔄 Updated: ${updatedCount} providers`);
    console.log(`   ⏭️  Skipped: ${skippedCount} providers`);
    console.log(`   📊 Total in DB: ${await providerRepo.count()} providers\n`);

    // Display providers by network
    console.log('🌐 Providers by Network:');
    const networks = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'];
    for (const network of networks) {
      const count = await providerRepo.count({ where: { network } });
      if (count > 0) {
        console.log(`   ${network}: ${count} providers`);
      }
    }

    console.log('\n✅ Provider seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding providers:', error);
    throw error;
  } finally {
    // Close connection
    await dataSource.destroy();
    console.log('\n🔌 Database connection closed');
  }
}

// Run seeding
seedProviders()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
