/**
 * Provider Adapters Test Script
 * 
 * This script tests the provider adapters and factory functionality.
 * It verifies provider creation, health checks, and fallback mechanisms.
 * 
 * NOTE: This script is currently disabled as it requires NestJS DI context.
 * The ProviderFactory has been converted from static to injectable service.
 * To test provider adapters, use the NestJS application context or integration tests.
 */

// Import dotenv type declaration
declare module 'dotenv' {
  export function config(): void;
}

import { config } from 'dotenv';
import { Providers } from '@adapters/secondary/providers/provider-factory';
import { Logger } from '@nestjs/common';

const logger = new Logger('TestProviderAdapters');

// Load environment variables
config();

/**
 * Test provider adapters and factory
 */
async function testProviderAdapters() {
  try {
    logger.log('Provider Adapters Test Script');
    logger.log('=============================');
    logger.warn('This script is currently disabled.');
    logger.warn('The ProviderFactory has been converted from static to NestJS injectable service.');
    logger.warn('To test provider adapters:');
    logger.warn('1. Use the NestJS application context');
    logger.warn('2. Create integration tests with proper DI setup');
    logger.warn('3. Use individual provider adapters directly with environment variables');
    
    // Test basic environment variable detection
    logger.log('\nTesting environment variable detection...');
    
    const hasAlchemyKey = !!process.env.ALCHEMY_API_KEY;
    const hasInfuraKey = !!process.env.INFURA_API_KEY;
    
    logger.log(`Environment variables detected:`);
    logger.log(`- ALCHEMY_API_KEY: ${hasAlchemyKey ? 'Present' : 'Missing'}`);
    logger.log(`- INFURA_API_KEY: ${hasInfuraKey ? 'Present' : 'Missing'}`);
    
    if (!hasAlchemyKey && !hasInfuraKey) {
      logger.warn('No provider API keys found in environment variables.');
      logger.warn('Please set ALCHEMY_API_KEY or INFURA_API_KEY to test providers.');
      return;
    }
    
    // Test provider types
    logger.log('\nAvailable provider types:');
    Object.values(Providers).forEach(type => {
      logger.log(`- ${type}`);
    });
    
    logger.log('\nTest completed successfully');
    logger.log('For full provider testing, use NestJS application context.');
    
  } catch (error: unknown) {
    logger.error('Error testing provider adapters:', error);
  }
}

// Run the test
testProviderAdapters().then(() => {
  logger.log('Test script execution completed');
}).catch((error: unknown) => {
  logger.error('Unhandled error in test script:', error);
});
