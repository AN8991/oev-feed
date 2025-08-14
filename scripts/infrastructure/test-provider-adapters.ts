/**
 * Provider Adapters Test Script
 * 
 * This script tests the provider adapters implementation for different Ethereum providers.
 * It verifies adapter initialization, connection, and data retrieval capabilities.
 */

// Import dotenv type declaration
declare module 'dotenv' {
  export function config(): void;
}

import { config } from 'dotenv';
import { ProviderFactory } from '@adapters/secondary/providers/provider-factory';
import { ProviderType } from '@domain/enums/provider-type.enum';
import { logger } from '@infrastructure/utils/logger';

// Load environment variables
config();

// Test address to check balance
const TEST_ADDRESS = '0x57E04786E231Af3343562C062E0d058F25e7bA8C';

/**
 * Test provider adapters and factory
 */
async function testProviderAdapters() {
  try {
    logger.info('Testing Provider Adapters');
    
    // Test 1: Get Alchemy provider
    logger.info('\nTest 1: Get Alchemy provider for Ethereum mainnet');
    const alchemyProvider = await ProviderFactory.getProvider('ethereum', {
      type: ProviderType.ALCHEMY,
      fallback: false
    });
    
    logger.info(`Provider: ${alchemyProvider.name} (${alchemyProvider.type})`);
    logger.info(`Network: ${alchemyProvider.network}`);
    
    // Check block number
    const alchemyBlockNumber = await alchemyProvider.getBlockNumber();
    logger.info(`Current block number: ${alchemyBlockNumber}`);
    
    // Check balance
    const alchemyBalance = await alchemyProvider.getBalance(TEST_ADDRESS);
    logger.info(`Balance of ${TEST_ADDRESS}: ${alchemyBalance} wei`);
    
    // Get provider stats
    const alchemyStats = alchemyProvider.getStats();
    logger.info('Provider stats:', alchemyStats);
    
    // Test 2: Get Infura provider
    logger.info('\nTest 2: Get Infura provider for Ethereum mainnet');
    const infuraProvider = await ProviderFactory.getProvider('ethereum', {
      type: ProviderType.INFURA,
      fallback: false
    });
    
    logger.info(`Provider: ${infuraProvider.name} (${infuraProvider.type})`);
    logger.info(`Network: ${infuraProvider.network}`);
    
    // Check block number
    const infuraBlockNumber = await infuraProvider.getBlockNumber();
    logger.info(`Current block number: ${infuraBlockNumber}`);
    
    // Check balance
    const infuraBalance = await infuraProvider.getBalance(TEST_ADDRESS);
    logger.info(`Balance of ${TEST_ADDRESS}: ${infuraBalance} wei`);
    
    // Get provider stats
    const infuraStats = infuraProvider.getStats();
    logger.info('Provider stats:', infuraStats);
    
    // Test 3: Test provider fallback
    logger.info('\nTest 3: Test provider fallback');
    
    // Set provider priority
    ProviderFactory.setProviderPriority([ProviderType.ALCHEMY, ProviderType.INFURA]);
    
    // Get provider with fallback
    const fallbackProvider = await ProviderFactory.getProvider('ethereum');
    logger.info(`Provider with fallback: ${fallbackProvider.name} (${fallbackProvider.type})`);
    
    // Test 4: Get best provider
    logger.info('\nTest 4: Get best provider');
    const bestProvider = await ProviderFactory.getBestProvider('ethereum');
    logger.info(`Best provider: ${bestProvider.name} (${bestProvider.type})`);
    
    // Test 5: Get all providers
    logger.info('\nTest 5: Get all providers');
    const allProviders = await ProviderFactory.getAllProviders('ethereum');
    logger.info(`Found ${allProviders.size} providers`);
    
    for (const [type, provider] of allProviders.entries()) {
      logger.info(`- ${type}: ${provider.name}`);
    }
    
    // Clean up
    logger.info('\nCleaning up providers');
    ProviderFactory.clearCache();
    
    logger.info('Test completed successfully');
  } catch (error: unknown) {
    logger.error('Error testing provider adapters:', error);
  }
}

// Run the test
testProviderAdapters().then(() => {
  logger.info('Test script execution completed');
}).catch((error: unknown) => {
  logger.error('Unhandled error in test script:', error);
});
