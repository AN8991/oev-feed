/**
 * Aave V2 Adapter Test Script
 *
 * This script tests the Aave V2 protocol adapter implementation for Ethereum network.
 * It verifies adapter initialization, position fetching, and data formatting.
 */
import { config } from 'dotenv';
import { ProtocolAdapterFactory } from '@adapters/secondary/protocols/protocol-adapter-factory';
import { logger } from '@infrastructure/utils/logger';
import { PositionModel } from '@domain/models/position.model';
import { TypeORMAdapter } from '@adapters/secondary/database/typeorm/typeorm-adapter';
import { DatabasePort } from '@domain/ports/secondary/database.port';

// Load environment variables
config();

// Aave V2 Ethereum contract addresses (mainnet)
const AAVE_V2_ETHEREUM_POOL = process.env.AAVE_V2_ETHEREUM_POOL || '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9';
const AAVE_V2_ETHEREUM_DATA_PROVIDER = process.env.AAVE_V2_ETHEREUM_DATA_PROVIDER || '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d';
const AAVE_V2_ETHEREUM_ORACLE = process.env.AAVE_V2_ETHEREUM_ORACLE || '0xA50ba011C48153de246E5192C8f9258A2ba79Ca9';
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key';

// Test user address - should be an address with Aave V2 positions
const TEST_USER_ADDRESS = process.env.TEST_USER_ADDRESS || '0xf0bb20865277abd641a307ece5ee04e79073416c';

async function testAaveV2Adapter() {
  try {
    logger.info('Testing Aave V2 Ethereum Adapter');

    // Create adapter configuration
    const config = {
      poolAddress: AAVE_V2_ETHEREUM_POOL,
      dataProviderAddress: AAVE_V2_ETHEREUM_DATA_PROVIDER,
      oracleAddress: AAVE_V2_ETHEREUM_ORACLE,
      providerUrl: ETHEREUM_RPC_URL
    };

    // Create adapter using factory
    const adapter = ProtocolAdapterFactory.createAdapter('aave-v2', 'ethereum', config);

    // Initialize adapter
    logger.info('Initializing adapter...');
    await adapter.initialize();

    // Get health factor
    logger.info(`Getting health factor for user ${TEST_USER_ADDRESS}...`);
    const healthFactor = await adapter.getHealthFactor(TEST_USER_ADDRESS);
    logger.info(`Health factor: ${healthFactor}`);

    // Get user positions
    logger.info(`Getting positions for user ${TEST_USER_ADDRESS}...`);
    let positions: PositionModel[] = [];
    try {
      positions = await adapter.fetchUserPositions(TEST_USER_ADDRESS);
      logger.info(`Found ${positions.length} positions`);
      console.log('Positions:', positions);
      // Log position details
      positions.forEach((position: PositionModel, index: number) => {
        logger.info(`Position ${index + 1}:`, {
          assetSymbol: position.assetSymbol,
          collateralAmount: position.collateralAmount,
          debtAmount: position.debtAmount,
          healthFactor: position.healthFactor
        });
      });
      // Save positions to DB
      const db: DatabasePort = new TypeORMAdapter();
      await db.savePositions(positions);
      logger.info(`Saved ${positions.length} positions to the database.`);
    } catch (fetchError) {
      logger.error('Error fetching or logging user positions:', fetchError);
      console.error('Error fetching or logging user positions:', fetchError);
    }

    // Clean up
    logger.info('Cleaning up adapter...');
    await adapter.cleanup();

    logger.info('Test completed successfully');
  } catch (error) {
    logger.error('Error testing Aave V2 adapter:', error);
  }
}

// Run the test
testAaveV2Adapter().then(() => {
  logger.info('Test script execution completed');
}).catch(error => {
  logger.error('Unhandled error in test script:', error);
});

// Catch-all error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
