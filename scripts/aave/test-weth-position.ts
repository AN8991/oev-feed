import 'dotenv/config';
import 'reflect-metadata';
import { ProtocolAdapterFactory } from '@/adapters/secondary/protocols/protocol-adapter-factory';

const TEST_USER_ADDRESS = '0x79682489385337996edd00eb56b4238b597bfae7';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH on mainnet

/**
 * Targeted test to fetch WETH position data specifically
 */
async function testWETHPosition() {
  console.log('🎯 TARGETED WETH POSITION TEST');
  console.log('Expected from UI:');
  console.log('- Supplied ETH: 0.0100428 ETH (~$37.08)');
  console.log('- Borrowed ETH: 0.0020116 ETH (~$7.43)');
  console.log('\n' + '='.repeat(50));

  try {
    // Create adapter with Infura RPC (switched from Alchemy due to timeout issues)
    const infuraUrl = `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`;
    const config = {
      poolAddress: process.env.AAVE_V3_ETHEREUM_POOL!,
      dataProviderAddress: process.env.AAVE_V3_ETHEREUM_DATA_PROVIDER!,
      oracleAddress: process.env.AAVE_V3_ETHEREUM_ORACLE!,
      providerUrl: infuraUrl
    };

    console.log('1. Creating and initializing adapter...');
    // Note: ProtocolAdapterFactory is now injectable, create instance directly for testing
    const factory = new ProtocolAdapterFactory();
    const adapter = factory.createAdapter('aave-v3', 'ethereum', config);
    await adapter.initialize();
    console.log('   ✅ Adapter initialized');

    // Get health factor first
    console.log('2. Getting health factor...');
    const healthFactor = await adapter.getHealthFactor(TEST_USER_ADDRESS);
    console.log(`   ✅ Health factor: ${healthFactor}`);

    // Now let's directly call the adapter's internal methods to get WETH data
    console.log('3. Fetching WETH position data directly...');
    
    // Access the adapter's internal contracts (this is a bit hacky but for debugging)
    const adapterInternal = adapter as any;
    
    if (adapterInternal.dataProviderContract && adapterInternal.oracleContract) {
      console.log('   Getting WETH reserve data...');
      const reserveData = await adapterInternal.dataProviderContract.getUserReserveData(WETH_ADDRESS, TEST_USER_ADDRESS);
      
      console.log('   Getting WETH price...');
      const price = await adapterInternal.oracleContract.getAssetPrice(WETH_ADDRESS);
      
      console.log('\n📊 RAW WETH DATA:');
      console.log('   Current aToken Balance:', reserveData.currentATokenBalance.toString());
      console.log('   Current Stable Debt:', reserveData.currentStableDebt.toString());
      console.log('   Current Variable Debt:', reserveData.currentVariableDebt.toString());
      console.log('   Principal Stable Debt:', reserveData.principalStableDebt.toString());
      console.log('   Scaled Variable Debt:', reserveData.scaledVariableDebt.toString());
      console.log('   Stable Borrow Rate:', reserveData.stableBorrowRate.toString());
      console.log('   Liquidity Rate:', reserveData.liquidityRate.toString());
      console.log('   Stable Rate Last Updated:', reserveData.stableRateLastUpdated.toString());
      console.log('   Usage as Collateral Enabled:', reserveData.usageAsCollateralEnabled);
      console.log('   WETH Price (wei):', price.toString());
      
      // Convert to human readable values (WETH has 18 decimals)
      const decimals = 18;
      const collateralAmount = Number(reserveData.currentATokenBalance) / Math.pow(10, decimals);
      const debtAmount = (Number(reserveData.currentStableDebt) + Number(reserveData.currentVariableDebt)) / Math.pow(10, decimals);
      const priceUSD = Number(price) / Math.pow(10, 8); // Oracle price is in 8 decimals
      
      console.log('\n💰 CONVERTED VALUES:');
      console.log(`   Collateral (Supplied): ${collateralAmount.toFixed(8)} ETH`);
      console.log(`   Debt (Borrowed): ${debtAmount.toFixed(8)} ETH`);
      console.log(`   ETH Price: $${priceUSD.toFixed(2)}`);
      console.log(`   Collateral Value: $${(collateralAmount * priceUSD).toFixed(2)}`);
      console.log(`   Debt Value: $${(debtAmount * priceUSD).toFixed(2)}`);
      
      console.log('\n🔍 COMPARISON WITH UI:');
      const expectedSupplied = 0.0100428;
      const expectedBorrowed = 0.0020116;
      
      console.log(`   Expected Supplied: ${expectedSupplied} ETH | Actual: ${collateralAmount.toFixed(8)} ETH`);
      console.log(`   Expected Borrowed: ${expectedBorrowed} ETH | Actual: ${debtAmount.toFixed(8)} ETH`);
      
      const suppliedDiff = Math.abs(collateralAmount - expectedSupplied);
      const borrowedDiff = Math.abs(debtAmount - expectedBorrowed);
      
      console.log(`   Supplied Match: ${suppliedDiff < 0.0001 ? '✅' : '❌'} (diff: ${suppliedDiff.toFixed(8)})`);
      console.log(`   Borrowed Match: ${borrowedDiff < 0.0001 ? '✅' : '❌'} (diff: ${borrowedDiff.toFixed(8)})`);
      
      if (suppliedDiff >= 0.0001 || borrowedDiff >= 0.0001) {
        console.log('\n⚠️  DISCREPANCY DETECTED!');
        console.log('   This could indicate:');
        console.log('   - UI data is from a different block/timestamp');
        console.log('   - Different calculation method');
        console.log('   - Interest accrual between measurements');
        console.log('   - Different token representation (aToken vs underlying)');
      } else {
        console.log('\n✅ DATA MATCHES EXPECTED VALUES!');
      }
    }

    console.log('\n4. Cleaning up...');
    await adapter.cleanup();
    console.log('   ✅ Cleanup complete');
    
    console.log('\n🎉 TARGETED TEST COMPLETED');

  } catch (error) {
    console.error('\n❌ ERROR in test:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testWETHPosition().catch(console.error);
