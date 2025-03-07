import { ethers } from 'ethers';
import { AaveV2Ethereum, AaveV3Ethereum } from '@bgd-labs/aave-address-book';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ABI snippet for the LendingPoolAddressesProvider
const LENDING_POOL_ADDRESSES_PROVIDER_ABI = [
  "function getLendingPool() view returns (address)",
  "function getProtocolDataProvider() view returns (address)"
];

// Simple network enum to avoid importing from project
enum SimpleNetwork {
  ETHEREUM = 'ethereum'
}

// Simple version enum to avoid importing from project
enum SimpleVersion {
  V2 = 2,
  V3 = 3
}

// Interface for addresses
interface AaveAddresses {
  poolAddress: string;
  dataProviderAddress: string;
  oracleAddress: string;
}

async function main() {
  console.log('Testing Aave Address Book Integration');
  console.log('====================================');

  // Test static address resolution
  console.log('\n1. Testing static address resolution:');
  
  // Get V3 addresses (static)
  const v3Addresses = {
    poolAddress: AaveV3Ethereum.POOL,
    dataProviderAddress: AaveV3Ethereum.POOL_ADDRESSES_PROVIDER,
    oracleAddress: AaveV3Ethereum.ORACLE
  };
  console.log('V3 Addresses (static):', v3Addresses);
  
  // Get V2 static addresses (poolAddress will be empty)
  const v2StaticAddresses = {
    poolAddress: '', // This will be resolved dynamically
    dataProviderAddress: AaveV2Ethereum.AAVE_PROTOCOL_DATA_PROVIDER,
    oracleAddress: AaveV2Ethereum.ORACLE
  };
  console.log('V2 Addresses (static):', v2StaticAddresses);
  
  // Test dynamic address resolution
  console.log('\n2. Testing dynamic address resolution:');
  
  // Check if RPC URL is available
  const rpcUrl = process.env.ETHEREUM_RPC_URL;
  if (!rpcUrl) {
    console.error('Error: ETHEREUM_RPC_URL environment variable is not set');
    process.exit(1);
  }
  
  // Create provider
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  try {
    // Resolve V2 addresses dynamically
    console.log('Resolving V2 addresses dynamically...');
    
    // Create a contract instance for the provider
    const providerContract = new ethers.Contract(
      AaveV2Ethereum.POOL_ADDRESSES_PROVIDER,
      LENDING_POOL_ADDRESSES_PROVIDER_ABI,
      provider
    );
    
    // Get the lending pool address
    const lendingPoolAddress = await providerContract.getLendingPool();
    
    const v2DynamicAddresses = {
      ...v2StaticAddresses,
      poolAddress: lendingPoolAddress
    };
    
    console.log('V2 Addresses (dynamic):', v2DynamicAddresses);
    
    // Verify addresses
    console.log('\n3. Verifying addresses:');
    console.log('V3 addresses valid:', verifyAddresses(v3Addresses));
    console.log('V2 dynamic addresses valid:', verifyAddresses(v2DynamicAddresses));
    
    console.log('\nTest completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Install the new dependencies: npm install @aave/core-v3 @bgd-labs/aave-address-book');
    console.log('2. Set up your environment variables in .env file:');
    console.log('   - ETHEREUM_RPC_URL: Your Ethereum RPC URL');
    console.log('   - ETHEREUM_WS_URL: Your Ethereum WebSocket URL');
    console.log('   - AAVE_SUBGRAPH_URL: Aave subgraph URL');
    console.log('   - ALCHEMY_API_KEY: Your Alchemy API key');
    console.log('3. Run your application with the updated Aave integration');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

/**
 * Verify address checksums
 * @param addresses The addresses to verify
 * @returns True if all addresses are valid, false otherwise
 */
function verifyAddresses(addresses: AaveAddresses): boolean {
  try {
    // Verify each address using ethers.js
    Object.entries(addresses).forEach(([key, address]) => {
      // Skip empty addresses (they'll be resolved dynamically)
      if (address) {
        ethers.getAddress(address); // Will throw if invalid
      }
    });
    return true;
  } catch (error) {
    console.error('Address verification failed:', error);
    return false;
  }
}

// Run the test
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
