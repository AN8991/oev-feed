#!/usr/bin/env ts-node

/**
 * AAVE V3 User Discovery Script
 *
 * Discovers active AAVE V3 users with health factor <= 5 on Ethereum
 * Uses direct contract queries to find users with positions at liquidation risk
 *
 * Usage:
 * npm run discovery:aave-v3 -- --network=ethereum --from-date=2025-01-01
 */

import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { UserDiscoveryService } from '../../src/application/services/user-discovery/user-discovery.service';
import { Protocol } from '../../src/domain/enums/protocols.enum';
import { Network } from '../../src/domain/enums/networks.enum';

// Load environment variables
dotenv.config();

function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
  }
  return date;
}

async function bootstrap() {
  try {
    // Parse command line arguments manually
    const args = process.argv.slice(2);
    let network = '';
    let fromDate: Date | null = null;
    let toDate: Date | null = null;
    let maxDays: number | null = null;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--network' && i + 1 < args.length) {
        network = args[i + 1];
        i++;
      } else if (arg === '--from-date' && i + 1 < args.length) {
        fromDate = parseDate(args[i + 1]);
        i++;
      } else if (arg === '--to-date' && i + 1 < args.length) {
        toDate = parseDate(args[i + 1]);
        i++;
      } else if (arg === '--max-days' && i + 1 < args.length) {
        maxDays = parseInt(args[i + 1]);
        i++;
      }
    }

    // Set defaults
    if (!fromDate) {
      fromDate = new Date('2025-01-01');
    }
    if (!toDate) {
      toDate = new Date(); // Current date
    }
    if (!maxDays) {
      // Calculate days between fromDate and toDate
      const timeDiff = toDate.getTime() - fromDate.getTime();
      maxDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    if (!network) {
      console.error('❌ Missing required arguments:');
      console.error('   --network <network> (required)');
      console.error('   --from-date <YYYY-MM-DD> (optional, default: 2025-01-01)');
      console.error('   --to-date <YYYY-MM-DD> (optional, default: today)');
      console.error('   --max-days <days> (optional, calculated from date range)');
      console.error('');
      console.error('Examples:');
      console.error('  # Default: Jan 1, 2025 to today');
      console.error('  npx ts-node scripts/discovery/aave-v3-user-discovery.ts --network ethereum');
      console.error('  # Custom range: Sep 20-23, 2025');
      console.error('  npx ts-node scripts/discovery/aave-v3-user-discovery.ts --network ethereum --from-date 2025-09-20 --to-date 2025-09-23');
      process.exit(1);
    }

    console.log('🚀 Starting AAVE V3 user discovery...');
    console.log(`📍 Network: ${network}`);
    console.log(`📅 From: ${fromDate.toISOString().split('T')[0]}`);
    console.log(`📅 To: ${toDate.toISOString().split('T')[0]} (${maxDays} day${maxDays > 1 ? 's' : ''})`);
    console.log(`🎯 Health Factor Filter: <= 5`);
    console.log(`⏳ Processing...`);

    // Initialize NestJS application
    const app = await NestFactory.createApplicationContext(AppModule);

    const userDiscoveryService = app.get(UserDiscoveryService);

    // Execute discovery
    const result = await userDiscoveryService.discoverAndSaveUsers(
      Protocol.AAVE_V3,
      network as Network,
      fromDate,
      toDate
    );

    console.log(`✅ Discovery completed successfully!`);
    console.log(`📊 Results:`);
    console.log(`   • Users discovered: ${result.discovered}`);
    console.log(`   • Users saved: ${result.saved}`);
    console.log(`   • Users updated: ${result.updated}`);

    // Close application
    await app.close();

    // Exit with success
    process.exit(0);

  } catch (error) {
    console.error(`❌ Discovery failed:`, error instanceof Error ? error.message : 'Unknown error');

    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }

    process.exit(1);
  }
}

// Run the script
bootstrap();
