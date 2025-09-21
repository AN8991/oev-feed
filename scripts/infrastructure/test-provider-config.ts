/**
 * Provider Configuration Test Script
 * 
 * This script tests the provider configuration system that manages connections
 * to various Ethereum providers (Alchemy, Infura, etc.) across different networks.
 * It verifies configuration loading, provider initialization, and fallback mechanisms.
 * 
 * NOTE: This script is currently disabled as it requires NestJS DI context.
 * The ProviderConfigService has been converted from singleton to injectable service.
 * To test provider configuration, use the NestJS application context or integration tests.
 */

import { ProviderFactory, Providers } from '@adapters/secondary/providers/provider-factory';
import { Logger } from '@nestjs/common';

const logger = new Logger('TestProviderConfig');

/**
 * Test the provider configuration system
 */
async function testProviderConfig() {
  try {
    logger.log('Provider Configuration Test Script');
    logger.log('=====================================');
    logger.warn('This script is currently disabled.');
    logger.warn('The ProviderConfigService has been converted from singleton to NestJS injectable service.');
    logger.warn('To test provider configuration:');
    logger.warn('1. Use the NestJS application context');
    logger.warn('2. Create integration tests with proper DI setup');
    logger.warn('3. Use the provider factory directly with environment variables');
    
    // Test basic provider factory functionality without config service
    logger.log('\nTesting basic provider factory functionality...');
    
    // Test environment variable detection
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
    logger.log('For full provider configuration testing, use NestJS application context.');
    
  } catch (error) {
    logger.error('Test failed:', error);
  }
}

// Execute the test
testProviderConfig().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
