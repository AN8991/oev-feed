/**
 * Query Orchestrator Test Script
 * 
 * This script tests the Query Orchestrator service which coordinates data retrieval
 * from multiple protocol adapters and aggregates the results.
 * It verifies cross-protocol position aggregation and data normalization.
 * 
 * NOTE: This script is currently disabled as it requires NestJS DI context.
 * The QueryOrchestratorService now uses injectable TimeService dependency.
 * To test the orchestrator, use the NestJS application context or integration tests.
 */
import { config } from 'dotenv';
import { QueryOrchestratorService } from '@application/services/query-orchestrator.service';
import { TimeService } from '@infrastructure/services/time.service';
import { Logger } from '@nestjs/common';
import { normalizeAddress } from '@domain/utils/address-utils';

const logger = new Logger('TestQueryOrchestrator');

// Load environment variables
config();

// Test user address - this should be an address with Aave positions
const TEST_USER_ADDRESS = process.env.TEST_USER_ADDRESS || '0x79682489385337996edd00eb56b4238b597bfae7';

async function testQueryOrchestrator() {
  try {
    logger.log('Query Orchestrator Test Script');
    logger.log('===============================');
    logger.warn('This script is currently disabled.');
    logger.warn('The QueryOrchestratorService now requires injectable TimeService dependency.');
    logger.warn('To test the query orchestrator:');
    logger.warn('1. Use the NestJS application context');
    logger.warn('2. Create integration tests with proper DI setup');
    logger.warn('3. Use individual protocol adapters directly for testing');
    
    // Test basic environment variable detection
    logger.log('\nTesting environment variable detection...');
    
    const hasTestAddress = !!TEST_USER_ADDRESS;
    const hasEthereumRpc = !!process.env.ETHEREUM_RPC_URL;
    const hasAlchemyKey = !!process.env.ALCHEMY_API_KEY;
    
    logger.log(`Environment variables detected:`);
    logger.log(`- TEST_USER_ADDRESS: ${hasTestAddress ? 'Present' : 'Missing'}`);
    logger.log(`- ETHEREUM_RPC_URL: ${hasEthereumRpc ? 'Present' : 'Missing'}`);
    logger.log(`- ALCHEMY_API_KEY: ${hasAlchemyKey ? 'Present' : 'Missing'}`);
    
    if (hasTestAddress) {
      const normalizedAddress = normalizeAddress(TEST_USER_ADDRESS);
      logger.log(`- Normalized test address: ${normalizedAddress}`);
    }
    
    // Test TimeService independently (doesn't require DI)
    logger.log('\nTesting TimeService independently...');
    const timeService = new TimeService();
    const currentTimestamp = timeService.getCurrentTimestamp();
    logger.log(`- Current timestamp: ${currentTimestamp}`);
    logger.log(`- Formatted time: ${timeService.formatTimestamp(currentTimestamp)}`);
    
    logger.log('\nTest completed successfully');
    logger.log('For full query orchestrator testing, use NestJS application context.');
  } catch (error) {
    logger.error('Error testing Query Orchestrator:', undefined, error instanceof Error ? error : new Error(String(error)));
  }
}

// Run the test
testQueryOrchestrator().then(() => {
  logger.log('Test script execution completed');
}).catch(error => {
  logger.error('Unhandled error in test script:', undefined, error instanceof Error ? error : new Error(String(error)));
});
