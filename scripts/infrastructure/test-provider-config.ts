/**
 * Provider Configuration Test Script
 * 
 * This script tests the provider configuration system that manages connections
 * to various Ethereum providers (Alchemy, Infura, etc.) across different networks.
 * It verifies configuration loading, provider initialization, and fallback mechanisms.
 */

import { ProviderFactory, ProviderType } from '@adapters/secondary/providers/provider-factory';
import { ProviderConfigService } from '@infrastructure/config/provider-config';
import { logger, LogCategory } from '@infrastructure/utils/logger';

/**
 * Test the provider configuration system
 */
async function testProviderConfig() {
  try {
    // Get the configuration service instance
    const configService = ProviderConfigService.getInstance();
    
    // Load configuration from environment variables
    configService.loadFromEnv();
    
    // Display global configuration
    const globalConfig = configService.getGlobalConfig();
    logger.info('Global configuration:', LogCategory.CONFIG, globalConfig);
    
    // Display available networks
    const networkNames = configService.getNetworkNames();
    logger.info('Available networks:', LogCategory.CONFIG, networkNames);
    
    // Test Ethereum mainnet providers
    const network = 'ethereum';
    logger.info(`Testing providers for ${network}...`, LogCategory.PROVIDER);
    
    // Get Alchemy provider
    logger.info('Getting Alchemy provider...', LogCategory.PROVIDER);
    const alchemyProvider = await ProviderFactory.getProvider(network, {
      type: ProviderType.ALCHEMY
    });
    
    // Display provider info
    logger.info(`Provider: ${alchemyProvider.name} (${alchemyProvider.type})`, LogCategory.PROVIDER);
    logger.info(`Network: ${alchemyProvider.network}`, LogCategory.NETWORK);
    logger.info(`Block number: ${await alchemyProvider.getBlockNumber()}`, LogCategory.PROVIDER);
    logger.info('Stats: ', LogCategory.PERFORMANCE, alchemyProvider.getStats());
    
    // Get Infura provider
    logger.info('Getting Infura provider...', LogCategory.PROVIDER);
    const infuraProvider = await ProviderFactory.getProvider(network, {
      type: ProviderType.INFURA
    });
    
    // Display provider info
    logger.info(`Provider: ${infuraProvider.name} (${infuraProvider.type})`, LogCategory.PROVIDER);
    logger.info(`Network: ${infuraProvider.network}`, LogCategory.NETWORK);
    logger.info(`Block number: ${await infuraProvider.getBlockNumber()}`, LogCategory.PROVIDER);
    logger.info('Stats: ', LogCategory.PERFORMANCE, infuraProvider.getStats());
    
    // Test best provider selection
    logger.info('Getting best provider...', LogCategory.PROVIDER);
    const bestProvider = await ProviderFactory.getBestProvider(network);
    logger.info(`Best provider: ${bestProvider.name} (${bestProvider.type})`, LogCategory.PROVIDER);
    
    // Test fallback mechanism
    logger.info('Testing fallback mechanism...', LogCategory.PROVIDER);
    // Create a provider with an invalid API key to force fallback
    const invalidConfig = {
      apiKey: 'invalid-key'
    };
    
    try {
      const fallbackProvider = await ProviderFactory.getProvider(network, {
        type: ProviderType.ALCHEMY,
        config: invalidConfig,
        fallback: true
      });
      
      logger.info(`Fallback provider: ${fallbackProvider.name} (${fallbackProvider.type})`, LogCategory.PROVIDER);
    } catch (error) {
      logger.error('Fallback test failed:', LogCategory.PROVIDER, undefined, error instanceof Error ? error : new Error(String(error)));
    }
    
    // Clean up
    await ProviderFactory.clearCache();
    logger.info('Test completed successfully', LogCategory.GENERAL);
  } catch (error) {
    logger.error('Test failed:', LogCategory.GENERAL, undefined, error instanceof Error ? error : new Error(String(error)));
  }
}

// Execute the test
testProviderConfig().catch(error => {
  logger.error('Unhandled error:', LogCategory.GENERAL, undefined, error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});
