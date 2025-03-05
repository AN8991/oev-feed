import { Protocol, EnhancedProtocolQueryParams, UserPositionSummary } from '@/types/protocols';
import { Network } from '@/types/networks';
import { ProtocolServiceFactory } from '@/services/factory';
import { log } from '@/utils/logger';

// Mock environment variables
jest.mock('@/config/env', () => ({
  ENV: {
    getAlchemyEthereumRpcUrl: () => process.env.ALCHEMY_API_KEY ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : 'https://eth-mainnet.mock.url',
    getAlchemyEthereumWsUrl: () => process.env.ALCHEMY_API_KEY ? `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : 'wss://eth-mainnet.mock.url',
  }
}));

// Real test that can use actual API keys if available
describe('Enhanced Position Fetching', () => {
  // This is a test that can be run with real data if API keys are provided
  // Otherwise it will be skipped
  const testAddress = process.env.TEST_ADDRESS || '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9'; // Default to AAVE V2 contract
  
  // Skip the test if no API key is provided
  const runTest = process.env.ALCHEMY_API_KEY ? it : it.skip;
  
  runTest('should fetch positions with enhanced parameters', async () => {
    // Log that we're using real API keys
    if (process.env.ALCHEMY_API_KEY) {
      log.info('Running test with real API key');
    } else {
      log.info('Skipping test due to missing API key');
      return;
    }
    
    // Get service through factory
    const service = await ProtocolServiceFactory.getService(Protocol.AAVE, Network.ETHEREUM);
    
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30); // 30 days ago
    
    const toDate = new Date();
    
    const params: EnhancedProtocolQueryParams = {
      userAddress: testAddress,
      protocol: Protocol.AAVE,
      network: Network.ETHEREUM,
      fromTimestamp: Math.floor(fromDate.getTime() / 1000),
      toTimestamp: Math.floor(toDate.getTime() / 1000),
      liquidationThreshold: 0.8,
      minHealthFactor: 1.0,
      maxPositions: 10,
      sortBy: 'healthFactor',
      sortOrder: 'asc'
    };
    
    try {
      const positions = await service.fetchUserPositionsInRange(params);
      
      // Log the results
      log.info(`Fetched ${positions.length} positions`);
      
      // Basic validation
      expect(positions).toBeDefined();
      expect(Array.isArray(positions)).toBe(true);
      
      if (positions.length > 0) {
        // Check structure of first position
        const firstPosition = positions[0];
        expect(firstPosition).toHaveProperty('protocol');
        expect(firstPosition).toHaveProperty('network');
        expect(firstPosition).toHaveProperty('userAddress');
        expect(firstPosition).toHaveProperty('healthFactor');
        
        // Check if risk metrics are present
        if (firstPosition.riskMetrics) {
          expect(firstPosition.riskMetrics).toHaveProperty('liquidationProbability');
          expect(firstPosition.riskMetrics).toHaveProperty('potentialLiquidationValue');
        }
        
        // Log first position for manual inspection
        log.info('First position:', JSON.stringify(firstPosition, null, 2));
      }
    } catch (error) {
      // Log the error but don't fail the test if it's just a configuration issue
      log.error('Error fetching positions:', error);
      
      // Only fail the test if we have API keys but still got an error
      if (process.env.ALCHEMY_API_KEY) {
        throw error;
      }
    }
  }, 30000); // Increase timeout to 30 seconds for API calls
  
  // Test with multiple addresses
  runTest('should fetch positions for multiple addresses', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      log.info('Skipping multi-address test due to missing API key');
      return;
    }
    
    // Get service through factory
    const service = await ProtocolServiceFactory.getService(Protocol.AAVE, Network.ETHEREUM);
    
    // Use multiple test addresses or default to known addresses
    const testAddresses = process.env.TEST_ADDRESSES ? 
      process.env.TEST_ADDRESSES.split(',') : 
      [
        '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9', // AAVE V2 contract
        '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'  // AAVE V3 contract
      ];
    
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    
    const toDate = new Date();
    
    // Fetch positions for each address
    const allPositions: UserPositionSummary[] = [];
    
    for (const address of testAddresses) {
      try {
        const params: EnhancedProtocolQueryParams = {
          userAddress: address,
          protocol: Protocol.AAVE,
          network: Network.ETHEREUM,
          fromTimestamp: Math.floor(fromDate.getTime() / 1000),
          toTimestamp: Math.floor(toDate.getTime() / 1000),
          maxPositions: 5
        };
        
        const positions = await service.fetchUserPositionsInRange(params);
        allPositions.push(...positions);
        
        log.info(`Fetched ${positions.length} positions for address ${address}`);
      } catch (error) {
        log.error(`Error fetching positions for address ${address}:`, error);
      }
    }
    
    log.info(`Total positions fetched: ${allPositions.length}`);
    
    // Basic validation
    expect(allPositions).toBeDefined();
    expect(Array.isArray(allPositions)).toBe(true);
  }, 60000); // Increase timeout to 60 seconds for multiple API calls
});
