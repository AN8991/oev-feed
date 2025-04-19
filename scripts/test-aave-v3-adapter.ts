// Global process-level error handlers at the very top
process.on('uncaughtException', (err) => {
  const e = err as any;
  console.error('GLOBAL Uncaught Exception:', e && e.stack ? e.stack : e);
});
process.on('unhandledRejection', (reason, promise) => {
  const e = reason as any;
  console.error('GLOBAL Unhandled Rejection at:', promise, 'reason:', e && e.stack ? e.stack : e);
});

/**
 * Aave V3 Adapter Test Script
 * 
 * This script tests the Aave V3 protocol adapter implementation for Ethereum network.
 * It verifies adapter initialization, position fetching, and data formatting.
 */
import { config } from 'dotenv';
config();
import { ProtocolAdapterFactory } from '@adapters/secondary/protocols/protocol-adapter-factory';
import { logger } from '@infrastructure/utils/logger';
import { PositionModel } from '@domain/models/position.model';
import { TypeORMAdapter } from '@adapters/secondary/database/typeorm/typeorm-adapter';
import { DatabasePort } from '@domain/ports/secondary/database.port';
import { AppDataSource } from '@infrastructure/config/typeorm.config';
import { UserEntity } from '@adapters/secondary/database/typeorm/entities/user.entity';

// Load environment variables

// Aave V3 Ethereum contract addresses
const AAVE_V3_ETHEREUM_POOL = process.env.AAVE_V3_ETHEREUM_POOL || '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';
const AAVE_V3_ETHEREUM_DATA_PROVIDER = process.env.AAVE_V3_ETHEREUM_DATA_PROVIDER || '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3';
const AAVE_V3_ETHEREUM_ORACLE = process.env.AAVE_V3_ETHEREUM_ORACLE || '0x54586bE62E3c3580375aE3723C145253060Ca0C2';
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key';

// Test user address - this should be an address with Aave V3 positions
const TEST_USER_ADDRESS = process.env.TEST_USER_ADDRESS || '0x54dC6782d6fC5FC05f8486d365186FF25CC44BA7';

type PersistablePosition = PositionModel & { user?: UserEntity };

async function runAaveV3AdapterTest(): Promise<PositionModel[]> {
  console.log('runAaveV3AdapterTest: START');
  try {
    try {
      logger.info('Testing Aave V3 Ethereum Adapter');
      console.log('Running adapter logic...');
      
      // Create adapter configuration
      const config = {
        poolAddress: AAVE_V3_ETHEREUM_POOL,
        dataProviderAddress: AAVE_V3_ETHEREUM_DATA_PROVIDER,
        oracleAddress: AAVE_V3_ETHEREUM_ORACLE,
        providerUrl: ETHEREUM_RPC_URL
      };
      
      // Create adapter using factory
      const adapter = ProtocolAdapterFactory.createAdapter('aave-v3', 'ethereum', config);
      
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
        console.log('Fetched positions array:', positions);
        if (!positions || positions.length === 0) {
          console.warn('WARNING: No positions returned from adapter for user.');
        }
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
      } catch (fetchError) {
        const e = fetchError as any;
        logger.error('Error fetching or logging user positions:', e && e.stack ? e.stack : e);
        console.error('Error fetching or logging user positions:', e && e.stack ? e.stack : e);
      }
      
      // Clean up
      logger.info('Cleaning up adapter...');
      await adapter.cleanup();
      
      logger.info('Test completed successfully');
      console.log('Adapter logic complete. Returning positions.');
      console.log('runAaveV3AdapterTest: END, returning:', positions);
      return positions;
    } catch (error) {
      const e = error as any;
      console.error('FATAL ERROR in runAaveV3AdapterTest:', e && e.stack ? e.stack : e);
      return [];
    }
  } catch (error) {
    const e = error as any;
    console.error('FATAL ERROR in runAaveV3AdapterTest:', e && e.stack ? e.stack : e);
    return [];
  }
}

console.log('STARTING DIAGNOSTIC SCRIPT');

