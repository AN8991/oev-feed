/**
 * Query Orchestrator Test Script
 * 
 * This script tests the Query Orchestrator service which coordinates data retrieval
 * from multiple protocol adapters and aggregates the results.
 * It verifies cross-protocol position aggregation and data normalization.
 */
import { config } from 'dotenv';
import { QueryOrchestratorService } from '@application/services/query-orchestrator.service';
import { logger, LogCategory } from '@infrastructure/utils/logger';
import { normalizeAddress } from '@domain/utils/address-utils';

// Load environment variables
config();

// Test user address - this should be an address with Aave positions
const TEST_USER_ADDRESS = process.env.TEST_USER_ADDRESS || '0x57E04786E231Af3343562C062E0d058F25e7bA8C';

async function testQueryOrchestrator() {
  try {
    logger.info('Testing Query Orchestrator', LogCategory.GENERAL);
    
    // Create orchestrator
    const orchestrator = new QueryOrchestratorService();
    
    // Normalize user address
    const normalizedAddress = normalizeAddress(TEST_USER_ADDRESS);
    
    // Test 1: Query user positions across all protocols
    logger.info(`Test 1: Querying positions for ${normalizedAddress} across all protocols`, LogCategory.GENERAL);
    const result = await orchestrator.queryUserPositions({
      userAddresses: [normalizedAddress]
    });
    
    // Log results
    logger.info(`Found ${result.positions.length} positions across all protocols`, LogCategory.GENERAL);
    logger.info('Query metadata:', LogCategory.GENERAL, result.metadata);
    
    // Log position details
    result.positions.forEach((position: any, index: number) => {
      logger.info(`Position ${index + 1}:`, LogCategory.GENERAL, {
        protocol: position.protocol,
        network: position.network,
        assetSymbol: position.assetSymbol,
        collateralAmount: position.collateralAmount,
        debtAmount: position.debtAmount,
        healthFactor: position.healthFactor
      });
    });
    
    // Test 2: Query health factors across all protocols
    logger.info(`\nTest 2: Querying health factors for ${normalizedAddress} across all protocols`, LogCategory.GENERAL);
    const healthFactors = await orchestrator.getHealthFactors(normalizedAddress);
    
    // Log health factors
    logger.info('Health factors:', LogCategory.GENERAL);
    Object.entries(healthFactors).forEach(([key, healthFactor]: [string, any]) => {
      logger.info(`${key}: ${healthFactor}`, LogCategory.GENERAL);
    });
    
    // Test 3: Query specific protocol and network
    logger.info(`\nTest 3: Querying positions for ${normalizedAddress} on Aave V3 Ethereum only`, LogCategory.GENERAL);
    const specificResult = await orchestrator.queryUserPositions({
      userAddresses: [normalizedAddress],
      protocols: ['aave-v3'],
      networks: ['ethereum']
    });
    
    // Log results
    logger.info(`Found ${specificResult.positions.length} positions on Aave V3 Ethereum`, LogCategory.GENERAL);
    logger.info('Query metadata:', LogCategory.GENERAL, specificResult.metadata);
    
    logger.info('Test completed successfully', LogCategory.GENERAL);
  } catch (error) {
    logger.error('Error testing Query Orchestrator:', LogCategory.GENERAL, undefined, error instanceof Error ? error : new Error(String(error)));
  }
}

// Run the test
testQueryOrchestrator().then(() => {
  logger.info('Test script execution completed', LogCategory.GENERAL);
}).catch(error => {
  logger.error('Unhandled error in test script:', LogCategory.GENERAL, undefined, error instanceof Error ? error : new Error(String(error)));
});
