import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import { AaveService } from '../src/services/protocols/aave';
import { Protocol } from '../src/types/protocols';
import { Network } from '../src/types/networks';
import { log } from '../src/utils/logger';
import { ENV } from '../src/config/env';

// Configuration for testing
const TEST_CONFIG = {
  // Known active Aave users on Ethereum mainnet
  // These are sample addresses of known active Aave users
  ACTIVE_USERS: [
    '0x7B7B2Cf7c1C49A5BF4A33f34D11A26f48Bd0A35a', // Sample user 1
    '0x1E5e8A2Fc5C4A9B5A4Ea4A4B7b9A1Cd3F2Ae3Bc7', // Sample user 2
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'  // Sample user 3
  ],

  // Timestamp range for fetching positions (last 30 days)
  FROM_TIMESTAMP: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60),
  TO_TIMESTAMP: Math.floor(Date.now() / 1000)
};

async function validateEnvironment() {
  // Check Alchemy API configuration
  try {
    const alchemyKey = ENV.ALCHEMY_API_KEY;
    console.log(' Alchemy API Key Validated');
    return true;
  } catch (error) {
    console.error(' Alchemy API key configuration error:', error);
    throw error;
  }
}

async function findActiveAaveUser(aaveService: AaveService): Promise<string> {
  console.log(' Finding an active Aave user...');

  // Try predefined users first
  for (const userAddress of TEST_CONFIG.ACTIVE_USERS) {
    try {
      const positions = await aaveService.fetchUserPositions({
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress,
        fromTimestamp: TEST_CONFIG.FROM_TIMESTAMP,
        toTimestamp: TEST_CONFIG.TO_TIMESTAMP
      });

      if (positions && positions.length > 0) {
        console.log(` Found active user: ${userAddress}`);
        return userAddress;
      }
    } catch (error) {
      console.error(` Error fetching positions for user ${userAddress}:`, error);
      continue;
    }
  }

  throw new Error('No active Aave users found');
}

async function testAaveFetching() {
  try {
    // Validate environment before proceeding
    await validateEnvironment();

    // Create AaveService instance
    const aaveService = new AaveService();

    // Find an active Aave user
    const activeUserAddress = await findActiveAaveUser(aaveService);

    // Prepare fetch parameters
    const fetchParams = {
      protocol: Protocol.AAVE,
      network: Network.ETHEREUM,
      userAddress: activeUserAddress,
      fromTimestamp: TEST_CONFIG.FROM_TIMESTAMP,
      toTimestamp: TEST_CONFIG.TO_TIMESTAMP
    };

    console.log(' Starting Aave Data Fetching Test');
    console.log('-----------------------------------');

    // 1. Fetch On-Chain Positions
    console.log('\n Fetching On-Chain Positions...');
    try {
      const onChainPositions = await aaveService.fetchUserPositions(fetchParams);
      console.log('On-Chain Positions Count:', onChainPositions.length);
      onChainPositions.forEach((pos, index) => {
        console.log(`Position ${index + 1}:`, {
          userAddress: pos.userAddress,
          collateral: pos.collateral,
          debt: pos.debt,
          healthFactor: pos.healthFactor
        });
      });
    } catch (onChainError) {
      console.error('Error fetching on-chain positions:', onChainError);
    }

    // 2. Fetch User Positions
    console.log('\n Fetching User Positions...');
    try {
      const userPositions = await aaveService.fetchUserPositions(fetchParams);
      console.log('User Positions Count:', userPositions.length);
      userPositions.forEach((pos, index) => {
        console.log(`Position ${index + 1}:`, {
          userAddress: pos.userAddress,
          collateral: pos.collateral,
          debt: pos.debt,
          timestamp: new Date(pos.timestamp * 1000).toISOString()
        });
      });
    } catch (userPositionsError) {
      console.error('Error fetching user positions:', userPositionsError);
    }

    // 3. Get Stored Positions
    console.log('\n Fetching Stored Positions...');
    try {
      const storedPositions = await aaveService.getPositions(fetchParams);
      console.log('Stored Positions Count:', storedPositions.length);
      storedPositions.forEach((pos, index) => {
        console.log(`Position ${index + 1}:`, {
          userAddress: pos.userAddress,
          collateral: pos.collateral,
          debt: pos.debt,
          timestamp: new Date(pos.timestamp * 1000).toISOString()
        });
      });
    } catch (storedPositionsError) {
      console.error('Error fetching stored positions:', storedPositionsError);
    }

    // 4. Get Health Factor
    console.log('\n  Fetching Health Factor...');
    try {
      const healthFactor = await aaveService.getHealthFactor(fetchParams);
      console.log('Health Factor:', healthFactor);
    } catch (healthFactorError) {
      console.error('Error fetching health factor:', healthFactorError);
    }

    console.log('\n Aave Data Fetching Test Completed');

  } catch (error) {
    console.error(' Critical Error in Aave Data Fetching Test:', error);
    process.exit(1);
  }
}

// Run the test
testAaveFetching().catch(console.error);