async function testAaveV3AdapterWithDiagnostics() {
  console.log('Initializing AppDataSource...');
  try {
    await AppDataSource.initialize();
    console.log('AppDataSource initialized.');
  } catch (err) {
    const e = err as any;
    console.error('Error initializing AppDataSource:', e && e.stack ? e.stack : e);
    return;
  }
  let userRepo;
  try {
    userRepo = AppDataSource.getRepository(UserEntity);
    console.log('Got user repository.');
  } catch (err) {
    const e = err as any;
    console.error('Error getting user repository:', e && e.stack ? e.stack : e);
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
    return;
  }

  // Fetch or create the test user
  const userAddress = '0xcfC5Ad80a2D19652C253FE098e787dA8913B96c5';
  let user;
  try {
    user = await userRepo.findOne({ where: { address: userAddress } });
    console.log('User lookup complete:', user);
    if (!user) {
      user = userRepo.create({ address: userAddress });
      await userRepo.save(user);
      console.log('Created test user:', user);
    } else {
      console.log('Test user already exists:', user);
    }
  } catch (err) {
    const e = err as any;
    console.error('Error during user lookup/save:', e && e.stack ? e.stack : e);
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
    return;
  }

  console.log('User block complete, proceeding to fetch positions...');

  // Run the original adapter test
  console.log('Function reference (should not be undefined):', runAaveV3AdapterTest);
  console.log('About to call runAaveV3AdapterTest...');
  let positions: PersistablePosition[] = [];
  try {
    console.log('ADAPTER TEST: About to create adapter config...');
    const config = {
      poolAddress: AAVE_V3_ETHEREUM_POOL,
      dataProviderAddress: AAVE_V3_ETHEREUM_DATA_PROVIDER,
      oracleAddress: AAVE_V3_ETHEREUM_ORACLE,
      providerUrl: ETHEREUM_RPC_URL
    };
    console.log('ADAPTER TEST: Config created:', config);

    console.log('ADAPTER TEST: About to create adapter instance...');
    const adapter = ProtocolAdapterFactory.createAdapter('aave-v3', 'ethereum', config);
    console.log('ADAPTER TEST: Adapter instance created:', adapter);

    console.log('ADAPTER TEST: About to initialize adapter...');
    await adapter.initialize();
    console.log('ADAPTER TEST: Adapter initialized.');

    // Next: test getHealthFactor
    console.log('ADAPTER TEST: About to get health factor...');
    const healthFactor = await adapter.getHealthFactor(TEST_USER_ADDRESS);
    console.log('ADAPTER TEST: Health factor:', healthFactor);

    // Leave fetchUserPositions commented for now
    console.log('ADAPTER TEST: About to fetch user positions...');
    let fetchErrorCaught = false;
    try {
      positions = await adapter.fetchUserPositions(TEST_USER_ADDRESS);
      console.log('ADAPTER TEST: Positions fetched:', positions);
    } catch (fetchErr) {
      fetchErrorCaught = true;
      const e = fetchErr as any;
      console.error('ADAPTER TEST: ERROR in fetchUserPositions:', e && e.stack ? e.stack : e);
    }
    if (!fetchErrorCaught) {
      console.log('ADAPTER TEST: fetchUserPositions completed without throwing.');
    }

  } catch (err) {
    const e = err as any;
    console.error('ADAPTER TEST: Error in incremental adapter block:', e && e.stack ? e.stack : e);
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
    return;
  }

  if (positions && positions.length > 0) {
    const persistablePositions: PersistablePosition[] = positions.map(pos => ({ ...pos, user }));
    // Log positions to be saved
    console.log('Positions to save:', JSON.stringify(persistablePositions, null, 2));
    // Save positions
    const db: DatabasePort = new TypeORMAdapter();
    try {
      console.log('Saving positions...');
      await db.savePositions(persistablePositions);
      console.log('Saved positions, check DB.');
    } catch (saveErr) {
      const e = saveErr as any;
      console.error('Error saving positions:', e && e.stack ? e.stack : e);
    }
  } else {
    console.log('No positions fetched. Nothing to save.');
  }

  console.log('Destroying AppDataSource...');
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  console.log('FINISHED DIAGNOSTIC SCRIPT');
  console.log('End of testAaveV3AdapterWithDiagnostics function.');
}

(async () => {
  try {
    await testAaveV3AdapterWithDiagnostics();
  } catch (err) {
    const e = err as any;
    console.error('Top-level error:', e && e.stack ? e.stack : e);
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
})();

process.on('unhandledRejection', (reason, promise) => {
  const e = reason as any;
  console.error('Unhandled Rejection at:', promise, 'reason:', e && e.stack ? e.stack : e);
});

process.on('uncaughtException', (err) => {
  const e = err as any;
  console.error('Uncaught Exception:', e && e.stack ? e.stack : e);
});

// Minimal test for fetching user positions
(async () => {
  try {
    const adapter = ProtocolAdapterFactory.createAdapter(
      'aave-v3',
      'ethereum',
      {
        poolAddress: AAVE_V3_ETHEREUM_POOL,
        dataProviderAddress: AAVE_V3_ETHEREUM_DATA_PROVIDER,
        oracleAddress: AAVE_V3_ETHEREUM_ORACLE,
        providerUrl: ETHEREUM_RPC_URL,
      }
    );
    await adapter.initialize();
    logger.info('Adapter initialized. Fetching user positions...');
    const positions = await adapter.fetchUserPositions(TEST_USER_ADDRESS);
    if (!positions || positions.length === 0) {
      logger.warn('No positions found for user:', TEST_USER_ADDRESS);
    } else {
      logger.info('User positions:', positions);
      console.dir(positions, { depth: null });
    }
  } catch (err) {
    logger.error('Error in test-aave-v3-adapter:', err instanceof Error ? err : new Error(String(err)));
    console.error('Error in test-aave-v3-adapter:', err);
  }
})();
