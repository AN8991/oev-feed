import { ConfigService, config, ENV } from '@infrastructure/config/config';

/**
 * Test script to verify the unified configuration system
 */
async function testConfig() {
  console.log('=== Testing Unified Configuration System ===\n');
  
  // Test config object (backward compatibility)
  console.log('1. Testing config object (backward compatibility):');
  console.log('Database config:', config.database);
  console.log('Alchemy API key:', config.providers.alchemy.apiKey ? '✓ Present' : '✗ Missing');
  console.log('Infura API key:', config.providers.infura.apiKey ? '✓ Present' : '✗ Missing');
  console.log();
  
  // Test ConfigService instance (skip for now - requires NestJS context)
  console.log('2. Testing ConfigService: (Skipped - requires NestJS DI context)');
  console.log();
  
  // Test ENV compatibility (for code using old env.ts)
  console.log('3. Testing ENV compatibility:');
  console.log('Alchemy API key:', ENV.ALCHEMY_API_KEY ? '✓ Present' : '✗ Missing');
  console.log('Infura API key:', ENV.INFURA_API_KEY ? '✓ Present' : '✗ Missing');
  console.log('Etherscan API key:', ENV.ETHERSCAN_API_KEY ? '✓ Present' : '✗ Missing');
  console.log('Graph Studio API key:', ENV.GRAPH_STUDIO_API_KEY ? '✓ Present' : '✗ Missing');
  console.log();
  
  // Test API key validation
  console.log('4. Testing API key validation:');
  const validationResults = ENV.validateAllApiKeys();
  for (const [provider, isValid] of Object.entries(validationResults)) {
    console.log(`${provider} API key:`, isValid ? '✓ Valid' : '✗ Invalid');
  }
  console.log();
  
  console.log('=== Configuration Test Complete ===');
}

// Run the test
testConfig().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

// To run this script with path aliases, use:
// npx ts-node -r tsconfig-paths/register scripts/test-config.ts
