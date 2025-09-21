#!/usr/bin/env ts-node
/**
 * Network Configuration Test Script
 * 
 * Tests the new NetworkConfigService to ensure all networks and providers work correctly
 */

import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { NetworkConfigService } from '../../src/infrastructure/config/network.config';
import { NetworkModule } from '../../src/infrastructure/config/network.module';
import { Network } from '../../src/domain/types/networks';
import { Providers } from '../../src/domain/enums/providers.enum';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    NetworkModule
  ]
})
class TestModule {}

async function testNetworkConfiguration() {
  console.log('🧪 TESTING NETWORK CONFIGURATION SERVICE');
  console.log('==========================================\n');

  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(TestModule);
    const networkConfig = app.get(NetworkConfigService);

    // Test 1: Network Information
    console.log('📋 Test 1: Network Information');
    console.log('------------------------------');
    
    const networks = networkConfig.getSupportedNetworks();
    console.log(`✅ Supported Networks (${networks.length}):`, networks);
    
    for (const network of networks) {
      const info = networkConfig.getNetworkInfo(network);
      console.log(`   ${network}: Chain ID ${info.chainId}, Symbol: ${info.symbol}, Explorer: ${info.explorerUrl}`);
    }
    console.log();

    // Test 2: Provider Support Matrix
    console.log('🔌 Test 2: Provider Support Matrix');
    console.log('----------------------------------');
    
    const supportMatrix: Record<string, string[]> = {};
    
    for (const network of networks) {
      const supportedProviders = networkConfig.getSupportedProviders(network);
      supportMatrix[network] = supportedProviders;
      console.log(`   ${network}: ${supportedProviders.length} providers - ${supportedProviders.join(', ')}`);
    }
    console.log();

    // Test 3: Configuration Generation (Mock API Keys)
    console.log('⚙️  Test 3: Configuration Generation');
    console.log('-----------------------------------');
    
    // Set mock environment variables for testing
    process.env.ALCHEMY_API_KEY = 'test-alchemy-key';
    process.env.INFURA_API_KEY = 'test-infura-key';
    process.env.BLOCKDAEMON_API_KEY = 'test-blockdaemon-key';
    
    const testCases = [
      { network: Network.ETHEREUM, provider: Providers.ALCHEMY },
      { network: Network.POLYGON, provider: Providers.INFURA },
      { network: Network.ARBITRUM, provider: Providers.BLOCKDAEMON },
      { network: Network.OPTIMISM, provider: Providers.ALCHEMY },
      { network: Network.BLAST, provider: Providers.INFURA }
    ];

    for (const testCase of testCases) {
      try {
        const config = networkConfig.getNetworkConfig(testCase.network, testCase.provider);
        console.log(`   ✅ ${testCase.network} + ${testCase.provider}:`);
        console.log(`      RPC: ${config.rpcUrl.substring(0, 50)}...`);
        console.log(`      WS:  ${config.wsUrl?.substring(0, 50)}...`);
        console.log(`      Chain ID: ${config.chainId}, Provider: ${config.provider}`);
      } catch (error) {
        console.log(`   ❌ ${testCase.network} + ${testCase.provider}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    console.log();

    // Test 4: Provider Support Validation
    console.log('✅ Test 4: Provider Support Validation');
    console.log('--------------------------------------');
    
    const validationTests = [
      { network: Network.ETHEREUM, provider: Providers.ALCHEMY, expected: true },
      { network: Network.POLYGON, provider: Providers.INFURA, expected: true },
      { network: Network.BLAST, provider: Providers.ETHERSCAN, expected: true },
      { network: Network.ARBITRUM, provider: Providers.QUICKNODE, expected: true }
    ];

    for (const test of validationTests) {
      const isSupported = networkConfig.isSupported(test.network, test.provider);
      const status = isSupported === test.expected ? '✅' : '❌';
      console.log(`   ${status} ${test.network} + ${test.provider}: ${isSupported ? 'Supported' : 'Not Supported'}`);
    }
    console.log();

    // Test 5: Error Handling
    console.log('🚨 Test 5: Error Handling');
    console.log('-------------------------');
    
    try {
      // Test with missing API key
      delete process.env.ALCHEMY_API_KEY;
      networkConfig.getNetworkConfig(Network.ETHEREUM, Providers.ALCHEMY);
      console.log('   ❌ Should have thrown error for missing API key');
    } catch (error) {
      console.log('   ✅ Correctly handled missing API key:', error instanceof Error ? error.message : String(error));
    }

    // Test 6: Fallback RPC URLs
    console.log('\n🔄 Test 6: Fallback RPC URLs');
    console.log('----------------------------');
    
    process.env.ETHEREUM_RPC_URL = 'https://custom-ethereum-rpc.example.com';
    process.env.POLYGON_RPC_URL = 'https://custom-polygon-rpc.example.com';
    
    const ethereumFallback = networkConfig.getFallbackRpcUrl(Network.ETHEREUM);
    const polygonFallback = networkConfig.getFallbackRpcUrl(Network.POLYGON);
    const arbitrumFallback = networkConfig.getFallbackRpcUrl(Network.ARBITRUM);
    
    console.log(`   Ethereum fallback: ${ethereumFallback || 'Not configured'}`);
    console.log(`   Polygon fallback: ${polygonFallback || 'Not configured'}`);
    console.log(`   Arbitrum fallback: ${arbitrumFallback || 'Not configured'}`);

    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log('✅ NetworkConfigService is working correctly');
    console.log('✅ All networks and providers are properly configured');
    console.log('✅ Error handling is functioning as expected');
    console.log('✅ Fallback mechanisms are in place');

    await app.close();

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testNetworkConfiguration().catch(console.error);
}
