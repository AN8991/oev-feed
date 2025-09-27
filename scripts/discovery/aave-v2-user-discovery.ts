#!/usr/bin/env ts-node

/**
 * AAVE V2 User Discovery Script
 *
 * Discovers active AAVE V2 users with health factor < 5 on Ethereum
 * Uses direct contract queries to find users with positions
 *
 * Usage:
 * npm run discovery:aave-v2 -- --network=ethereum --from-date=2025-05-01
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { UserDiscoveryService } from '../../src/application/services/user-discovery/user-discovery.service';
import { Protocol } from '../../src/domain/enums/protocols.enum';
import { Network } from '../../src/domain/enums/networks.enum';

async function bootstrap() {
  try {
    // Initialize NestJS application
    const app = await NestFactory.createApplicationContext(AppModule);

    // Get UserDiscoveryService from DI container
    const userDiscoveryService = app.get(UserDiscoveryService);

    // Parse command line arguments
    const args = process.argv.slice(2);
    const params: { network?: string; fromDate?: string } = {};

    args.forEach(arg => {
      if (arg.startsWith('--network=')) {
        params.network = arg.split('=')[1];
      } else if (arg.startsWith('--from-date=')) {
        params.fromDate = arg.split('=')[1];
      }
    });

    // Set defaults
    const network = (params.network as Network) || Network.ETHEREUM;
    const fromDate = params.fromDate ? new Date(params.fromDate) : new Date('2025-05-01');
    const toDate = new Date(); // Current date

    console.log(`🚀 Starting AAVE V2 user discovery...`);
    console.log(`📍 Network: ${network}`);
    console.log(`📅 From: ${fromDate.toISOString()}`);
    console.log(`📅 To: ${toDate.toISOString()}`);
    console.log(`⏳ Processing...`);

    // Execute discovery
    const result = await userDiscoveryService.discoverAndSaveUsers(
      Protocol.AAVE_V2,
      network,
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
